import { Button as NativeButton, Host } from '@expo/ui/swift-ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { fetchMailDetail, updateMailKeywords } from '@/api/jmap';
import { NativeGlassButton } from '@/components/NativeControls';
import { previewMail } from '@/preview/fixtures';
import { useAppState } from '@/state/app-state';
import type { MailItem } from '@/types';

export default function MailDetailScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selected, password, preview } = useAppState();
  const [saving, setSaving] = useState(false);
  const mail = useQuery({
    queryKey: ['mail-detail', selected?.id, id],
    enabled: Boolean(selected && id),
    queryFn: async () => {
      if (preview) {
        const item = previewMail.find((entry) => entry.id === id);
        if (!item) throw new Error('预览邮件不存在');
        return { ...item };
      }
      return fetchMailDetail(selected!, await password(), id);
    }
  });
  const item = mail.data;
  const flagged = Boolean(item?.keywords?.['$flagged']);

  const saveKeywords = async (next: Record<string, boolean>) => {
    if (!item || !selected) return;
    setSaving(true);
    try {
      if (!preview) await updateMailKeywords(selected, await password(), item.id, next);
      queryClient.setQueryData<MailItem>(['mail-detail', selected.id, id], { ...item, keywords: next });
      if (preview) {
        queryClient.setQueriesData<MailItem[]>({ queryKey: ['mail', selected.id] }, (current) => current?.map((entry) => entry.id === item.id ? { ...entry, keywords: next } : entry));
        queryClient.setQueriesData<MailItem[]>({ queryKey: ['mail-search', selected.id] }, (current) => current?.map((entry) => entry.id === item.id ? { ...entry, keywords: next } : entry));
      } else {
        await queryClient.invalidateQueries({ queryKey: ['mail', selected.id] });
        await queryClient.invalidateQueries({ queryKey: ['mail-search', selected.id] });
      }
    } catch (reason) {
      Alert.alert('更新失败', reason instanceof Error ? reason.message : '无法更新邮件状态');
    } finally { setSaving(false); }
  };

  useEffect(() => {
    if (item && !item.keywords?.['$seen']) void saveKeywords({ ...(item.keywords ?? {}), '$seen': true });
  // Mark once when this message is first opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const sender = item?.from?.[0];
  const senderLabel = sender?.name || sender?.email || '未知发件人';
  const initial = senderLabel.slice(0, 1).toUpperCase();
  const replyTo = sender?.email ?? '';
  const replySubject = item?.subject?.startsWith('Re:') ? item.subject : `Re: ${item?.subject || ''}`;
  const date = useMemo(() => item ? new Date(item.receivedAt).toLocaleString('zh-CN') : '', [item]);

  return <View style={[styles.page, { backgroundColor: theme.colors.background }]}>
    <Stack.Screen options={{
      headerShown: true,
      title: '',
      headerShadowVisible: false,
      headerRight: item ? () => <Host matchContents><NativeButton label={flagged ? '取消星标' : '星标'} systemImage={flagged ? 'star.fill' : 'star'} onPress={saving ? undefined : () => void saveKeywords({ ...(item.keywords ?? {}), '$flagged': !flagged })} /></Host> : undefined
    }} />
    {mail.isLoading ? <ActivityIndicator style={styles.loading} /> : mail.error ? <View style={styles.empty}><Text variant="titleMedium">无法打开邮件</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>{mail.error instanceof Error ? mail.error.message : '未知错误'}</Text></View> : item ? <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Text style={styles.subject} selectable>{item.subject || '（无主题）'}</Text>
        <View style={styles.senderRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]}><Text style={[styles.initial, { color: theme.colors.onSurfaceVariant }]}>{initial}</Text></View>
          <View style={styles.senderText}>
            <Text style={styles.sender} numberOfLines={1}>{senderLabel}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>{sender?.email}</Text>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{date}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
        <Text style={styles.body} selectable>{item.body || item.preview || '这封邮件没有可显示的正文。'}</Text>
      </ScrollView>
      <View style={[styles.replyArea, { backgroundColor: theme.colors.background }]}>
        <NativeGlassButton wide prominent label="回复" systemImage="arrowshape.turn.up.left.fill" onPress={() => router.push({ pathname: '/compose' as never, params: { to: replyTo, subject: replySubject } } as never)} />
      </View>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  loading: { marginTop: 100 },
  empty: { padding: 48, alignItems: 'center', gap: 6 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 },
  subject: { fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6, marginBottom: 22 },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 17, fontWeight: '600' },
  senderText: { flex: 1 },
  sender: { fontSize: 16, lineHeight: 21, fontWeight: '600', letterSpacing: -0.2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  body: { fontSize: 17, lineHeight: 26, letterSpacing: -0.1 },
  replyArea: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 }
});
