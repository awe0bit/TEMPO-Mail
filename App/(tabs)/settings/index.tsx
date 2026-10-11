import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, List, Text, useTheme } from 'react-native-paper';
import { fetchAdminSchema } from '@/api/admin';
import { adminZh, flattenAdminItems, hasAdminObjectPermission, type AdminLayout } from '@/admin/schema';
import { AccountMenu } from '@/components/AccountMenu';
import { NativeGlassButton, NativeSegmentedControl } from '@/components/NativeControls';
import { useAppState } from '@/state/app-state';

type Section = 'management' | 'server' | 'account';

const layoutName: Record<Section, string> = { management: 'Management', server: 'Settings', account: 'Account' };
const sectionTitle: Record<Section, string> = { management: '日常管理', server: '服务器配置', account: '账户与客户端' };

export default function SettingsScreen() {
  const theme = useTheme();
  const { selected, password, preview, access, admin, remove } = useAppState();
  const temporaryAvailable = preview || access?.edition === 'enterprise';
  const [section, setSection] = useState<Section>(admin ? 'management' : 'account');
  useEffect(() => { if (!admin && section !== 'account') setSection('account'); }, [admin, section]);
  const schema = useQuery({
    queryKey: ['admin-schema', selected?.id], enabled: Boolean(selected) && !preview, staleTime: 10 * 60_000,
    queryFn: async () => fetchAdminSchema(selected!, await password())
  });
  const layout = schema.data?.layouts.find((item) => item.name === layoutName[section]);

  const deleteLocal = () => selected && Alert.alert(preview ? '退出预览？' : '移除本机账户？', selected.email, [
    { text: '取消', style: 'cancel' },
    { text: preview ? '退出' : '移除', style: 'destructive', onPress: async () => { await remove(selected.id); router.replace('/'); } }
  ]);

  const openResource = (viewName: string, title: string) => {
    if (viewName === 'x:Account/User') return router.push('/(tabs)/settings/accounts' as never);
    router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: viewName, title } } as never);
  };

  const openEntry = (entry: AdminLayout['items'][number], index: number) => {
    if ('link' in entry) return openResource(entry.link.viewName, adminZh(entry.link.name));
    router.push({ pathname: '/(tabs)/settings/category' as never, params: { layout: layoutName[section], index: String(index), title: adminZh(entry.container.name) } } as never);
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: '设置', headerShadowVisible: false, headerLeft: () => <AccountMenu /> }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={schema.isRefetching} onRefresh={() => schema.refetch()} />}>
        <View style={styles.heading}>
          <Text variant="headlineMedium" style={styles.title}>{sectionTitle[section]}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{admin ? '管理员功能与服务器配置集中在这里。' : '管理当前邮箱账户与客户端。'}</Text>
        </View>

        {admin && <NativeSegmentedControl value={section} onChange={(value) => setSection(value as Section)} options={[{ value: 'management', label: '管理' }, { value: 'server', label: '服务器' }, { value: 'account', label: '账户' }]} />}

        {section === 'management' && <>
          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>常用</Text>
          <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
            <Row title="账户与封禁" description="创建、封禁、恢复或删除邮箱账户" icon="account-multiple-outline" onPress={() => router.push('/(tabs)/settings/accounts' as never)} />
            <Separator />
            {temporaryAvailable
              ? <Row title="临时邮箱" description="创建和停用临时地址" icon="email-lock-outline" onPress={() => router.push({ pathname: '/(tabs)/settings/accounts' as never, params: { section: 'temporary' } } as never)} />
              : <List.Item title="临时邮箱" description="当前 Stalwart Community 不提供此 Enterprise 功能" left={(props) => <List.Icon {...props} icon="lock-outline" />} />}
            <Separator />
            <Row title="域名" description="域名、DKIM、证书与 DNS" icon="web" onPress={() => openResource('x:Domain', '域名')} />
            <Separator />
            <Row title="投递队列" description="查看、重试或取消投递" icon="email-fast-outline" onPress={() => openResource('x:QueuedMessage', '投递队列')} />
          </View>
        </>}

        {schema.isLoading && !preview ? <ActivityIndicator style={styles.loading} /> : schema.error ? (
          <Text style={[styles.error, { color: theme.colors.error }]}>{schema.error instanceof Error ? schema.error.message : '服务器设置加载失败'}</Text>
        ) : preview ? <PreviewEntries section={section} onOpen={openResource} /> : layout ? <>
          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>{section === 'management' ? '全部管理工具' : section === 'server' ? '配置分类' : '账户功能'}</Text>
          <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
            {layout.items.map((entry, index) => {
              const link = 'link' in entry ? entry.link : null;
              const container = 'container' in entry ? entry.container : null;
              const visibleLinks = link
                ? Number(Boolean(schema.data && hasAdminObjectPermission(schema.data, access, link.viewName, 'Get')))
                : container
                  ? flattenAdminItems(container.items).filter((item) => schema.data && hasAdminObjectPermission(schema.data, access, item.viewName, 'Get')).length
                  : 0;
              if (!visibleLinks || link?.viewName.startsWith('CustomComponent/')) return null;
              const name = adminZh(link?.name ?? container?.name ?? '设置');
              const description = link ? undefined : `${visibleLinks} 项设置`;
              return <View key={`${name}-${index}`}>{index > 0 && <Separator />}<Row title={name} description={description} icon={iconFor(name, section)} onPress={() => openEntry(entry, index)} /></View>;
            })}
          </View>
        </> : null}

        {section === 'account' && <>
          <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>客户端</Text>
          <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
            <List.Item title="邮件协议" description="JMAP" left={(props) => <List.Icon {...props} icon="server-outline" />} />
            <Separator />
            <List.Item title="原生兼容版本" description={String(Updates.runtimeVersion || 'native-1')} left={(props) => <List.Icon {...props} icon="update" />} />
            <Separator />
            <List.Item title="App 版本" description={Constants.expoConfig?.version || '—'} left={(props) => <List.Icon {...props} icon="information-outline" />} />
          </View>
          <NativeGlassButton label={preview ? '退出预览' : '移除此账户'} onPress={deleteLocal} style={styles.remove} />
        </>}
      </ScrollView>
    </View>
  );
}

