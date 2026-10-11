import { Button as NativeButton, Host, Image as NativeImage, Menu as NativeMenu } from '@expo/ui/swift-ui';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { List, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createManagedAccount, createTemporaryAddress, deleteManagedAccount, deleteTemporaryAddress,
  fetchManagedAccounts, fetchTemporaryAddresses, setManagedAccountSuspended, setTemporaryAddressEnabled
} from '@/api/jmap';
import { AccountMenu } from '@/components/AccountMenu';
import { previewManagedAccounts, previewTemporaryAddresses } from '@/preview/fixtures';
import { useAppState } from '@/state/app-state';
import type { ManagedAccount, TemporaryAddress } from '@/types';
import { NativeGlassButton, NativeGlassIconButton, NativeSegmentedControl } from '@/components/NativeControls';

const isSuspended = (account: ManagedAccount) =>
  Boolean((account.permissions as any)?.disabledPermissions?.authenticate);

export default function AdminAccountsScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { selected, password, preview, access } = useAppState();
  const temporaryAvailable = preview || access?.edition === 'enterprise';
  const queryClient = useQueryClient();
  const [section, setSection] = useState(params.section === 'temporary' && temporaryAvailable ? 'temporary' : 'accounts');
  const [dialog, setDialog] = useState<'account' | 'temporary' | null>(null);
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!temporaryAvailable && section === 'temporary') setSection('accounts');
  }, [section, temporaryAvailable]);

  const accounts = useQuery({
    queryKey: ['managed-accounts', selected?.id, preview], enabled: Boolean(selected),
    queryFn: async () => preview ? previewManagedAccounts : fetchManagedAccounts(selected!, await password())
  });
  const temporary = useQuery({
    queryKey: ['temporary-addresses', selected?.id, preview], enabled: Boolean(selected) && section === 'temporary',
    queryFn: async () => preview ? previewTemporaryAddresses : fetchTemporaryAddresses(selected!, await password())
  });

  const run = async (operation: (secret: string) => Promise<void>) => {
    if (preview) { Alert.alert('预览模式', '预览不会修改服务器数据。'); return false; }
    setBusy(true);
    try {
      await operation(await password());
      await queryClient.invalidateQueries({ queryKey: section === 'accounts' ? ['managed-accounts'] : ['temporary-addresses'] });
      return true;
    } catch (reason) {
      Alert.alert('操作失败', reason instanceof Error ? reason.message : '未知错误');
      return false;
    } finally { setBusy(false); }
  };

  const create = async () => {
    if (!selected) return;
    const created = section === 'accounts'
      ? await run((passwordValue) => createManagedAccount(selected, passwordValue, email, secret, description))
      : await run((passwordValue) => createTemporaryAddress(selected, passwordValue, prefix, domain, description));
    if (created) {
      setDialog(null); setEmail(''); setSecret(''); setDescription(''); setPrefix(''); setDomain('');
    }
  };

  const openCreate = () => {
    if (preview) { Alert.alert('预览模式', '连接管理员账户后才可以创建账户或临时邮箱。'); return; }
    setDialog(section === 'accounts' ? 'account' : 'temporary');
  };

  const closeCreate = () => {
    if (busy) return;
    setDialog(null);
  };

  const separator = () => <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />;
  const inputStyle = [styles.input, { backgroundColor: 'transparent' }];
  const createDisabled = busy || (dialog === 'account' && (!email.trim() || !secret));

  return (
    <View collapsable={false} style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{
        title: '账户与地址', headerShadowVisible: false, headerLeft: () => <AccountMenu />,
        headerRight: preview ? undefined : () => <Host matchContents><NativeButton label="添加" systemImage="plus" onPress={openCreate} /></Host>
      }} />
      {preview && <Text style={[styles.preview, { color: theme.colors.onSurfaceVariant }]}>预览模式 · 管理操作不会写入服务器</Text>}
      {temporaryAvailable
        ? <NativeSegmentedControl value={section} onChange={setSection} options={[{ value: 'accounts', label: '账户' }, { value: 'temporary', label: '临时邮箱' }]} />
        : <Text style={[styles.editionNote, { color: theme.colors.onSurfaceVariant }]}>当前 Stalwart Community 不包含 Enterprise 临时邮箱功能。</Text>}
      {section === 'accounts' ? (
        <FlashList
          data={accounts.data ?? []} keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={accounts.isFetching} onRefresh={() => accounts.refetch()} />}
          ItemSeparatorComponent={separator}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>{accounts.error instanceof Error ? accounts.error.message : '没有账户或当前权限不足'}</Text>}
          renderItem={({ item }) => (
            <List.Item
              style={styles.row}
              title={item.description || item.emailAddress}
              description={`${item.emailAddress}${isSuspended(item) ? ' · 已封禁' : ''}`}
              left={() => <Host style={styles.rowIcon}><NativeImage systemName={isSuspended(item) ? 'person.crop.circle.badge.xmark' : 'person.crop.circle'} size={27} color={theme.colors.onSurfaceVariant} /></Host>}
              right={() => <AccountActions item={item} currentEmail={selected?.email} disabled={busy} onSuspend={() => selected && run((passwordValue) => setManagedAccountSuspended(selected, passwordValue, item, !isSuspended(item)))} onDelete={() => selected && Alert.alert('永久删除账户？', item.emailAddress, [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => void run((passwordValue) => deleteManagedAccount(selected, passwordValue, item.id)) }])} />}
            />
          )}
        />
      ) : (
        <FlashList
          data={temporary.data ?? []} keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={temporary.isFetching} onRefresh={() => temporary.refetch()} />}
          ItemSeparatorComponent={separator}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>{temporary.error instanceof Error ? temporary.error.message : '没有临时邮箱，或服务器未启用 Masked Email'}</Text>}
          renderItem={({ item }) => (
            <List.Item style={styles.row} title={item.email} description={`${item.description || '无说明'} · ${item.enabled ? '启用' : '停用'}`} left={() => <Host style={styles.rowIcon}><NativeImage systemName="envelope.badge" size={27} color={theme.colors.onSurfaceVariant} /></Host>} right={() => <TemporaryActions item={item} disabled={busy} onToggle={() => selected && run((passwordValue) => setTemporaryAddressEnabled(selected, passwordValue, item, !item.enabled))} onDelete={() => selected && Alert.alert('删除临时邮箱？', item.email, [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => void run((passwordValue) => deleteTemporaryAddress(selected, passwordValue, item.id)) }])} />} />
          )}
        />
      )}
      <Modal visible={dialog !== null} transparent animationType="slide" onRequestClose={closeCreate}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalRoot}>
          <Pressable accessibilityRole="button" accessibilityLabel="关闭" onPress={closeCreate} style={styles.backdrop} />
          <View style={[styles.sheet, { backgroundColor: theme.colors.elevation.level2, paddingBottom: Math.max(insets.bottom + 8, 14) }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeading}>
                <Text variant="headlineSmall" style={styles.sheetTitle}>{dialog === 'account' ? '添加账户' : '添加临时邮箱'}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{dialog === 'account' ? '创建一个新的邮箱账户' : '创建一个可随时停用的临时地址'}</Text>
              </View>
              <NativeGlassIconButton label="关闭" systemImage="xmark" size={40} onPress={closeCreate} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface }]}>
                {dialog === 'account' ? <>
                  <TextInput autoFocus style={inputStyle} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="完整邮箱地址" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                  <View style={[styles.inputSeparator, { backgroundColor: theme.colors.outlineVariant }]} />
                  <TextInput style={inputStyle} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="显示名称（可选）" value={description} onChangeText={setDescription} />
                  <View style={[styles.inputSeparator, { backgroundColor: theme.colors.outlineVariant }]} />
                  <TextInput style={inputStyle} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="初始密码" value={secret} onChangeText={setSecret} secureTextEntry />
                </> : <>
                  <TextInput autoFocus style={inputStyle} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="前缀（留空自动生成）" value={prefix} onChangeText={setPrefix} autoCapitalize="none" />
                  <View style={[styles.inputSeparator, { backgroundColor: theme.colors.outlineVariant }]} />
                  <TextInput style={inputStyle} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="邮箱域名（留空使用默认）" value={domain} onChangeText={setDomain} autoCapitalize="none" keyboardType="email-address" />
                  <View style={[styles.inputSeparator, { backgroundColor: theme.colors.outlineVariant }]} />
                  <TextInput style={inputStyle} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="用途说明" value={description} onChangeText={setDescription} />
                </>}
              </View>
            </ScrollView>
            <View style={styles.sheetActions}>
              <NativeGlassButton label="取消" onPress={closeCreate} />
              <NativeGlassButton label={busy ? '正在创建…' : '创建'} prominent isDisabled={createDisabled} onPress={() => void create()} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function AccountActions({ item, currentEmail, disabled, onSuspend, onDelete }: { item: ManagedAccount; currentEmail?: string; disabled: boolean; onSuspend(): void; onDelete(): void }) {
  const current = item.emailAddress.toLowerCase() === currentEmail?.toLowerCase();
  return <Host matchContents><NativeMenu label="" systemImage="ellipsis.circle"><NativeButton label={isSuspended(item) ? '解封账户' : '封禁账户'} systemImage={isSuspended(item) ? 'person.badge.plus' : 'person.badge.minus'} onPress={current || disabled ? undefined : onSuspend} /><NativeButton label="删除账户" systemImage="trash" role="destructive" onPress={current || disabled ? undefined : onDelete} /></NativeMenu></Host>;
}

