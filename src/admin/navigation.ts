import { adminZh, flattenAdminItems, hasAdminObjectPermission, type AdminSchema } from '@/admin/schema';
import type { AdminAccess } from '@/types';

export type AdminFeatureGroupKey = 'accounts' | 'delivery';
export type MobileAdminMode = 'manage' | 'read';

export type AdminFeature = {
  name: string;
  title: string;
  viewName: string;
  path: string;
  mode: MobileAdminMode;
};

export const adminFeatureGroups: { key: AdminFeatureGroupKey; title: string }[] = [
  { key: 'accounts', title: '账户与域名' },
  { key: 'delivery', title: '邮件投递' }
];

type MobileRule = { test: RegExp; group: AdminFeatureGroupKey; mode: MobileAdminMode };

// This is intentionally much smaller than WebAdmin. The phone only exposes
// daily mail operations; infrastructure and diagnostics stay on the web.
const mobileRules: MobileRule[] = [
  { test: /^x:Account\/User$/i, group: 'accounts', mode: 'manage' },
  { test: /^x:Domain$/i, group: 'accounts', mode: 'read' },
  { test: /^x:QueuedMessage$/i, group: 'delivery', mode: 'manage' }
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
        const policy = mobileAdminPolicy(item.viewName);
        if (!policy || !hasAdminObjectPermission(schema, access, item.viewName, 'Get') || unique.has(item.viewName)) continue;
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
  return grouped;
}

export function mobileFeatureDescription(viewName: string) {
  if (/^x:Account\/User$/i.test(viewName)) return '创建、封禁或删除邮箱账户';
  if (/^x:Domain$/i.test(viewName)) return '查看服务器当前托管的邮箱域名';
  if (/^x:QueuedMessage$/i.test(viewName)) return '查看、重试或取消等待投递的邮件';
  return undefined;
}
