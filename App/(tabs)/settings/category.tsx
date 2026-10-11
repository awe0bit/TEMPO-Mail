import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { fetchAdminSchema } from '@/api/admin';
import { adminZh, flattenAdminItems, hasAdminObjectPermission } from '@/admin/schema';
import { SettingsDivider, SettingsGroup, SettingsRow } from '@/components/SettingsList';
import { useAppState } from '@/state/app-state';

export default function SettingsCategoryScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ layout: string; index: string; title: string }>();
  const { selected, password, access } = useAppState();
  const schema = useQuery({ queryKey: ['admin-schema', selected?.id], enabled: Boolean(selected), staleTime: 10 * 60_000, queryFn: async () => fetchAdminSchema(selected!, await password()) });
  const layout = schema.data?.layouts.find((item) => item.name === params.layout);
  const entry = layout?.items[Number(params.index)];
  const links = entry && 'container' in entry
    ? flattenAdminItems(entry.container.items).filter((item) => schema.data && !item.viewName.startsWith('CustomComponent/') && hasAdminObjectPermission(schema.data, access, item.viewName, 'Get'))
    : [];

  const open = (viewName: string, title: string) => {
    if (viewName === 'x:Account/User') return router.push('/(tabs)/settings/accounts' as never);
    router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: viewName, title } } as never);
  };

  return <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
    <Stack.Screen options={{ title: params.title || '设置分类', headerShadowVisible: false }} />
    {schema.isLoading ? <ActivityIndicator style={styles.loading} /> : <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      {links.length ? <SettingsGroup>
        {links.map((item, index) => <View key={`${item.viewName}-${index}`}>
          {index > 0 ? <SettingsDivider /> : null}
          <SettingsRow title={adminZh(item.name)} description={item.parents.map(adminZh).join(' · ') || undefined} symbol={symbolFor(item.viewName)} tone={toneFor(item.viewName)} onPress={() => open(item.viewName, adminZh(item.name))} />
        </View>)}
      </SettingsGroup> : <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>当前账户没有可用功能</Text>}
    </ScrollView>}
  </View>;
}

const symbolFor = (view: string) => {
  if (view.includes('Account') || view.includes('Role') || view.includes('Tenant')) return 'person.crop.circle.fill' as const;
  if (view.includes('Domain') || view.includes('Dns')) return 'globe' as const;
  if (view.includes('Certificate') || view.includes('Security') || view.includes('Ip')) return 'lock.shield.fill' as const;
  if (view.includes('Queue') || view.includes('Mta') || view.includes('Email')) return 'envelope.fill' as const;
  if (view.includes('Log') || view.includes('Trace') || view.includes('Metric')) return 'waveform.path.ecg' as const;
  if (view.includes('Task')) return 'clock.arrow.circlepath' as const;
  if (view.includes('Store') || view.includes('Storage')) return 'internaldrive.fill' as const;
  return 'gearshape.fill' as const;
};

const toneFor = (view: string) => view.includes('Security') || view.includes('Blocked') ? 'red' as const : view.includes('Task') || view.includes('Queue') ? 'orange' as const : view.includes('Domain') || view.includes('Dns') ? 'green' as const : 'blue' as const;

const styles = StyleSheet.create({
  page: { flex: 1 },
  loading: { marginTop: 100 },
  content: { padding: 16, paddingBottom: 40 },
  empty: { padding: 50, textAlign: 'center' }
});
