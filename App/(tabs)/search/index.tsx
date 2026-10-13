import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { fetchMail } from '@/api/jmap';
import { AccountMenu } from '@/components/AccountMenu';
import { MailList } from '@/components/MailList';
import { previewMail } from '@/preview/fixtures';
import { useAppState } from '@/state/app-state';

export default function SearchScreen() {
  const theme = useTheme();
  const { selected, password, preview } = useAppState();
  const [search, setSearch] = useState('');
  const term = search.trim();
  const query = useQuery({
    queryKey: ['mail-search', selected?.id, term],
    enabled: Boolean(selected) && term.length > 0,
    queryFn: async () => {
      if (preview) {
        const value = term.toLowerCase();
        return previewMail.filter((item) => `${item.subject} ${item.preview} ${item.from?.[0]?.name} ${item.from?.[0]?.email}`.toLowerCase().includes(value));
      }
      return fetchMail(selected!, await password(), 'all', term);
    }
  });

  return (
    <View collapsable={false} style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{
        title: '搜索',
        headerShadowVisible: false,
        headerLeft: () => <AccountMenu />,
        headerSearchBarOptions: {
          placeholder: '搜索全部邮件',
          hideWhenScrolling: false,
          onChangeText: (event) => setSearch(event.nativeEvent.text),
          onCancelButtonPress: () => setSearch('')
        }
      }} />
      <MailList
        data={query.data ?? []}
        refreshing={query.isRefetching}
        onRefresh={() => { if (term) void query.refetch(); }}
        emptyTitle={term ? '没有找到邮件' : '搜索全部邮件'}
        emptyDetail={term ? '换一个关键词再试试' : '输入发件人、主题或正文关键词'}
        error={query.error instanceof Error ? query.error.message : undefined}
        onOpen={(item) => router.push({ pathname: '/mail/[id]' as never, params: { id: item.id } } as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1 } });