function PreviewEntries({ section, onOpen }: { section: Section; onOpen(view: string, title: string): void }) {
  const theme = useTheme();
  const items = section === 'management'
    ? [['服务器日志', 'x:Log'], ['后台任务', 'x:Task'], ['已封禁 IP', 'x:BlockedIp'], ['允许的 IP', 'x:AllowedIp']]
    : section === 'server'
      ? [['网络', 'x:SystemSettings/NetworkSettings'], ['身份验证', 'x:Authentication'], ['TLS 证书', 'x:Certificate'], ['垃圾邮件过滤', 'x:SpamSettings']]
      : [['账户设置', 'x:AccountSettings'], ['应用密码', 'x:AppPassword'], ['自动回复', 'VacationResponse'], ['临时邮箱', 'x:MaskedEmail']];
  return <><Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>预览项目</Text><View style={[styles.group, { backgroundColor: theme.colors.surface }]}>{items.map(([title, view], index) => <View key={view}>{index > 0 && <Separator />}<Row title={title} icon="server-outline" onPress={() => onOpen(view, title)} /></View>)}</View></>;
}

function Row({ title, description, icon, onPress }: { title: string; description?: string; icon: string; onPress(): void }) {
  return <List.Item title={title} description={description} left={(props) => <List.Icon {...props} icon={icon} />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={onPress} />;
}

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />;
}

const iconFor = (name: string, section: Section) => {
  if (name.includes('账户') || name.includes('凭据')) return 'account-cog-outline';
  if (name.includes('安全') || name.includes('认证') || name.includes('TLS')) return 'shield-lock-outline';
  if (name.includes('邮件') || name.includes('投递')) return 'email-outline';
  if (name.includes('监控') || name.includes('日志')) return 'chart-timeline-variant';
  if (section === 'server') return 'server-cog-outline';
  return 'folder-cog-outline';
};

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 44 },
  heading: { paddingHorizontal: 8, marginBottom: 14, gap: 5 },
  title: { fontWeight: '700', letterSpacing: -0.6 },
  sectionLabel: { marginHorizontal: 8, marginTop: 20, marginBottom: 8 },
  group: { borderRadius: 22, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  loading: { marginVertical: 30 },
  error: { margin: 24, textAlign: 'center' },
  remove: { marginTop: 22 }
});
