import type { AdminAccess, MailAccount, MailItem, ManagedAccount, TemporaryAddress } from '@/types';
import { Client } from 'jmap-client-ts';
import { FetchTransport } from 'jmap-client-ts/lib/utils/fetch-transport';

const authorization = (username: string, password: string) =>
  `Basic ${globalThis.btoa(`${username}:${password}`)}`;

async function fetchWithTimeout(url: string, init: RequestInit, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function request(url: string, init: RequestInit, timeout = 15000) {
  const response = await fetchWithTimeout(url, init, timeout);
  if (!response.ok) throw new Error(`服务器请求失败（HTTP ${response.status}）`);
  return response;
}

const MAIL_CAPABILITY = 'urn:ietf:params:jmap:mail';

function localAccountId() {
  // Hermes does not expose crypto.randomUUID in every installed native build.
  // This ID only keys local SecureStore entries; it is not a security token.
  return `account-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeServer(server: string) {
  const value = server.trim();
  if (!value) throw new Error('请填写服务器地址');
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function mailAccountId(session: any) {
  const primary = session.primaryAccounts?.[MAIL_CAPABILITY];
  if (primary) return primary as string;
  return Object.entries(session.accounts ?? {}).find(([, value]: [string, any]) =>
    Boolean(value?.accountCapabilities?.[MAIL_CAPABILITY])
  )?.[0];
}

export async function discover(server: string, email: string, username: string, password: string): Promise<MailAccount> {
  let root: string;
  try {
    root = new URL(normalizeServer(server)).toString().replace(/\/$/, '');
  } catch {
    throw new Error('服务器地址格式不正确');
  }

  const parsed = new URL(root);
  const discoveryUrl = parsed.pathname.includes('/.well-known/jmap') ? root : `${root}/.well-known/jmap`;
  const endpoints = [...new Set([discoveryUrl, `${parsed.origin}/jmap/session`])];
  const localPart = email.trim().split('@')[0];
  const logins = [...new Set([username.trim(), email.trim(), localPart].filter(Boolean))];
  let sawAuthenticationFailure = false;
  let sawSessionWithoutMail = false;
  let lastError: unknown = null;

  // NSURLSession can remove Authorization while it follows the well-known
  // redirect. Trying the resolved Stalwart endpoint explicitly makes the
  // second request carry credentials on iOS. Full addresses and local account
  // names are both valid Stalwart login forms, so try both without making the
  // user understand the distinction.
  for (const login of logins) {
    for (const endpoint of endpoints) {
      try {
        const response = await fetchWithTimeout(endpoint, {
          headers: { Accept: 'application/json', Authorization: authorization(login, password) }
        });
        if (response.status === 401 || response.status === 403) {
          sawAuthenticationFailure = true;
          continue;
        }
        if (!response.ok) {
          lastError = new Error(`服务器请求失败（HTTP ${response.status}）`);
          continue;
        }
        const session = await response.json();
        const accountId = mailAccountId(session);
        if (!accountId || !session.apiUrl) {
          sawSessionWithoutMail = true;
          continue;
        }
        const sessionUrl = response.url || endpoint;
        return {
          id: localAccountId(),
          name: email.split('@')[0],
          email: email.trim(),
          username: login,
          sessionUrl,
          apiUrl: new URL(session.apiUrl, sessionUrl).toString(),
          accountId,
          managementAccountId: session.primaryAccounts?.['urn:stalwart:jmap'] ?? session.primaryAccounts?.['urn:ietf:params:jmap:core'] ?? accountId
        };
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (sawSessionWithoutMail) throw new Error('该账户没有可用的 JMAP 邮箱');
  if (sawAuthenticationFailure) throw new Error('邮箱地址或密码错误');
  if (lastError instanceof Error && lastError.message.startsWith('服务器请求失败')) throw lastError;
  throw new Error('无法连接邮件服务器，请检查网络后重试');
}

export async function adminAccess(account: MailAccount, password: string): Promise<AdminAccess | null> {
  const origin = new URL(account.sessionUrl).origin;
  try {
    const response = await request(`${origin}/api/account`, {
      headers: { Accept: 'application/json', Authorization: authorization(account.username, password) }
    });
    return response.json();
  } catch {
    return null;
  }
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');
export const hasPermission = (access: AdminAccess | null, value: string) =>
  access?.permissions.some((permission) => normalize(permission) === normalize(value)) ?? false;
export const isAdministrator = (access: AdminAccess | null) =>
  hasPermission(access, 'sysAccountGet') && hasPermission(access, 'sysAccountQuery');

async function call(account: MailAccount, password: string, methodCalls: unknown[]) {
  const response = await request(account.apiUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authorization(account.username, password)
    },
    body: JSON.stringify({ using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail', 'urn:ietf:params:jmap:submission'], methodCalls })
  });
  return response.json();
}

export async function fetchMail(account: MailAccount, password: string, role: 'inbox' | 'sent' | 'starred' | 'all', search = ''): Promise<MailItem[]> {
  const client = makeClient(account, password);
  await client.fetchSession();
  const mailbox = await client.mailbox_get({ accountId: account.accountId, ids: null });
  const boxes = mailbox.list ?? [];
  const filter: Record<string, unknown> = {};
  if (role === 'starred') filter.hasKeyword = '$flagged';
  else if (role !== 'all') filter.inMailbox = boxes.find((item: { role?: string }) => item.role === role)?.id;
  if (search.trim()) filter.text = search.trim();
  const queried = await client.email_query({ accountId: account.accountId, filter, sort: [{ property: 'receivedAt', isAscending: false }], limit: 50 });
  if (!queried.ids.length) return [];
  const result = await client.email_get({ accountId: account.accountId, ids: queried.ids, properties: ['id', 'subject', 'preview', 'receivedAt', 'from', 'keywords'] });
  return result.list as unknown as MailItem[];
}

export async function fetchMailDetail(account: MailAccount, password: string, id: string): Promise<MailItem> {
  const client = makeClient(account, password);
  await client.fetchSession();
  const result = await client.email_get({
    accountId: account.accountId,
    ids: [id],
    properties: ['id', 'subject', 'preview', 'receivedAt', 'from', 'to', 'keywords', 'textBody', 'htmlBody', 'bodyValues'],
    fetchTextBodyValues: true,
    fetchHTMLBodyValues: true,
    maxBodyValueBytes: 2_000_000
  } as any);
  const item = result.list?.[0] as any;
  if (!item) throw new Error('邮件不存在或已被删除');
  const textPart = item.textBody?.[0]?.partId;
  const htmlPart = item.htmlBody?.[0]?.partId;
  const rawBody = item.bodyValues?.[textPart]?.value ?? item.bodyValues?.[htmlPart]?.value ?? item.preview ?? '';
  return { ...item, body: textPart ? rawBody : stripHtml(String(rawBody)) } as MailItem;
}

export async function updateMailKeywords(account: MailAccount, password: string, id: string, keywords: Record<string, boolean>) {
  const client = makeClient(account, password);
  await client.fetchSession();
  const result = await client.email_set({ accountId: account.accountId, update: { [id]: { keywords } } } as any);
  const failure = (result as any).notUpdated?.[id];
  if (failure) throw new Error(failure.description || failure.type || '邮件状态更新失败');
}

const stripHtml = (value: string) => value
  .replace(/<\s*(br|\/p|\/div)\s*\/?>/gi, '\n')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

function makeClient(account: MailAccount, password: string) {
  const basic = authorization(account.username, password);
  const transport = new FetchTransport((url, params) => fetch(url, {
    ...params,
    headers: { ...params.headers, Authorization: basic }
  }) as never);
  return new Client({ sessionUrl: account.sessionUrl, accessToken: 'basic-transport', transport });
}

export async function sendMail(account: MailAccount, password: string, to: string, subject: string, body: string) {
  const client = makeClient(account, password);
  await client.fetchSession();
  const mailbox = await client.mailbox_get({ accountId: account.accountId, ids: null });
  const boxes = mailbox.list ?? [];
  const drafts = boxes.find((item: { role?: string }) => item.role === 'drafts')?.id;
  if (!drafts) throw new Error('服务器没有草稿箱');
  const identities = await call(account, password, [['Identity/get', { accountId: account.accountId }, 'i']]);
  const identity = identities.methodResponses?.[0]?.[1]?.list?.find((item: any) => item.email?.toLowerCase() === account.email.toLowerCase()) ?? identities.methodResponses?.[0]?.[1]?.list?.[0];
  if (!identity) throw new Error('服务器没有可用于发信的身份');
  const recipients = to.split(/[,;]/).map((value) => value.trim()).filter(Boolean).map((email) => ({ email }));
  if (!recipients.length) throw new Error('请填写收件人');
  const created = await client.email_set({
    accountId: account.accountId,
    create: { draft: {
      mailboxIds: { [drafts]: true }, keywords: { '$draft': true, '$seen': true },
      from: [{ name: identity.name || '', email: identity.email }], to: recipients, subject,
      bodyValues: { body: { value: body, isTruncated: false } }, textBody: [{ partId: 'body', type: 'text/plain' }]
    } }
  } as any);
  const emailId = (created as any).created?.draft?.id;
  if (!emailId) throw new Error('服务器没有返回新邮件 ID');
  const submitted = await client.emailSubmission_set({
    accountId: account.accountId,
    create: { submission: { identityId: identity.id, emailId } }
  } as any);
  const failure = (submitted as any).notCreated?.submission;
  if (failure) throw new Error(failure.description || failure.type || '发送失败');
}

export async function fetchManagedAccounts(account: MailAccount, password: string): Promise<ManagedAccount[]> {
  const json = await managementCall(account, password, [
    ['x:Account/query', { filter: {}, limit: 200 }, 'q'],
    ['x:Account/get', { '#ids': { resultOf: 'q', name: 'x:Account/query', path: '/ids' }, properties: ['id', 'name', 'emailAddress', 'description', 'permissions'] }, 'g']
  ]);
  return json.methodResponses?.find((item: unknown[]) => item[0] === 'x:Account/get')?.[1]?.list ?? [];
}

async function managementCall(account: MailAccount, password: string, methodCalls: unknown[]) {
  const accountId = account.managementAccountId ?? account.accountId;
  const callsWithAccountId = (methodCalls as [string, Record<string, unknown>, string][]).map(([name, args, callId]) => [
    name,
    { accountId, ...args },
    callId
  ]);
  const response = await request(account.apiUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authorization(account.username, password) },
    body: JSON.stringify({ using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'], methodCalls: callsWithAccountId })
  });
  const json = await response.json();
  const error = json.methodResponses?.find((item: unknown[]) => item[0] === 'error');
  if (error) throw new Error(error[1]?.description || error[1]?.type || '管理操作失败');
  return json;
}

function assertSetSucceeded(json: any, bucket: string) {
  const result = json.methodResponses?.[0]?.[1];
  const first = result?.[bucket] && Object.values(result[bucket])[0] as any;
  if (first) throw new Error(first.description || first.type || '管理操作失败');
}

export async function createManagedAccount(account: MailAccount, password: string, email: string, secret: string, description: string) {
  const [name, domain] = email.trim().toLowerCase().split('@');
  if (!name || !domain || !secret) throw new Error('请填写完整邮箱和初始密码');
  const domains = await managementCall(account, password, [
    ['x:Domain/query', { filter: { name: domain }, limit: 10 }, 'q'],
    ['x:Domain/get', { '#ids': { resultOf: 'q', name: 'x:Domain/query', path: '/ids' }, properties: ['id', 'name'] }, 'g']
  ]);
  const domainList = domains.methodResponses?.find((item: unknown[]) => item[0] === 'x:Domain/get')?.[1]?.list ?? [];
  const domainId = domainList.find((item: any) => item.name?.toLowerCase() === domain)?.id;
  if (!domainId) throw new Error('服务器中不存在这个域名');
  const body: Record<string, unknown> = {
    '@type': 'User', name, domainId,
    credentials: { '0': { '@type': 'Password', secret } },
    memberGroupIds: {}, roles: { '@type': 'User' }, permissions: { '@type': 'Inherit' },
    quotas: {}, aliases: {}, encryptionAtRest: { '@type': 'Disabled' }
  };
  if (description.trim()) body.description = description.trim();
  const json = await managementCall(account, password, [['x:Account/set', { create: { account: body } }, 's']]);
  assertSetSucceeded(json, 'notCreated');
}

export async function setManagedAccountSuspended(owner: MailAccount, password: string, target: ManagedAccount, suspended: boolean) {
  const permissions = { ...(target.permissions ?? { '@type': 'Inherit' }) } as Record<string, any>;
  if (suspended && permissions['@type'] === 'Inherit') permissions['@type'] = 'Merge';
  const disabled = { ...(permissions.disabledPermissions ?? {}) };
  if (suspended) disabled.authenticate = true; else delete disabled.authenticate;
  permissions.disabledPermissions = disabled;
  if (!suspended && permissions['@type'] === 'Merge' && Object.keys(disabled).length === 0 && Object.keys(permissions.enabledPermissions ?? {}).length === 0) {
    Object.keys(permissions).forEach((key) => delete permissions[key]);
    permissions['@type'] = 'Inherit';
  }
  const json = await managementCall(owner, password, [['x:Account/set', { update: { [target.id]: { permissions } } }, 's']]);
  assertSetSucceeded(json, 'notUpdated');
}

export async function deleteManagedAccount(owner: MailAccount, password: string, id: string) {
  const json = await managementCall(owner, password, [['x:Account/set', { destroy: [id] }, 's']]);
  assertSetSucceeded(json, 'notDestroyed');
}

export async function fetchTemporaryAddresses(account: MailAccount, password: string): Promise<TemporaryAddress[]> {
  const json = await managementCall(account, password, [
    ['x:MaskedEmail/query', { filter: {}, limit: 200 }, 'q'],
    ['x:MaskedEmail/get', { '#ids': { resultOf: 'q', name: 'x:MaskedEmail/query', path: '/ids' }, properties: ['id', 'email', 'description', 'enabled', 'expiresAt'] }, 'g']
  ]);
  return json.methodResponses?.find((item: unknown[]) => item[0] === 'x:MaskedEmail/get')?.[1]?.list ?? [];
}

export async function createTemporaryAddress(account: MailAccount, password: string, prefix: string, domain: string, description: string) {
  const body: Record<string, unknown> = {};
  if (prefix.trim()) body.emailPrefix = prefix.trim().toLowerCase();
  if (domain.trim()) body.emailDomain = domain.trim().toLowerCase();
  if (description.trim()) body.description = description.trim();
  const json = await managementCall(account, password, [['x:MaskedEmail/set', { create: { address: body } }, 's']]);
  assertSetSucceeded(json, 'notCreated');
}

export async function setTemporaryAddressEnabled(account: MailAccount, password: string, address: TemporaryAddress, enabled: boolean) {
  const json = await managementCall(account, password, [['x:MaskedEmail/set', { update: { [address.id]: { enabled } } }, 's']]);
  assertSetSucceeded(json, 'notUpdated');
}

export async function deleteTemporaryAddress(account: MailAccount, password: string, id: string) {
  const json = await managementCall(account, password, [['x:MaskedEmail/set', { destroy: [id] }, 's']]);
  assertSetSucceeded(json, 'notDestroyed');
}
