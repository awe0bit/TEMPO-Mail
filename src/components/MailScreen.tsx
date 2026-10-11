import { Button as NativeButton, Host, Menu as NativeMenu } from '@expo/ui/swift-ui';
import { controlSize, frame } from '@expo/ui/swift-ui/modifiers';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchMail } from '@/api/jmap';
import { AccountMenu } from '@/components/AccountMenu';
import { MailList } from '@/components/MailList';
import { NativeGlassIconButton } from '@/components/NativeControls';
import { useAppState } from '@/state/app-state';
import { previewMail } from '@/preview/fixtures';

type MailRole = 'inbox' | 'starred' | 'sent';

const folders: { role: MailRole; label: string; icon: 'tray' | 'star' | 'paperplane' }[] = [
  { role: 'inbox', label: '收件箱', icon: 'tray' },
  { role: 'starred', label: '星标', icon: 'star' },
  { role: 'sent', label: '已发送', icon: 'paperplane' }
];

export function MailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { selected, password, preview } = useAppState();
  const [role, setRole] = useState<MailRole>('inbox');
  const folder = folders.find((item) => item.role === role)!;
  const query = useQuery({
    queryKey: ['mail', selected?.id, role],
    enabled: Boolean(selected),
    queryFn: async () => {
      if (preview) {
        return previewMail.filter((item) => {
          if (role === 'starred' && !item.keywords?.['$flagged']) return false;
          if (role === 'sent') return false;
          return true;
        });
      }
      return fetchMail(selected!, await password(), role);
    }
  });
  return (
    <View collapsable={false} style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{
        title: folder.label, headerShadowVisible: false,
        headerLeft: () => <AccountMenu />,
        headerRight: () => <MailboxMenu value={role} onChange={setRole} />
      }} />
      <MailList
        data={query.data ?? []}
        refreshing={query.isFetching}
        onRefresh={() => void query.refetch()}
        emptyTitle={`暂无${folder.label}邮件`}
        emptyDetail="下拉即可重新检查服务器"
        error={query.error instanceof Error ? query.error.message : undefined}
        onOpen={(item) => router.push({ pathname: '/mail/[id]' as never, params: { id: item.id } } as never)}
      />
      <NativeGlassIconButton
        label="写邮件"
        systemImage="square.and.pencil"
        onPress={() => router.push('/compose')}
        style={[styles.compose, { bottom: Math.max(insets.bottom + 70, 88) }]}
      />
    </View>
  );
}

function MailboxMenu({ value, onChange }: { value: MailRole; onChange(value: MailRole): void }) {
  return (
    <Host matchContents style={{ width: 44, height: 44 }}>
      <NativeMenu label="" systemImage="line.3.horizontal.decrease" modifiers={[controlSize('regular'), frame({ width: 44, height: 44 })]}>
        {folders.map((item) => (
          <NativeButton key={item.role} label={item.label} systemImage={value === item.role ? 'checkmark.circle.fill' : item.icon} onPress={() => onChange(item.role)} />
        ))}
      </NativeMenu>
    </Host>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  compose: { position: 'absolute', right: 18, zIndex: 10 }
});
