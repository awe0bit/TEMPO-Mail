import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, List, Text, useTheme } from 'react-native-paper';
import { fetchAdminSchema } from '@/api/admin';
import { adminZh, flattenAdminItems, hasAdminObjectPermission } from '@/admin/schema';
import { useAppState } from '@/state/app-state';

export default function SettingsCategoryScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ layout: string; index: string; title: string }>();
  const { selected, password, access } = useAppState();
  const schema = useQuery({ queryKey: ['admin-schema', selected?.id], enabled: Boolean(selected), staleTime: 10 * 60_000, queryFn: async () => fetchAdminSchema(selected!, await password()) });
  const layout = schema.data?.layouts.find((item) => item.name === params.layout);
  const entry = layout?.items[Number(params.index)];
  const links = entry && 'container' in entry ? flattenAdminItems(entry.container.items).filter((item) => schema.data && hasAdminObjectPermission(schema.data, access, item.viewName, 'Get')) : [];
  return <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
    <Stack.Screen options={{ title: params.title || '设置分类', headerShadowVisible: false }} />
    {schema.isLoading ? <ActivityIndicator style={styles.loading} /> : <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
        {links.map((item, index) => <View key={`${item.viewName}-${index}`}>{index > 0 && <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />}<List.Item title={adminZh(item.name)} description={item.parents.map(adminZh).join(' · ') || undefined} left={(props) => <List.Icon {...props} icon="tune-variant" />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={() => router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: item.viewName, title: adminZh(item.name) } } as never)} /></View>)}
      </View>
      {!links.length && <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>当前账户没有可查看的设置</Text>}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1 }, loading: { marginTop: 100 }, content: { padding: 16, paddingBottom: 40 }, group: { borderRadius: 22, overflow: 'hidden' }, separator: { height: StyleSheet.hairlineWidth, marginLeft: 64 }, empty: { padding: 50, textAlign: 'center' } });
