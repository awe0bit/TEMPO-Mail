import { Button as NativeButton, Host, Menu as NativeMenu } from '@expo/ui/swift-ui';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, List, Text, useTheme } from 'react-native-paper';
import { fetchAdminSchema, queryAdminResource, setAdminResource } from '@/api/admin';
import { adminZh, hasAdminObjectPermission, resolveAdminList, type AdminListAction } from '@/admin/schema';
import { NativeGlassButton, NativeGlassIconButton } from '@/components/NativeControls';
import { SettingsChevron, SettingsIcon } from '@/components/SettingsList';
import { useAppState } from '@/state/app-state';

const previewData: Record<string, Record<string, unknown>[]> = {
  'x:Domain': [{ id: 'd1', name: 'preview.local', isEnabled: true, certificateManagement: 'Automatic', dnsManagement: 'Manual' }],
  'x:QueuedMessage': [{ id: 'q1', returnPath: 'sender@example.net', nextRetry: new Date(Date.now() + 600000).toISOString(), createdAt: new Date().toISOString(), size: 28416 }],
  'x:Log': [{ id: 'l1', timestamp: new Date().toISOString(), level: 'Info', event: 'server.startup', details: 'TEMPO Mail 预览日志' }],
  'x:Task': [{ id: 't1', '@type': 'AccountMaintenance', due: new Date().toISOString(), status: 'Pending' }],
  'x:Task/TaskFailed': [],
  'x:BlockedIp': [{ id: 'b1', address: '203.0.113.0/24', reason: 'Repeated authentication failures', createdAt: new Date().toISOString() }],
  'x:AllowedIp': [{ id: 'a1', address: '192.0.2.10', reason: 'Office gateway', createdAt: new Date().toISOString() }]
};

const valueText = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString('zh-CN');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const isSummaryValue = (value: unknown) => ['string', 'number', 'boolean'].includes(typeof value);

const visualFor = (view: string) => {
  if (/Account|Role|Tenant|Directory/i.test(view)) return { symbol: 'person.2.fill' as const, tone: 'blue' as const };
  if (/Domain|Dns|Dkim/i.test(view)) return { symbol: 'globe' as const, tone: 'green' as const };
  if (/Blocked|Allowed|Security|Certificate|Tls|Auth/i.test(view)) return { symbol: 'lock.shield.fill' as const, tone: 'red' as const };
  if (/Queue|Mta|Email|Mail|Route/i.test(view)) return { symbol: 'paperplane.fill' as const, tone: 'orange' as const };
  if (/Log|Trace|Metric|Task/i.test(view)) return { symbol: 'waveform.path.ecg' as const, tone: 'purple' as const };
  return { symbol: 'server.rack' as const, tone: 'teal' as const };
};

