import { adminZh, flattenAdminItems, hasAdminObjectPermission, type AdminSchema } from '@/admin/schema';
import type { AdminAccess } from '@/types';

export type AdminFeatureGroupKey = 'accounts' | 'delivery' | 'security' | 'system' | 'diagnostics';

export type AdminFeature = {
  name: string;
  title: string;
  viewName: string;
  path: string;
};

export const adminFeatureGroups: { key: AdminFeatureGroupKey; title: string; description: string }[] = [
  { key: 'accounts', title: '账户与身份', description: '邮箱账户、域名、群组、角色与凭据' },
  { key: 'delivery', title: '邮件与投递', description: '队列、路由、传输、过滤与反垃圾邮件' },
  { key: 'security', title: '安全与访问', description: '身份验证、证书、TLS 与网络访问规则' },
  { key: 'system', title: '服务与存储', description: '网络服务、数据存储、缓存与集群' },
  { key: 'diagnostics', title: '诊断与维护', description: '任务、指标、追踪、日志与维护操作' }
];

export function collectAdminFeatures(schema: AdminSchema, access: AdminAccess | null) {
  const unique = new Map<string, AdminFeature>();

  for (const layout of schema.layouts) {
    for (const entry of layout.items) {
      const items = 'link' in entry
        ? [{ name: entry.link.name, viewName: entry.link.viewName, parents: [layout.name] }]
        : flattenAdminItems(entry.container.items, [layout.name, entry.container.name]);

      for (const item of items) {
        if (item.viewName.startsWith('CustomComponent/')) continue;
        if (!hasAdminObjectPermission(schema, access, item.viewName, 'Get')) continue;
        if (unique.has(item.viewName)) continue;
        unique.set(item.viewName, {
          name: item.name,
          title: adminZh(item.name),
          viewName: item.viewName,
          path: item.parents.map(adminZh).join(' · ')
        });
      }
    }
  }

  const grouped = new Map<AdminFeatureGroupKey, AdminFeature[]>();
  for (const group of adminFeatureGroups) grouped.set(group.key, []);
  for (const feature of unique.values()) grouped.get(classify(feature))!.push(feature);
  for (const features of grouped.values()) features.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  return grouped;
}

function classify(feature: AdminFeature): AdminFeatureGroupKey {
  const value = `${feature.name} ${feature.viewName} ${feature.path}`.toLowerCase();
  if (/log|trace|metric|report|task|action|telemetry|alert|event|observab|lookup|maintenance/.test(value)) return 'diagnostics';
  if (/security|auth|certificate|acme|blocked|allowed|tls|api.?key|public.?key|encrypt/.test(value)) return 'security';
  if (/queue|deliver|email|mailbox|mta|inbound|outbound|route|sieve|spam|filter|archive|classif/.test(value)) return 'delivery';
  if (/account|directory|domain|dkim|group|mailing.?list|tenant|role|oauth|credential|password|contact|calendar/.test(value)) return 'accounts';
  return 'system';
}
