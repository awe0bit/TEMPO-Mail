import type { MailAccount } from '@/types';
import type { AdminSchema } from '@/admin/schema';
import { resolveAdminList, resolveAdminObject } from '@/admin/schema';
import { authenticatedRequest } from '@/api/jmap';

async function fetchJson(account: MailAccount, password: string, path: string, init: RequestInit = {}) {
  const origin = new URL(account.sessionUrl).origin;
  const response = await authenticatedRequest(account, password, `${origin}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers }
  });
  return response.json();
}

export async function fetchAdminSchema(account: MailAccount, password: string): Promise<AdminSchema> {
  return fetchJson(account, password, '/api/schema');
}

async function adminCall(account: MailAccount, password: string, methodCalls: unknown[]) {
  const response = await authenticatedRequest(account, password, account.apiUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json', 'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Stalwart management objects are exposed by its own JMAP capability.
      // Advertising optional capabilities that this server does not enable
      // makes the entire request fail with HTTP 400 unknownCapability.
      using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'],
      methodCalls
    })
  });
  const json = await response.json();
  const error = json.methodResponses?.find((entry: unknown[]) => entry[0] === 'error');
  if (error) {
    const description = error[1]?.description || error[1]?.type || '管理操作失败';
    if (description === 'No log tracers configured on the server') {
      throw new Error('服务器尚未配置日志追踪器，请先在“设置 → 遥测 → 追踪器”中启用。');
    }
    throw new Error(description);
  }
  return json;
}

async function queryOverviewTotals(account: MailAccount, password: string) {
  const accountId = account.managementAccountId ?? account.accountId;
  const requests = [
    ['x:Account/query', { accountId, filter: { '@type': 'User' }, limit: 1, calculateTotal: true }, 'accounts'],
    ['x:Domain/query', { accountId, filter: {}, limit: 1, calculateTotal: true }, 'domains'],
    ['x:QueuedMessage/query', { accountId, filter: {}, limit: 1, calculateTotal: true }, 'queued']
  ];
  const json = await adminCall(account, password, requests);
  const total = (id: string) => {
    const result = json.methodResponses?.find((entry: unknown[]) => entry[2] === id)?.[1];
    return Number(result?.total ?? result?.ids?.length ?? 0);
  };
  return { accounts: total('accounts'), domains: total('domains'), queued: total('queued') };
}

export type AdminMetric = {
  '@type': 'Counter' | 'Gauge' | 'Histogram';
  metric: string;
  count: number;
  sum?: number;
  timestamp?: string;
};

export type AdminOverview = {
  accounts: number;
  domains: number;
  queued: number;
  metrics: AdminMetric[];
  metricsAvailable: boolean;
};

export async function fetchAdminOverview(account: MailAccount, password: string): Promise<AdminOverview> {
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const metricNames = [
    'queue.message-queued', 'queue.authenticated-message-queued', 'queue.dsn-queued', 'queue.report-queued',
    'auth.failed', 'message-ingest.spam', 'security.ip-blocked', 'server.memory'
  ];
  const metricsRequest = adminCall(account, password, [
    ['x:Metric/query', { accountId: account.managementAccountId ?? account.accountId, filter: { timestampIsGreaterThanOrEqual: from, metric: metricNames }, limit: 1000 }, 'q'],
    ['x:Metric/get', { accountId: account.managementAccountId ?? account.accountId, '#ids': { resultOf: 'q', name: 'x:Metric/query', path: '/ids' } }, 'g']
  ]).then((json) => ({ list: json.methodResponses?.find((entry: unknown[]) => entry[0] === 'x:Metric/get')?.[1]?.list ?? [], available: true })).catch(() => ({ list: [], available: false }));
  const [totals, metricsResult] = await Promise.all([
    queryOverviewTotals(account, password),
    metricsRequest
  ]);
  return { ...totals, metrics: metricsResult.list, metricsAvailable: metricsResult.available };
}

export async function queryAdminResource(account: MailAccount, password: string, schema: AdminSchema, viewName: string, options: { search?: string; filter?: Record<string, unknown>; limit?: number } = {}) {
  const resolved = resolveAdminObject(schema, viewName);
  if (!resolved) throw new Error('服务器没有提供此管理对象');
  const list = resolveAdminList(schema, viewName);
  const properties = Array.from(new Set(['id', '@type', ...(list?.columns.map((column) => column.name) ?? []), list?.labelProperty].filter(Boolean))) as string[];
  const accountId = resolved.objectName.startsWith('x:') ? account.managementAccountId ?? account.accountId : account.accountId;
  if (resolved.object.type === 'singleton') {
    const json = await adminCall(account, password, [[`${resolved.objectName}/get`, { accountId, ids: ['singleton'] }, 'g']]);
    const result = json.methodResponses?.find((entry: unknown[]) => entry[0] === `${resolved.objectName}/get`)?.[1];
    return { list: result?.list ?? [], total: result?.list?.length ?? 0 };
  }
  const filter: Record<string, unknown> = { ...(list?.filtersStatic ?? {}), ...(options.filter ?? {}) };
  if (options.search?.trim()) {
    const textFilter = list?.filters?.find((entry) => entry.type === 'text')?.field ?? 'text';
    filter[textFilter] = options.search.trim();
  }
  const query = {
    accountId,
    ...(Object.keys(filter).length ? { filter } : {}),
    limit: options.limit ?? 100,
    calculateTotal: true
  };
  const get = { accountId, '#ids': { resultOf: 'q', name: `${resolved.objectName}/query`, path: '/ids' }, properties };
  const json = await adminCall(account, password, [[`${resolved.objectName}/query`, query, 'q'], [`${resolved.objectName}/get`, get, 'g']]);
  const queried = json.methodResponses?.find((entry: unknown[]) => entry[0] === `${resolved.objectName}/query`)?.[1];
  const fetched = json.methodResponses?.find((entry: unknown[]) => entry[0] === `${resolved.objectName}/get`)?.[1];
  return { list: (fetched?.list ?? []) as Record<string, unknown>[], total: queried?.total ?? fetched?.list?.length ?? 0 };
}

export async function getAdminResource(account: MailAccount, password: string, schema: AdminSchema, viewName: string, id: string) {
  const resolved = resolveAdminObject(schema, viewName);
  if (!resolved) throw new Error('服务器没有提供此管理对象');
  const accountId = resolved.objectName.startsWith('x:') ? account.managementAccountId ?? account.accountId : account.accountId;
  const resourceId = resolved.object.type === 'singleton' ? 'singleton' : id;
  const json = await adminCall(account, password, [[`${resolved.objectName}/get`, { accountId, ids: [resourceId] }, 'g']]);
  return json.methodResponses?.find((entry: unknown[]) => entry[0] === `${resolved.objectName}/get`)?.[1]?.list?.[0] as Record<string, unknown> | undefined;
}

export async function setAdminResource(account: MailAccount, password: string, schema: AdminSchema, viewName: string, operation: { create?: Record<string, Record<string, unknown>>; update?: Record<string, Record<string, unknown>>; destroy?: string[] }) {
  const resolved = resolveAdminObject(schema, viewName);
  if (!resolved) throw new Error('服务器没有提供此管理对象');
  const accountId = resolved.objectName.startsWith('x:') ? account.managementAccountId ?? account.accountId : account.accountId;
  const json = await adminCall(account, password, [[`${resolved.objectName}/set`, { accountId, ...operation }, 's']]);
  const result = json.methodResponses?.find((entry: unknown[]) => entry[0] === `${resolved.objectName}/set`)?.[1];
  const failure = result && (Object.values(result.notCreated ?? {})[0] || Object.values(result.notUpdated ?? {})[0] || Object.values(result.notDestroyed ?? {})[0]) as { description?: string; type?: string } | undefined;
  if (failure) throw new Error(failure.description || failure.type || '管理操作失败');
  return result;
}
