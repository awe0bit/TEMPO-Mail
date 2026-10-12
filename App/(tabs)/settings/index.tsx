import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Stack, router } from 'expo-router';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { fetchAdminSchema } from '@/api/admin';
import { adminZh, flattenAdminItems, hasAdminObjectPermission, type AdminLayout, type AdminSchema } from '@/admin/schema';
import { AccountMenu } from '@/components/AccountMenu';
import {
  SettingsDivider, SettingsGroup, SettingsRow, SettingsSectionTitle,
  type SettingsSymbol, type SettingsTone
} from '@/components/SettingsList';
import { useAppState } from '@/state/app-state';
import type { AdminAccess } from '@/types';

type LayoutName = 'Management' | 'Settings' | 'Account';

export default function SettingsScreen() {
  const theme = useTheme();
  const { selected, password, preview, access, admin, remove } = useAppState();
  const schema = useQuery({
    queryKey: ['admin-schema', selected?.id],
    enabled: Boolean(selected) && !preview,
    staleTime: 10 * 60_000,
    queryFn: async () => fetchAdminSchema(selected!, await password())
  });

  const deleteLocal = () => selected && Alert.alert(preview ? '退出预览？' : '移除本机账户？', selected.email, [
    { text: '取消', style: 'cancel' },
    { text: preview ? '退出' : '移除', style: 'destructive', onPress: async () => { await remove(selected.id); router.replace('/'); } }
  ]);

  const openResource = (viewName: string, title: string) => {
    if (viewName === 'x:Account/User') return router.push('/(tabs)/settings/accounts' as never);
    if (viewName === 'CustomComponent/Dashboard') return router.push('/(tabs)/overview' as never);
    router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: viewName, title } } as never);
  };

  const openEntry = (layoutName: LayoutName, entry: AdminLayout['items'][number], index: number) => {
    if ('link' in entry) return openResource(entry.link.viewName, adminZh(entry.link.name));
    router.push({
      pathname: '/(tabs)/settings/category' as never,
      params: { layout: layoutName, index: String(index), title: adminZh(entry.container.name) }
    } as never);
  };

  const host = selected ? safeHost(selected.sessionUrl) : '—';
  return <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
    <Stack.Screen options={{ title: '设置', headerShadowVisible: false, headerLeft: () => <AccountMenu /> }} />
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={schema.isRefetching} onRefresh={() => schema.refetch()} tintColor={theme.colors.onSurfaceVariant} />}
    >
      <SettingsGroup>
        <SettingsRow title={selected?.email ?? '未登录'} description={preview ? '本地完整演示，不连接服务器' : host} value={admin ? '管理员' : '邮箱账户'} symbol="person.crop.circle.fill" tone="gray" />
      </SettingsGroup>

      {preview ? <PreviewSettings openResource={openResource} /> : schema.isLoading ? <ActivityIndicator style={styles.loading} /> : schema.error ? (
        <View style={[styles.notice, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium">无法读取服务器功能</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{schema.error instanceof Error ? schema.error.message : '服务器设置加载失败'}</Text>
        </View>
      ) : schema.data ? <>
        {admin && <SchemaLayout
          title="邮件服务管理"
          layoutName="Management"
          schema={schema.data}
          access={access}
          onOpen={openEntry}
        />}
        {admin && <SchemaLayout
          title="服务器配置"
          layoutName="Settings"
          schema={schema.data}
          access={access}
          onOpen={openEntry}
        />}
        <SchemaLayout
          title="邮箱账户"
          layoutName="Account"
          schema={schema.data}
          access={access}
          onOpen={openEntry}
        />
      </> : null}

      <SettingsSectionTitle>客户端</SettingsSectionTitle>
      <SettingsGroup>
        <SettingsRow title="邮件协议" value="JMAP" symbol="network" tone="blue" />
        <SettingsDivider />
        <SettingsRow title="原生兼容版本" value={String(Updates.runtimeVersion || 'native-1')} symbol="arrow.triangle.2.circlepath" tone="green" />
        <SettingsDivider />
        <SettingsRow title="App 版本" value={Constants.expoConfig?.version || '—'} symbol="info.circle.fill" tone="gray" />
      </SettingsGroup>

      <SettingsSectionTitle>本机账户</SettingsSectionTitle>
      <SettingsGroup>
        <SettingsRow title={preview ? '退出预览' : '移除此账户'} description={preview ? '返回登录与服务器选择页面' : '只删除本机凭据，不删除服务器邮箱'} symbol="rectangle.portrait.and.arrow.right" tone="red" destructive onPress={deleteLocal} />
      </SettingsGroup>
      <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>界面和业务更新通过 production OTA 发布；只有原生依赖、权限或 Swift 兼容层变化才需要重新安装。</Text>
    </ScrollView>
  </View>;
}

function SchemaLayout({ title, layoutName, schema, access, onOpen }: {
  title: string;
  layoutName: LayoutName;
  schema: AdminSchema;
  access: AdminAccess | null;
  onOpen(layoutName: LayoutName, entry: AdminLayout['items'][number], index: number): void;
}) {
  const layout = schema.layouts.find((item) => item.name === layoutName);
  const entries = (layout?.items ?? []).map((entry, index) => ({ entry, index, count: visibleCount(schema, access, entry) })).filter((item) => item.count > 0);
  if (!entries.length) return null;
  return <>
    <SettingsSectionTitle>{title}</SettingsSectionTitle>
    <SettingsGroup>
      {entries.map(({ entry, index, count }, rowIndex) => {
        const link = 'link' in entry ? entry.link : null;
        const container = 'container' in entry ? entry.container : null;
        const label = adminZh(link?.name ?? container?.name ?? '设置');
        const visual = visualFor(link?.name ?? container?.name ?? label, layoutName);
        const description = link ? undefined : `${count} 项可用功能`;
        return <View key={`${layoutName}-${index}`}>
          {rowIndex > 0 ? <SettingsDivider /> : null}
          <SettingsRow title={label} description={description} symbol={visual.symbol} tone={visual.tone} onPress={() => onOpen(layoutName, entry, index)} />
        </View>;
      })}
    </SettingsGroup>
  </>;
}

function PreviewSettings({ openResource }: { openResource(view: string, title: string): void }) {
  const management: { title: string; description: string; view: string; symbol: SettingsSymbol; tone: SettingsTone }[] = [
    { title: '运行概览', description: '账户、域名、队列与安全状态', view: 'CustomComponent/Dashboard', symbol: 'chart.xyaxis.line', tone: 'blue' },
    { title: '账户与封禁', description: '创建、封禁、恢复或删除邮箱账户', view: 'x:Account/User', symbol: 'person.2.fill', tone: 'blue' },
    { title: '域名与 DKIM', description: '托管域名、签名、证书与 DNS', view: 'x:Domain', symbol: 'globe', tone: 'green' },
    { title: '投递队列', description: '查看等待投递的邮件', view: 'x:QueuedMessage', symbol: 'paperplane.fill', tone: 'orange' },
    { title: '后台任务', description: '计划任务与失败任务', view: 'x:Task', symbol: 'clock.arrow.circlepath', tone: 'purple' },
    { title: '安全规则', description: '已封禁与允许的 IP', view: 'x:BlockedIp', symbol: 'hand.raised.fill', tone: 'red' }
  ];
  return <>
    <SettingsSectionTitle>邮件服务管理</SettingsSectionTitle>
    <SettingsGroup>{management.map((item, index) => <View key={item.view}>{index > 0 ? <SettingsDivider /> : null}<SettingsRow {...item} onPress={() => openResource(item.view, item.title)} /></View>)}</SettingsGroup>
    <SettingsSectionTitle>服务器能力</SettingsSectionTitle>
    <SettingsGroup>
      <SettingsRow title="服务器配置" description="登录管理员账户后读取真实 Stalwart schema" symbol="server.rack" tone="gray" disabled />
      <SettingsDivider />
      <SettingsRow title="临时邮箱" description="Enterprise 功能；Community 服务器不会显示为可用" symbol="envelope.badge.shield.half.filled" tone="purple" disabled />
    </SettingsGroup>
  </>;
}

function visibleCount(schema: AdminSchema, access: AdminAccess | null, entry: AdminLayout['items'][number]) {
  if ('link' in entry) {
    if (entry.link.viewName === 'CustomComponent/Dashboard') return 1;
    if (entry.link.viewName.startsWith('CustomComponent/')) return 0;
    return Number(hasAdminObjectPermission(schema, access, entry.link.viewName, 'Get'));
  }
  return flattenAdminItems(entry.container.items).filter((item) => !item.viewName.startsWith('CustomComponent/') && hasAdminObjectPermission(schema, access, item.viewName, 'Get')).length;
}

function visualFor(name: string, layout: LayoutName): { symbol: SettingsSymbol; tone: SettingsTone } {
  const value = name.toLowerCase();
  if (value.includes('dashboard')) return { symbol: 'chart.xyaxis.line', tone: 'blue' };
  if (value.includes('directory') || value.includes('credential')) return { symbol: 'person.2.fill', tone: 'blue' };
  if (value.includes('domain') || value.includes('network')) return { symbol: 'globe', tone: 'green' };
  if (value.includes('email') || value.includes('mailbox') || value.includes('sieve')) return { symbol: 'envelope.fill', tone: 'blue' };
  if (value.includes('report') || value.includes('observability') || value.includes('telemetry')) return { symbol: 'waveform.path.ecg', tone: 'orange' };
  if (value.includes('task') || value.includes('action')) return { symbol: 'bolt.fill', tone: 'orange' };
  if (value.includes('security') || value.includes('tls') || value.includes('authentication')) return { symbol: 'lock.shield.fill', tone: 'red' };
  if (value.includes('storage') || value.includes('file')) return { symbol: 'internaldrive.fill', tone: 'gray' };
  if (value.includes('calendar') || value.includes('contact')) return { symbol: 'calendar', tone: 'red' };
  if (value.includes('spam')) return { symbol: 'exclamationmark.shield.fill', tone: 'orange' };
  if (value.includes('search') || value.includes('lookup')) return { symbol: 'magnifyingglass', tone: 'gray' };
  if (value.includes('ai')) return { symbol: 'sparkles', tone: 'purple' };
  if (value.includes('cluster')) return { symbol: 'server.rack', tone: 'teal' };
  if (layout === 'Account') return { symbol: 'person.crop.circle.fill', tone: 'gray' };
  return { symbol: 'gearshape.fill', tone: 'gray' };
}

function safeHost(value: string) {
  try { return new URL(value).host; } catch { return value; }
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 48 },
  loading: { marginVertical: 36 },
  notice: { borderRadius: 16, padding: 18, marginTop: 24, gap: 6 },
  footer: { marginHorizontal: 14, marginTop: 12, lineHeight: 18, textAlign: 'center' }
});