export default function AdminResourceScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ view: string; title?: string; filterField?: string; filterValue?: string }>();
  const viewName = params.view;
  const title = params.title || adminZh(viewName?.replace(/^x:/, '') || '管理对象');
  const { selected, password, preview, access } = useAppState();
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const schema = useQuery({
    queryKey: ['admin-schema', selected?.id], enabled: Boolean(selected) && !preview, staleTime: 10 * 60_000,
    queryFn: async () => fetchAdminSchema(selected!, await password())
  });
  const listDefinition = schema.data ? resolveAdminList(schema.data, viewName) : null;
  const resource = useQuery({
    queryKey: ['admin-resource', selected?.id, viewName, search, params.filterField, params.filterValue, preview],
    enabled: Boolean(selected) && Boolean(viewName) && (preview || Boolean(schema.data)),
    queryFn: async () => {
      if (preview) return { list: previewData[viewName] ?? [], total: (previewData[viewName] ?? []).length };
      const filter = params.filterField && params.filterValue ? { [params.filterField]: params.filterValue } : undefined;
      return queryAdminResource(selected!, await password(), schema.data!, viewName, { search, filter });
    }
  });
  const canCreate = Boolean(schema.data && hasAdminObjectPermission(schema.data, access, viewName, 'Create'));
  const canUpdate = Boolean(schema.data && hasAdminObjectPermission(schema.data, access, viewName, 'Update'));
  const columns = listDefinition?.columns ?? Object.keys(resource.data?.list?.[0] ?? {}).filter((key) => key !== 'id').slice(0, 4).map((name) => ({ name, label: name }));
  const labelProperty = listDefinition?.labelProperty ?? columns[0]?.name ?? 'id';
  const visual = visualFor(viewName);

  const mutate = async (operation: { update?: Record<string, Record<string, unknown>>; destroy?: string[] }) => {
    if (preview) { Alert.alert('预览模式', '预览不会修改服务器数据。'); return; }
    try {
      await setAdminResource(selected!, await password(), schema.data!, viewName, operation);
      await queryClient.invalidateQueries({ queryKey: ['admin-resource', selected?.id, viewName] });
      setSelectedItem(null);
    } catch (reason) {
      Alert.alert('操作失败', reason instanceof Error ? reason.message : '未知错误');
    }
  };

  const runAction = (action: AdminListAction, item: Record<string, unknown>) => {
    const id = String(item.id);
    if (action.type === 'setProperty') void mutate({ update: { [id]: action.properties } });
    if (action.type === 'delete') Alert.alert(action.label, '这个操作会立即写入服务器。', [{ text: '取消', style: 'cancel' }, { text: '确认', style: 'destructive', onPress: () => void mutate({ destroy: [id] }) }]);
    if (action.type === 'query') router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: action.objectName, title: adminZh(action.label), filterField: action.fieldName, filterValue: id } } as never);
    if (action.type === 'view') router.push({ pathname: '/(tabs)/settings/resource' as never, params: { view: action.objectName, title: adminZh(action.label), filterField: 'id', filterValue: id } } as never);
  };

  return (
    <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{
        title, headerShadowVisible: false,
        headerSearchBarOptions: { placeholder: `搜索${title}`, hideWhenScrolling: true, onChangeText: (event) => setSearch(event.nativeEvent.text) },
        headerRight: canCreate ? () => <Host matchContents><NativeButton label="添加" systemImage="plus" onPress={() => router.push({ pathname: '/(tabs)/settings/editor' as never, params: { view: viewName, title: `添加${title}` } } as never)} /></Host> : undefined
      }} />
      {(schema.isLoading || resource.isLoading) ? <ActivityIndicator style={styles.loading} /> : resource.error ? (
        <View style={styles.empty}><Text variant="titleMedium">加载失败</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>{resource.error instanceof Error ? resource.error.message : '未知错误'}</Text></View>
      ) : <FlashList<Record<string, unknown>>
        data={(resource.data?.list ?? []) as Record<string, unknown>[]}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={resource.isRefetching} onRefresh={() => resource.refetch()} />}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />}
        ListHeaderComponent={<Text style={[styles.total, { color: theme.colors.onSurfaceVariant }]}>{resource.data?.total ?? 0} 项</Text>}
        ListEmptyComponent={<View style={styles.empty}><Text variant="titleMedium">暂无数据</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>服务器当前没有此类项目</Text></View>}
        renderItem={({ item, index }) => {
          const secondary = columns
            .filter((column) => column.name !== labelProperty && isSummaryValue(item[column.name]))
            .slice(0, 2)
            .map((column) => `${adminZh(column.label)}：${valueText(item[column.name])}`)
            .join(' · ');
          const isFirst = index === 0;
          const isLast = index === (resource.data?.list.length ?? 0) - 1;
          return <List.Item
            style={[styles.row, { backgroundColor: theme.colors.surface }, isFirst && styles.firstRow, isLast && styles.lastRow]}
            title={valueText(item[labelProperty])}
            description={secondary || undefined}
            titleNumberOfLines={1}
            descriptionNumberOfLines={2}
            left={() => <View style={styles.rowIcon}><SettingsIcon {...visual} /></View>}
            onPress={() => canUpdate
              ? router.push({ pathname: '/(tabs)/settings/editor' as never, params: { view: viewName, id: String(item.id), title: `编辑${title}` } } as never)
              : setSelectedItem(item)}
            right={() => listDefinition?.itemActions?.length ? <ActionMenu actions={listDefinition.itemActions} onAction={(action) => runAction(action, item)} /> : <View style={styles.rowChevron}><SettingsChevron /></View>}
          />;
        }}
      />}

      <Modal visible={Boolean(selectedItem)} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setSelectedItem(null)} />
          <View style={[styles.sheet, { backgroundColor: theme.colors.elevation.level2 }]}>
            <View style={styles.sheetHeader}><Text variant="headlineSmall" style={styles.sheetTitle}>{selectedItem ? valueText(selectedItem[labelProperty]) : title}</Text><NativeGlassIconButton label="关闭" systemImage="xmark" size={44} onPress={() => setSelectedItem(null)} /></View>
            <ScrollView contentContainerStyle={styles.details}>
              <View style={[styles.detailGroup, { backgroundColor: theme.colors.surface }]}>
                {selectedItem && Object.entries(selectedItem).filter(([key]) => key !== 'id').map(([key, value], index) => <View key={key}>
                  {index > 0 ? <View style={[styles.detailDivider, { backgroundColor: theme.colors.outlineVariant }]} /> : null}
                  <View style={styles.detailRow}><Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{adminZh(columns.find((column) => column.name === key)?.label ?? key)}</Text><Text variant="bodyMedium" selectable>{valueText(value)}</Text></View>
                </View>)}
              </View>
            </ScrollView>
            {canUpdate && selectedItem && <NativeGlassButton prominent wide label="编辑" systemImage="pencil" onPress={() => router.push({ pathname: '/(tabs)/settings/editor' as never, params: { view: viewName, id: String(selectedItem.id), title: `编辑${title}` } } as never)} />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionMenu({ actions, onAction }: { actions: AdminListAction[]; onAction(action: AdminListAction): void }) {
  const visible = useMemo(() => actions.filter((action) => action.type !== 'separator'), [actions]);
  return <Host matchContents><NativeMenu label="" systemImage="ellipsis.circle">{visible.map((action, index) => <NativeButton key={`${action.label}-${index}`} label={adminZh(action.label)} systemImage={action.type === 'delete' ? 'trash' : action.type === 'setProperty' ? 'bolt' : 'arrow.right'} role={action.type === 'delete' ? 'destructive' : undefined} onPress={() => onAction(action)} />)}</NativeMenu></Host>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  loading: { marginTop: 100 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  total: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 7 },
  row: { minHeight: 64, paddingHorizontal: 2, paddingVertical: 2 },
  firstRow: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  lastRow: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  rowIcon: { width: 48, alignItems: 'center', justifyContent: 'center' },
  rowChevron: { justifyContent: 'center', paddingRight: 10 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  empty: { alignItems: 'center', padding: 60, gap: 6 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  sheet: { maxHeight: '82%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: -8 } },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 },
  sheetTitle: { flex: 1, fontWeight: '700', letterSpacing: -0.4 },
  details: { paddingBottom: 20 },
  detailGroup: { borderRadius: 16, overflow: 'hidden' },
  detailRow: { gap: 5, paddingHorizontal: 16, paddingVertical: 13 },
  detailDivider: { height: StyleSheet.hairlineWidth, marginLeft: 16 }
});
