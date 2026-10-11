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
  { id: 'preview-1', subject: '欢迎使用 TEMPO Mail', preview: '邮件、账户与服务器管理都集中在一个客户端。', receivedAt: new Date().toISOString(), from: [{ name: 'TEMPO', email: 'hello@tempo.local' }], keywords: {} },
  { id: 'preview-2', subject: '你的收件箱已经准备好', preview: '切换账户、搜索邮件和写信都可以从当前页面完成。', receivedAt: new Date(Date.now() - 3600000).toISOString(), from: [{ name: 'TEMPO 团队', email: 'team@tempo.local' }], keywords: { '$seen': true, '$flagged': true } },
  { id: 'preview-3', subject: '管理员工具', preview: '管理员账户可以管理用户与临时邮箱，普通账户不会显示管理入口。', receivedAt: new Date(Date.now() - 86400000).toISOString(), from: [{ name: '服务中心', email: 'service@tempo.local' }], keywords: { '$seen': true } }
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