function TemporaryActions({ item, disabled, onToggle, onDelete }: { item: TemporaryAddress; disabled: boolean; onToggle(): void; onDelete(): void }) {
  return <Host matchContents><NativeMenu label="" systemImage="ellipsis.circle"><NativeButton label={item.enabled ? '停用' : '启用'} systemImage={item.enabled ? 'pause.circle' : 'play.circle'} onPress={disabled ? undefined : onToggle} /><NativeButton label="删除" systemImage="trash" role="destructive" onPress={disabled ? undefined : onDelete} /></NativeMenu></Host>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  preview: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 2 },
  editionNote: { paddingHorizontal: 20, paddingVertical: 12 },
  listContent: { paddingBottom: 24 },
  row: { paddingHorizontal: 8, paddingVertical: 3 },
  rowIcon: { width: 52, height: 48, alignItems: 'center', justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 72, marginRight: 16 },
  empty: { padding: 40, textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  sheet: { maxHeight: '82%', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 14, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: -8 } },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 },
  sheetHeading: { flex: 1, gap: 4 },
  sheetTitle: { fontWeight: '700', letterSpacing: -0.5 },
  form: { paddingBottom: 18 },
  inputGroup: { borderRadius: 20, overflow: 'hidden' },
  input: { height: 60 },
  inputSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  sheetActions: { minHeight: 54, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }
});
