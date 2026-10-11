import type { MailAccount, MailItem, ManagedAccount, TemporaryAddress } from '@/types';

export const previewAccount: MailAccount = {
  id: 'tempo-preview-admin',
  name: '预览',
  email: 'admin@preview.local',
  username: 'admin@preview.local',
  sessionUrl: 'https://preview.local/.well-known/jmap',
  apiUrl: 'https://preview.local/jmap',
  accountId: 'preview'
};

export const previewAccess = {
  permissions: [
    'sysAccountGet', 'sysAccountQuery', 'sysAccountCreate', 'sysAccountUpdate', 'sysAccountDestroy',
    'sysMaskedEmailGet', 'sysMaskedEmailQuery', 'sysMaskedEmailCreate', 'sysMaskedEmailUpdate', 'sysMaskedEmailDestroy'
  ],
  edition: 'Preview'
};

export const previewMail: MailItem[] = [
  { id: 'preview-1', subject: '欢迎使用 TEMPO Mail', preview: '邮件、账户与服务器管理都集中在一个客户端。', body: '欢迎使用 TEMPO Mail。\n\n你可以在这里收发邮件、搜索所有邮箱内容，并在拥有管理员权限时直接管理自托管服务器。所有预览操作都只发生在本机，不会连接网络。', receivedAt: new Date().toISOString(), from: [{ name: 'TEMPO', email: 'hello@tempo.local' }], to: [{ name: '管理员', email: 'admin@preview.local' }], keywords: {} },
  { id: 'preview-2', subject: '你的收件箱已经准备好', preview: '切换账户、搜索邮件和写信都可以从当前页面完成。', body: '收件箱已经准备完成。\n\n点击左上角账户按钮可以切换邮箱，底部搜索可以检索发件人、主题和正文，右下角按钮用于写新邮件。', receivedAt: new Date(Date.now() - 3600000).toISOString(), from: [{ name: 'TEMPO 团队', email: 'team@tempo.local' }], to: [{ email: 'admin@preview.local' }], keywords: { '$seen': true, '$flagged': true } },
  { id: 'preview-3', subject: '管理员工具', preview: '管理员账户可以管理用户与临时邮箱，普通账户不会显示管理入口。', body: '管理员功能会根据服务器返回的权限自动出现。\n\nCommunity 与 Enterprise 功能会明确区分，不可用能力不会显示成可操作入口。', receivedAt: new Date(Date.now() - 86400000).toISOString(), from: [{ name: '服务中心', email: 'service@tempo.local' }], to: [{ email: 'admin@preview.local' }], keywords: { '$seen': true } }
];

export const previewManagedAccounts: ManagedAccount[] = [
  { id: 'a1', name: 'admin', emailAddress: 'admin@preview.local', description: '管理员' },
  { id: 'a2', name: 'alice', emailAddress: 'alice@preview.local', description: 'Alice' },
  { id: 'a3', name: 'suspended', emailAddress: 'suspended@preview.local', description: '已封禁账户', permissions: { '@type': 'Merge', disabledPermissions: { authenticate: true } } }
];

export const previewTemporaryAddresses: TemporaryAddress[] = [
  { id: 't1', email: 'shopping-9f3a@preview.local', description: '购物网站', enabled: true },
  { id: 't2', email: 'trial-42ac@preview.local', description: '试用服务', enabled: false }
];
