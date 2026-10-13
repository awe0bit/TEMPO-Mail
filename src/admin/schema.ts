import type { AdminAccess } from '@/types';

export type AdminFieldType =
  | { type: 'string'; format?: string; nullable?: boolean }
  | { type: 'number'; format?: string; nullable?: boolean }
  | { type: 'utcDateTime'; nullable?: boolean }
  | { type: 'boolean' }
  | { type: 'enum'; enumName: string; nullable?: boolean }
  | { type: 'blobId' }
  | { type: 'objectId'; objectName: string; nullable?: boolean }
  | { type: 'object'; objectName: string; nullable?: boolean }
  | { type: 'objectList'; objectName: string }
  | { type: 'set'; class: Record<string, unknown> }
  | { type: 'map'; keyClass: Record<string, unknown>; valueClass: Record<string, unknown> };

export type AdminField = {
  description?: string;
  type: AdminFieldType;
  update: 'mutable' | 'immutable' | 'serverSet';
  enterprise?: boolean;
};

export type AdminFormField = { name: string; label: string; placeholder?: string; keyLabel?: string; valueLabel?: string };
export type AdminForm = { title?: string; subtitle?: string; sections: { title?: string; fields: AdminFormField[] }[] };
export type AdminListAction =
  | { type: 'setProperty'; label: string; properties: Record<string, unknown> }
  | { type: 'delete'; label: string }
  | { type: 'query'; label: string; objectName: string; fieldName: string }
  | { type: 'view'; label: string; objectName: string }
  | { type: 'separator' };

export type AdminList = {
  title: string;
  subtitle?: string;
  labelProperty?: string;
  singularName?: string;
  pluralName?: string;
  columns: { name: string; label: string }[];
  filters?: { type: string; field: string; label: string; [key: string]: unknown }[];
  filtersStatic?: Record<string, unknown>;
  sort?: string[];
  itemActions?: AdminListAction[];
  massActions?: AdminListAction[];
};

export type AdminObject =
  | { type: 'object' | 'singleton'; description?: string; permissionPrefix: string; enterprise?: boolean }
  | { type: 'view'; objectName: string };

export type AdminSchema = {
  objects: Record<string, AdminObject>;
  schemas: Record<string, { type: 'single'; schemaName: string } | { type: 'multiple'; variants: { name: string; label: string; schemaName?: string }[] }>;
  fields: Record<string, { properties: Record<string, AdminField>; defaults?: Record<string, unknown> }>;
  forms: Record<string, AdminForm>;
  lists: Record<string, AdminList>;
  enums: Record<string, { name: string; label: string; explanation?: string; color?: string }[]>;
  layouts: AdminLayout[];
  dashboards?: unknown[];
};

