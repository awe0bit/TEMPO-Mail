import { Button as NativeButton, Host } from '@expo/ui/swift-ui';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { TextInput, useTheme } from 'react-native-paper';
import { sendMail } from '@/api/jmap';
import { useAppState } from '@/state/app-state';

export default function ComposeScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ to?: string; subject?: string }>();
  const { selected, password, preview } = useAppState();
  const [to, setTo] = useState(params.to ?? '');
  const [subject, setSubject] = useState(params.subject ?? '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (preview) { Alert.alert('预览模式', '预览不会真的发送邮件。'); router.back(); return; }
    if (!selected) return;
    setSending(true);
    try { await sendMail(selected, await password(), to, subject, body); router.back(); }
    catch (reason) { Alert.alert('发送失败', reason instanceof Error ? reason.message : '未知错误'); }
    finally { setSending(false); }
  };
  return (
    <>
      <Stack.Screen options={{
        headerShown: true, presentation: 'modal', title: '新邮件', headerShadowVisible: false,
        headerLeft: () => <Host matchContents><NativeButton label="取消" onPress={() => router.back()} /></Host>,
        headerRight: () => <Host matchContents><NativeButton label="发送" systemImage="paperplane.fill" onPress={!to.trim() || sending ? undefined : () => void send()} /></Host>
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.page, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.addressGroup, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            autoFocus
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            contentStyle={styles.rowContent}
            style={styles.rowInput}
            label="收件人"
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
          <TextInput
            mode="flat"
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            contentStyle={styles.rowContent}
            style={styles.rowInput}
            label="主题"
            value={subject}
            onChangeText={setSubject}
          />
        </View>
        <TextInput
          mode="flat"
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          placeholder="邮件正文"
          value={body}
          onChangeText={setBody}
          multiline
          contentStyle={styles.bodyContent}
          style={styles.body}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  addressGroup: { borderRadius: 16, overflow: 'hidden' },
  rowInput: { height: 58, backgroundColor: 'transparent' },
  rowContent: { minHeight: 58 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  body: { flex: 1, backgroundColor: 'transparent', fontSize: 17 },
  bodyContent: { paddingHorizontal: 4, paddingTop: 18, textAlignVertical: 'top' }
});
