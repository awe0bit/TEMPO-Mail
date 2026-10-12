import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { fetchAdminOverview, type AdminMetric, type AdminOverview } from '@/api/admin';
import { AccountMenu } from '@/components/AccountMenu';
import { SettingsDivider, SettingsGroup, SettingsRow, SettingsSectionTitle } from '@/components/SettingsList';
import { useAppState } from '@/state/app-state';

const previewOverview: AdminOverview = {
  accounts: 18, domains: 2, queued: 1, failedTasks: 0, blockedIps: 7,
  metricsAvailable: true,
  metrics: [
    { '@type': 'Counter', metric: 'queue.message-queued', count: 126 },
    { '@type': 'Counter', metric: 'queue.authenticated-message-queued', count: 48 },
    { '@type': 'Counter', metric: 'auth.failed', count: 3 },
    { '@type': 'Counter', metric: 'message-ingest.spam', count: 11 }
  ]
};

const metricValue = (metrics: AdminMetric[], names: string[]) => metrics
  .filter((metric) => names.includes(metric.metric))
  .reduce((sum, metric) => sum + (metric['@type'] === 'Histogram' && metric.sum !== undefined ? metric.sum : metric.count), 0);

export default function OverviewScreen() {
  const theme = useTheme();
  const { selected, password, preview, access } = useAppState();
  const overview = useQuery({
    queryKey: ['admin-overview', selected?.id, preview],
    enabled: Boolean(selected),
    refetchInterval: preview ? false : 60_000,
    queryFn: async () => preview ? previewOverview : fetchAdminOverview(selected!, await password())
  });
  const data = overview.data;
  const received = data ? metricValue(data.metrics, ['queue.message-queued']) : 0;
  const sent = data ? metricValue(data.metrics, ['queue.authenticated-message-queued', 'queue.dsn-queued', 'queue.report-queued']) : 0;
  const authFailures = data ? metricValue(data.metrics, ['auth.failed']) : 0;
  const spam = data ? metricValue(data.metrics, ['message-ingest.spam']) : 0;

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: '概览', headerShadowVisible: false, headerLeft: () => <AccountMenu /> }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={overview.isRefetching} onRefresh={() => overview.refetch()} />}
      >
        <View style={styles.heading}>
          <Text variant="headlineMedium" style={styles.title}>服务器运行概览</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {preview ? '本地预览数据' : `${new URL(selected?.sessionUrl ?? 'https://localhost').host} · ${access?.edition ?? 'Stalwart'}`}
          </Text>
        </View>

        {overview.isLoading ? <ActivityIndicator style={styles.loading} /> : overview.error ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium">无法读取服务器概览</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{overview.error instanceof Error ? overview.error.message : '未知错误'}</Text>
          </View>
        ) : data ? <>
          <SettingsSectionTitle>当前状态</SettingsSectionTitle>
          <View style={[styles.metricGroup, { backgroundColor: theme.colors.surface }]}>
            <Metric value={data.accounts} label="邮箱账户" />
            <Divider />
            <Metric value={data.domains} label="托管域名" />
            <Divider />
            <Metric value={data.queued} label="待投递" warning={data.queued > 0} />
          </View>

          {data.metricsAvailable ? <>
            <SettingsSectionTitle>过去 24 小时</SettingsSectionTitle>
            <View style={[styles.twoColumn, { backgroundColor: theme.colors.surface }]}>
              <MiniMetric label="收到邮件" value={received} />
              <MiniMetric label="发送邮件" value={sent} />
              <MiniMetric label="认证失败" value={authFailures} warning={authFailures > 0} />
              <MiniMetric label="拦截垃圾邮件" value={spam} />
            </View>
          </> : <View style={[styles.editionNotice, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleSmall">当前为 Stalwart Community</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>实时与历史指标属于 Enterprise 功能；概览仅展示当前可验证的服务器数据，不会用零值冒充统计。</Text>
          </View>}

          <SettingsSectionTitle>需要关注</SettingsSectionTitle>
          <SettingsGroup>
            <SettingsRow title="投递队列" description={data.queued ? `${data.queued} 封邮件等待投递` : '队列正常'} value={String(data.queued)} symbol="paperplane.fill" tone="orange" onPress={() => router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: 'x:QueuedMessage', title: '待投递队列' } } as never)} />
            <SettingsDivider />
            <SettingsRow title="失败任务" description={data.failedTasks ? `${data.failedTasks} 个任务需要处理` : '没有失败任务'} value={String(data.failedTasks)} symbol="exclamationmark.triangle.fill" tone="red" onPress={() => router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: 'x:Task/TaskFailed', title: '失败任务' } } as never)} />
            <SettingsDivider />
            <SettingsRow title="已封禁 IP" description={`${data.blockedIps} 条安全规则`} value={String(data.blockedIps)} symbol="hand.raised.fill" tone="red" onPress={() => router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: 'x:BlockedIp', title: '已封禁 IP' } } as never)} />
          </SettingsGroup>
        </> : null}
      </ScrollView>
    </View>
  );
}

function Metric({ value, label, warning = false }: { value: number; label: string; warning?: boolean }) {
  const theme = useTheme();
  return <View style={styles.metric}><Text variant="headlineLarge" style={[styles.metricValue, warning && { color: theme.colors.error }]}>{value.toLocaleString()}</Text><Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text></View>;
}

function MiniMetric({ value, label, warning = false }: { value: number; label: string; warning?: boolean }) {
  const theme = useTheme();
  return <View style={[styles.miniMetric, { borderColor: theme.colors.outlineVariant }]}><Text variant="headlineSmall" style={[styles.miniValue, warning && { color: theme.colors.error }]}>{value.toLocaleString()}</Text><Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text></View>;
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.verticalDivider, { backgroundColor: theme.colors.outlineVariant }]} />;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  heading: { paddingHorizontal: 8, marginBottom: 10, gap: 4 },
  title: { fontWeight: '700', fontSize: 28, lineHeight: 34, letterSpacing: -0.7 },
  loading: { marginTop: 80 },
  notice: { borderRadius: 16, padding: 18, gap: 6 },
  metricGroup: { minHeight: 110, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: 4 },
  metricValue: { fontWeight: '700', letterSpacing: -1 },
  verticalDivider: { width: StyleSheet.hairlineWidth, height: 58 },
  twoColumn: { borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  miniMetric: { width: '50%', minHeight: 94, padding: 18, justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, gap: 3 },
  miniValue: { fontWeight: '700', letterSpacing: -0.5 },
  editionNotice: { borderRadius: 16, padding: 16, gap: 5, marginTop: 18 }
});
