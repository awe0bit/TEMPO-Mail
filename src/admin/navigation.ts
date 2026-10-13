import { adminZh, flattenAdminItems, hasAdminObjectPermission, type AdminSchema } from '@/admin/schema';
import type { AdminAccess } from '@/types';

export type AdminFeatureGroupKey = 'accounts' | 'delivery' | 'security' | 'diagnostics';
export type MobileAdminMode = 'manage' | 'read';

export type AdminFeature = {
  name: string;
  title: string;
  viewName: string;
  path: string;
  mode: MobileAdminMode;
};

export const adminFeatureGroups: { key: AdminFeatureGroupKey; title: string; description: string }[] = [
  { key: 'accounts', title: '账户与身份', description: '邮箱账户、群组、邮件列表与域名状态' },
  { key: 'delivery', title: '邮件与投递', description: '投递队列和收发报告' },
  { key: 'security', title: '安全状态', description: '只读查看封禁与允许名单' },
  { key: 'diagnostics', title: '运行诊断', description: '只读查看任务、指标、追踪和日志' }
];

type MobileRule = { test: RegExp; group: AdminFeatureGroupKey; mode: MobileAdminMode };

// Mobile deliberately exposes a small, audited subset of WebAdmin. Listener,
// storage, TLS, authentication, cluster, DNS-provider and service settings can
// break JMAP/WebAdmin connectivity, so they never enter the mobile route tree.
const mobileRules: MobileRule[] = [
  { test: /^x:Account\/(User|Group|MailingList)$/i, group: 'accounts', mode: 'manage' },
  { test: /^x:(Domain|DkimSignature)$/i, group: 'accounts', mode: 'read' },
  { test: /^x:(QueuedMessage|IncomingReport|OutgoingReport)(\/.*)?$/i, group: 'delivery', mode: 'manage' },
  { test: /^x:(BlockedIp|AllowedIp)$/i, group: 'security', mode: 'read' },
  { test: /^x:(Task|Metric|Log|Trace)(\/.*)?$/i, group: 'diagnostics', mode: 'read' }
];

export function mobileAdminPolicy(viewName: string) {
  const rule = mobileRules.find((item) => item.test.test(viewName));
  return rule ? { group: rule.group, mode: rule.mode } : null;
}

export function collectAdminFeatures(schema: AdminSchema, access: AdminAccess | null) {
  const unique = new Map<string, AdminFeature>();

  for (const layout of schema.layouts) {
    for (const entry of layout.items) {
      const items = 'link' in entry
        ? [{ name: entry.link.name, viewName: entry.link.viewName, parents: [layout.name] }]
        : flattenAdminItems(entry.container.items, [layout.name, entry.container.name]);

      for (const item of items) {
        if (item.viewName.startsWith('CustomComponent/')) continue;
        const policy = mobileAdminPolicy(item.viewName);
        if (!policy) continue;
        if (!hasAdminObjectPermission(schema, access, item.viewName, 'Get')) continue;
        if (unique.has(item.viewName)) continue;
        unique.set(item.viewName, {
          name: item.name,
          title: adminZh(item.name),
          viewName: item.viewName,
          path: item.parents.map(adminZh).join(' · '),
          mode: policy.mode
        });
      }
    }
  }

  const grouped = new Map<AdminFeatureGroupKey, AdminFeature[]>();
  for (const group of adminFeatureGroups) grouped.set(group.key, []);
  for (const feature of unique.values()) grouped.get(mobileAdminPolicy(feature.viewName)!.group)!.push(feature);
  for (const features of grouped.values()) features.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  return grouped;
}
