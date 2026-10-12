import { FlashList } from '@shopify/flash-list';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MotionView } from '@/components/Motion';
import type { MailItem } from '@/types';

type Props = {
  data: MailItem[];
  refreshing: boolean;
  onRefresh(): void;
  emptyTitle: string;
  emptyDetail?: string;
  error?: string;
  onOpen?(item: MailItem): void;
};

function displayTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function MailList({ data, refreshing, onRefresh, emptyTitle, emptyDetail, error, onOpen }: Props) {
  const theme = useTheme();

  return (
    <FlashList
      data={data}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.onSurfaceVariant} />}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />}
      ListEmptyComponent={refreshing ? <ActivityIndicator style={styles.loading} /> : (
        <MotionView style={styles.empty} distance={6} duration={220}>
          <Text variant="titleMedium">{error ? '无法载入邮件' : emptyTitle}</Text>
          <Text variant="bodyMedium" style={[styles.emptyDetail, { color: theme.colors.onSurfaceVariant }]}>{error || emptyDetail}</Text>
        </MotionView>
      )}
      renderItem={({ item, index }) => {
        const sender = item.from?.[0]?.name || item.from?.[0]?.email || '未知发件人';
        const initial = sender.trim().slice(0, 1).toUpperCase() || '·';
        const unread = !item.keywords?.['$seen'];
        return (
          <MotionView distance={6} duration={220} delay={Math.min(index * 28, 168)}>
            <Pressable onPress={() => onOpen?.(item)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>{initial}</Text>
              </View>
              <View style={styles.body}>
                <View style={styles.heading}>
                  <Text variant="titleSmall" numberOfLines={1} style={[styles.sender, unread && styles.unread]}>{sender}</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{displayTime(item.receivedAt)}</Text>
                </View>
                <Text variant="bodyMedium" numberOfLines={1} style={unread && styles.unread}>{item.subject || '（无主题）'}</Text>
                <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>{item.preview || ' '}</Text>
              </View>
            </Pressable>
          </MotionView>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 156 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 11, gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sender: { flex: 1, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
  unread: { fontWeight: '700' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 68, marginRight: 18 },
  loading: { marginTop: 64 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 72, gap: 7 },
  emptyDetail: { textAlign: 'center', lineHeight: 20 }
});