export type AdminLayoutLink = { type: 'link'; name: string; viewName: string };
export type AdminLayoutContainer = { type: 'container'; name: string; items: (AdminLayoutLink | AdminLayoutContainer)[] };
export type AdminLayout = {
  name: string;
  icon: string;
  items: ({ link: { name: string; icon: string; viewName: string } } | { container: { name: string; icon: string; items: (AdminLayoutLink | AdminLayoutContainer)[] } })[];
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');

export function resolveAdminObject(schema: AdminSchema, viewName: string) {
  const view = schema.objects[viewName];
  if (!view) return null;
  const objectName = view.type === 'view' ? view.objectName : viewName;
  const object = schema.objects[objectName];
  if (!object || object.type === 'view') return null;
  return { view, object, objectName };
}

export function hasAdminObjectPermission(schema: AdminSchema, access: AdminAccess | null, viewName: string, action: 'Get' | 'Query' | 'Create' | 'Update' | 'Destroy') {
  const resolved = resolveAdminObject(schema, viewName);
  if (!resolved) return false;
  if (resolved.object.enterprise && access?.edition !== 'enterprise') return false;
  const expected = normalize(`${resolved.object.permissionPrefix}${action}`);
  return access?.permissions.some((permission) => normalize(permission) === expected) ?? false;
}

export function resolveAdminList(schema: AdminSchema, viewName: string) {
  const resolved = resolveAdminObject(schema, viewName);
  if (!resolved) return null;
  return schema.lists[viewName] ?? schema.lists[resolved.objectName] ?? null;
}

export function resolveAdminForm(schema: AdminSchema, viewName: string, item?: Record<string, unknown> | null) {
  const resolved = resolveAdminObject(schema, viewName);
  if (!resolved) return null;
  const definition = schema.schemas[resolved.objectName];
  if (!definition) return null;
  if (definition.type === 'single') {
    return {
      form: schema.forms[viewName] ?? schema.forms[resolved.objectName] ?? schema.forms[definition.schemaName] ?? null,
      fields: schema.fields[definition.schemaName] ?? null,
      defaults: schema.fields[definition.schemaName]?.defaults ?? {},
      variant: null as string | null
    };
  }
  const staticType = resolveAdminList(schema, viewName)?.filtersStatic?.['@type'];
  const variantName = typeof item?.['@type'] === 'string' ? item['@type'] as string : typeof staticType === 'string' ? staticType : definition.variants[0]?.name;
  const variant = definition.variants.find((entry) => entry.name === variantName);
  const fields = variant?.schemaName ? schema.fields[variant.schemaName] : null;
  return {
    form: schema.forms[viewName] ?? (variant?.schemaName ? schema.forms[variant.schemaName] : null) ?? schema.forms[resolved.objectName] ?? null,
    fields: fields ?? null,
    defaults: fields?.defaults ?? {},
    variant: variantName ?? null
  };
}

const zh: Record<string, string> = {
  Management: '管理', Settings: '服务器设置', Account: '账户中心', Dashboard: '运行概览', Directory: '目录', Accounts: '账户', Groups: '群组',
  'Mailing Lists': '邮件列表', Tenants: '租户', Roles: '角色', 'OAuth Clients': 'OAuth 客户端', Domains: '域名', 'DKIM Signatures': 'DKIM 签名',
  Emails: '邮件投递', Queued: '待投递队列', History: '投递历史', 'Inbound Delivery': '入站投递', 'Outbound Delivery': '出站投递', 'Delivery tests': '投递测试',
  Reports: '报告', Inbox: '收件箱', Outbox: '发件箱', Observability: '监控', 'Live Tracing': '实时追踪', Logs: '服务器日志', Tasks: '后台任务',
  Scheduled: '计划任务', Failed: '失败任务', Cluster: '集群', Actions: '维护操作', Network: '网络', General: '常规', Listeners: '监听器', Services: '服务',
  Security: '安全', 'Contact Form': '联系表单', Limits: '限制', Push: '推送', Storage: '存储', 'Data Store': '数据存储', 'Blob Store': '对象存储',
  'Search Store': '搜索存储', 'In-Memory Store': '内存存储', 'Tracing Store': '追踪存储', 'Metrics Store': '指标存储', 'Data Retention': '数据保留',
  'Auto-Expunge': '自动清除', 'Data Cleanup': '数据清理', Archiving: '归档', Telemetry: '遥测', Cache: '缓存', Authentication: '身份验证',
  Directories: '目录服务', 'OIDC Provider': 'OIDC 提供商', Certificates: '证书', 'ACME Providers': 'ACME 提供商', MTA: '邮件传输',
  Session: '会话', Inbound: '入站', Outbound: '出站', Strategy: '策略', Routes: '路由', 'Connection Strategies': '连接策略', 'TLS Strategies': 'TLS 策略',
  'Delivery Schedules': '投递计划', 'Virtual Queues': '虚拟队列', 'Rates & Quotas': '速率与配额', Filters: '过滤器', 'Spam Filter': '垃圾邮件过滤',
  Classifier: '分类器', Rules: '规则', Scores: '评分', Lists: '名单', Email: '邮件', Defaults: '默认值', Encryption: '加密',
  'Calendar & Contacts': '日历与联系人', Calendar: '日历', Scheduling: '日程安排', Alarms: '提醒', 'Address Book': '通讯录',
  'Files & Sharing': '文件与共享', 'File Storage': '文件存储', Sharing: '共享', Sieve: 'Sieve 规则', 'System Scripts': '系统脚本', 'User Scripts': '用户脚本',
  'Blocked IPs': '已封禁 IP', 'Allowed IPs': '允许的 IP', Lookups: '查询', Search: '搜索', Tracers: '追踪器', Metrics: '指标', Webhooks: 'Webhook',
  Alerts: '告警', 'Event Levels': '事件级别', 'Task Manager': '任务管理器', AI: 'AI', 'Web Applications': 'Web 应用', Enterprise: '企业版',
  Credentials: '凭据', Password: '密码', 'App Passwords': '应用密码', 'API Keys': 'API 密钥', Mailboxes: '邮箱文件夹', Calendars: '日历',
  'Address Books': '通讯录', 'Sieve Scripts': 'Sieve 脚本', 'Vacation Response': '自动回复', 'Masked Addresses': '临时邮箱', 'Archived Items': '归档项目',
  'Spam Samples': '垃圾邮件样本', 'Public Keys': '公钥', 'DNS Providers': 'DNS 提供商', 'DNS Resolver': 'DNS 解析器',
  Name: '名称', Type: '类型', Description: '说明', Status: '状态', Enabled: '已启用', Disabled: '已停用', Active: '启用', Inactive: '停用',
  Users: '用户账户', 'User Account': '用户账户', 'Group Account': '群组账户', 'External Account': '外部账户', Domain: '域名',
  'Email Address': '邮箱地址', EmailAddress: '邮箱地址', emailAddress: '邮箱地址', address: '地址', username: '用户名', displayName: '显示名称',
  id: '标识符', Identifier: '标识符', domainName: '域名', createdAt: '创建时间', updatedAt: '更新时间', lastModified: '最后修改时间', timestamp: '时间',
  size: '大小', quota: '容量限制', usedQuota: '已用容量', members: '成员', permissions: '权限', isEnabled: '启用状态',
  sender: '发件人', from: '发件人', recipient: '收件人', recipients: '收件人', to: '收件人', subject: '主题', returnPath: '退信地址', nextRetry: '下次重试', lastAttempt: '上次尝试', retryCount: '重试次数', attempts: '尝试次数',
  reason: '原因', level: '级别', event: '事件', details: '详情', due: '计划时间', contents: '内容', domain: '域名',
  certificateManagement: '证书管理方式', dnsManagement: 'DNS 管理方式', Automatic: '自动', Manual: '手动', Pending: '等待处理',
  Completed: '已完成', User: '用户', Group: '群组', MailingList: '邮件列表',
  Add: '添加', Create: '创建', Edit: '编辑', Delete: '删除', Remove: '移除', Retry: '重试', Cancel: '取消', Suspend: '封禁',
  Restore: '恢复', Enable: '启用', Disable: '停用', View: '查看', Details: '详情', 'View details': '查看详情'
};

const wordZh: Record<string, string> = {
  account: '账户', accounts: '账户', address: '地址', allowed: '允许', archived: '归档', blocked: '封禁', calendar: '日历', cancel: '取消', certificate: '证书',
  create: '创建', created: '创建', data: '数据', delete: '删除', delivery: '投递', description: '说明', details: '详情', directory: '目录', disable: '停用', disabled: '停用', domain: '域名',
  edit: '编辑', email: '邮箱', emails: '邮件', enable: '启用', enabled: '启用', event: '事件', failed: '失败', field: '字段', filter: '过滤', group: '群组', history: '历史',
  id: '标识符', inbound: '入站', ip: 'IP', level: '级别', list: '列表', log: '日志', mailbox: '邮箱文件夹', mailing: '邮件', message: '邮件',
  metric: '指标', name: '名称', next: '下次', outbound: '出站', path: '路径', pending: '等待处理', permission: '权限', permissions: '权限',
  queue: '队列', queued: '待投递', quota: '容量限制', reason: '原因', recipient: '收件人', release: '放行', report: '报告', requeue: '重新入队', restore: '恢复', retry: '重试', role: '角色',
  sender: '发件人', server: '服务器', size: '大小', status: '状态', task: '任务', tenant: '租户', time: '时间', timestamp: '时间',
  trace: '追踪', type: '类型', updated: '更新', user: '用户', used: '已用', view: '查看'
};

export const adminZh = (value: string) => {
  if (!value) return value;
  if (zh[value]) return zh[value];
  if (/\p{Script=Han}/u.test(value)) return value;
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._/:-]+/g, ' ')
    .trim()
    .split(/\s+/);
  let translated = false;
  const result = words.map((word) => {
    const replacement = wordZh[word.toLowerCase()];
    if (replacement) translated = true;
    return replacement ?? word;
  }).join('');
  return translated ? result : value;
};

const descriptionZh: Record<string, string> = {
  'Whether this item is enabled': '是否启用此项目',
  'The name of the item': '此项目的名称',
  'A description of the item': '用于识别此项目的说明'
};

export const adminDescriptionZh = (value?: string) => {
  if (!value) return undefined;
  if (/\p{Script=Han}/u.test(value)) return value;
  return descriptionZh[value];
};

export function flattenAdminItems(items: (AdminLayoutLink | AdminLayoutContainer)[], parents: string[] = []): { name: string; viewName: string; parents: string[] }[] {
  return items.flatMap((item) => item.type === 'link'
    ? [{ name: item.name, viewName: item.viewName, parents }]
    : flattenAdminItems(item.items, [...parents, item.name]));
}
