import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Stack, router } from 'expo-router';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { fetchAdminSchema } from '@/api/admin';
import { adminFeatureGroups, collectAdminFeatures, type AdminFeatureGroupKey } from '@/admin/navigation';
import { AccountMenu } from '@/components/AccountMenu';
import { MotionView } from '@/components/Motion';
import {
  SettingsDivider, SettingsGroup, SettingsRow, SettingsSectionTitle,
  type SettingsSymbol, type SettingsTone
} from '@/components/SettingsList';
import { useAppState } from '@/state/app-state';

export default function SettingsScreen() {
  const theme = useTheme();
  const { selected, password, preview, access, admin, remove, interactive } = useAppState();
  const schema = useQuery({
    queryKey: ['admin-schema', selected?.id],
    enabled: Boolean(selected) && interactive && !preview,
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

  const openGroup = (group: AdminFeatureGroupKey, title: string) => {
    router.push({
      pathname: '/(tabs)/settings/category' as never,
      params: { group, title }
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

      {preview ? <MotionView distance={7}><PreviewSettings openResource={openResource} /></MotionView> : schema.isLoading ? <ActivityIndicator style={styles.loading} /> : schema.error ? (
        <MotionView distance={7} style={[styles.notice, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium">无法读取服务器功能</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{schema.error instanceof Error ? schema.error.message : '服务器设置加载失败'}</Text>
          <SettingsRow title="重新读取" description="重新验证管理员权限与服务器配置" symbol="arrow.triangle.2.circlepath" tone="blue" onPress={() => schema.refetch()} />
        </MotionView>
      ) : schema.data ? <MotionView distance={7}>
        <ServerFeatureGroups schema={schema.data} access={access} admin={admin} onOpen={openGroup} />
      </MotionView> : null}

      <SettingsSectionTitle>客户端</SettingsSectionTitle>
      <SettingsGroup>
        <SettingsRow title="TEMPO Mail" description={`JMAP · 兼容版本 ${String(Updates.runtimeVersion || 'native-2')}`} value={`v${Constants.expoConfig?.version || '—'}`} symbol="info.circle.fill" tone="blue" />
      </SettingsGroup>

      <SettingsSectionTitle>本机账户</SettingsSectionTitle>
      <SettingsGroup>
        <SettingsRow title={preview ? '退出预览' : '移除此账户'} description={preview ? '返回登录与服务器选择页面' : '只删除本机凭据，不删除服务器邮箱'} symbol="rectangle.portrait.and.arrow.right" tone="red" destructive onPress={deleteLocal} />
      </SettingsGroup>
    </ScrollView>
  </View>;
}

const groupVisuals: Record<AdminFeatureGroupKey, { symbol: SettingsSymbol; tone: SettingsTone }> = {
  accounts: { symbol: 'person.2.fill', tone: 'blue' },
  delivery: { symbol: 'paperplane.fill', tone: 'orange' },
  security: { symbol: 'lock.shield.fill', tone: 'red' },
  diagnostics: { symbol: 'waveform.path.ecg', tone: 'purple' }
};

function ServerFeatureGroups({ schema, access, admin, onOpen }: {
  schema: Parameters<typeof collectAdminFeatures>[0];
  access: Parameters<typeof collectAdminFeatures>[1];
  admin: boolean;
  onOpen(group: AdminFeatureGroupKey, title: string): void;
}) {
  const features = collectAdminFeatures(schema, access);
  const groups = adminFeatureGroups.filter((group) => (features.get(group.key)?.length ?? 0) > 0);
  if (!groups.length) return null;
  return <>
    <SettingsSectionTitle>{admin ? '服务器管理' : '邮箱设置'}</SettingsSectionTitle>
    <SettingsGroup>
      {groups.map((group, index) => <View key={group.key}>
        {index > 0 ? <SettingsDivider /> : null}
        <SettingsRow
          title={group.title}
          description={group.description}
          value={String(features.get(group.key)?.length ?? 0)}
          {...groupVisuals[group.key]}
          onPress={() => onOpen(group.key, group.title)}
        />
      </View>)}
    </SettingsGroup>
  </>;
}

function PreviewSettings({ openResource }: { openResource(view: string, title: string): void }) {
  const management: { title: string; description: string; view: string; symbol: SettingsSymbol; tone: SettingsTone }[] = [
    { title: '账户与身份', description: '账户、地址与封禁状态', view: 'x:Account/User', symbol: 'person.2.fill', tone: 'blue' },
    { title: '域名与身份', description: '托管域名、DKIM 与 DNS', view: 'x:Domain', symbol: 'globe', tone: 'green' },
    { title: '邮件与投递', description: '队列、路由与投递状态', view: 'x:QueuedMessage', symbol: 'paperplane.fill', tone: 'orange' },
    { title: '安全与访问', description: '封禁与允许的网络地址', view: 'x:BlockedIp', symbol: 'lock.shield.fill', tone: 'red' },
    { title: '诊断与维护', description: '后台任务与运行诊断', view: 'x:Task', symbol: 'waveform.path.ecg', tone: 'purple' }
  ];
  return <>
    <SettingsSectionTitle>服务器管理</SettingsSectionTitle>
    <SettingsGroup>{management.map((item, index) => <View key={item.view}>{index > 0 ? <SettingsDivider /> : null}<SettingsRow {...item} onPress={() => openResource(item.view, item.title)} /></View>)}</SettingsGroup>
  </>;
}

function safeHost(value: string) {
  try { return new URL(value).host; } catch { return value; }
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 48 },
  loading: { marginVertical: 36 },
  notice: { borderRadius: 16, padding: 18, marginTop: 24, gap: 6 }
});
