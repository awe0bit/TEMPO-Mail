import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_MAIL_DOMAIN, DEFAULT_MAIL_SERVER, DEFAULT_REGISTRATION_URL } from '@/config';
import { registerDefaultAccount } from '@/api/registration';
import { NativeGlassButton, NativeGlassIconButton } from '@/components/NativeControls';
import { useAppState } from '@/state/app-state';

type Mode = 'welcome' | 'register' | 'login' | 'custom';

export default function Setup() {
  const theme = useTheme();
  const { connect, enterPreview } = useAppState();
  const [mode, setMode] = useState<Mode>('welcome');
  const [server, setServer] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const changeMode = (next: Mode) => {
    setError('');
    setPassword('');
    setConfirmPassword('');
    setInviteCode('');
    setMode(next);
  };
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await connect(mode === 'login' ? DEFAULT_MAIL_SERVER : server, email, mode === 'login' ? '' : username, password);
      router.replace('/(tabs)/inbox');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '连接失败');
    } finally {
      setBusy(false);
    }
  };
  const register = async () => {
    if (password !== confirmPassword) return setError('两次输入的密码不一致');
    setBusy(true);
    setError('');
    try {
      const registeredEmail = await registerDefaultAccount(email, password, inviteCode);
      await connect(DEFAULT_MAIL_SERVER, registeredEmail, '', password);
      router.replace('/(tabs)/inbox');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '注册失败');
    } finally {
      setBusy(false);
    }
  };
  const preview = () => {
    enterPreview();
    router.replace('/(tabs)/inbox');
  };

  if (mode === 'welcome') {
    return (
      <SafeAreaView style={[styles.welcome, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.hero}>
          <Image source={require('../src/assets/tempo-mark.png')} resizeMode="contain" style={[styles.heroSymbol, { tintColor: theme.colors.onBackground }]} />
          <View style={styles.brandBlock}>
            <Text variant="displaySmall" style={styles.brand}>TEMPO Mail</Text>
            <Text variant="titleMedium" style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>邮件与服务器管理，一个客户端完成。</Text>
            <View style={[styles.serverBadge, { backgroundColor: theme.colors.surface }]}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>默认服务</Text>
              <Text variant="labelLarge">@{DEFAULT_MAIL_DOMAIN}</Text>
            </View>
          </View>
        </View>
        <View style={styles.welcomeActions}>
          <Text variant="titleMedium" style={styles.actionTitle}>开始使用</Text>
          <NativeGlassButton label="登录邮箱" systemImage="envelope.fill" prominent wide onPress={() => changeMode('login')} />
          <NativeGlassButton label="注册新邮箱" systemImage="person.badge.plus" wide isDisabled={!DEFAULT_REGISTRATION_URL} onPress={() => changeMode('register')} />
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => changeMode('custom')} style={[styles.serverAction, { backgroundColor: theme.colors.surface }]}>
            <View>
              <Text variant="labelLarge">连接自定义服务器</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>其他 Stalwart / JMAP 服务</Text>
            </View>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant }}>›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={preview} style={styles.previewAction}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>暂不登录，预览完整界面</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const custom = mode === 'custom';
  const registering = mode === 'register';
  const screenTitle = custom ? '自定义服务器' : registering ? '注册邮箱' : '邮箱登录';
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.formHeader}>
        <NativeGlassIconButton label="返回" systemImage="chevron.left" size={44} onPress={() => changeMode('welcome')} />
        <Text variant="titleMedium" style={styles.formHeaderTitle}>{screenTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>TEMPO MAIL</Text>
            <Text variant="headlineSmall" style={styles.title}>{custom ? '连接你的服务' : registering ? '创建你的邮箱' : '欢迎回来'}</Text>
            <Text variant="bodyMedium" style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
              {custom ? '使用支持 JMAP 的自托管邮箱地址与凭据。' : registering ? `创建一个 @${DEFAULT_MAIL_DOMAIN} 地址，完成后自动登录。` : `使用你的 @${DEFAULT_MAIL_DOMAIN} 邮箱地址登录。`}
            </Text>
          </View>
          <View style={[styles.form, { backgroundColor: theme.colors.surface }]}>
            {custom && <>
              <TextInput style={styles.input} contentStyle={styles.inputContent} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="服务器地址" placeholder="https://mail.example.com" value={server} onChangeText={setServer} autoCapitalize="none" />
              <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
            </>}
            <TextInput autoFocus style={styles.input} contentStyle={styles.inputContent} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label={registering ? '邮箱名' : '邮箱地址'} placeholder={registering ? `name（将创建 name@${DEFAULT_MAIL_DOMAIN}）` : custom ? 'name@example.com' : `name@${DEFAULT_MAIL_DOMAIN}`} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType={registering ? 'default' : 'email-address'} />
            {custom && <>
              <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
              <TextInput style={styles.input} contentStyle={styles.inputContent} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="登录用户名（可留空）" value={username} onChangeText={setUsername} autoCapitalize="none" />
            </>}
            <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
            <TextInput style={styles.input} contentStyle={styles.inputContent} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="密码" value={password} onChangeText={setPassword} secureTextEntry />
            {registering && <>
              <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
              <TextInput style={styles.input} contentStyle={styles.inputContent} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="再次输入密码" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              <View style={[styles.separator, { backgroundColor: theme.colors.outlineVariant }]} />
              <TextInput style={styles.input} contentStyle={styles.inputContent} mode="flat" underlineColor="transparent" activeUnderlineColor="transparent" label="邀请码" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
            </>}
          </View>
          {Boolean(error) && <View style={[styles.errorNotice, { backgroundColor: theme.colors.errorContainer }]}><Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>{error}</Text></View>}
          <View style={styles.actions}>
            <NativeGlassButton label={busy ? (registering ? '正在创建…' : '正在登录…') : (registering ? '创建并登录' : '登录')} systemImage="arrow.right" prominent wide isDisabled={(custom && !server) || !email || !password || (registering && (!confirmPassword || !inviteCode)) || busy} onPress={() => void (registering ? register() : submit())} />
          </View>
          {!custom && !registering && <Pressable accessibilityRole="button" hitSlop={12} onPress={() => changeMode('custom')} style={styles.textAction}>
            <Text variant="labelLarge" style={{ color: theme.colors.onBackground }}>改用自定义服务器</Text>
          </Pressable>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  welcome: { flex: 1, overflow: 'hidden', paddingHorizontal: 24 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 34, paddingBottom: 22 },
  heroSymbol: { width: 92, height: 92 },
  brandBlock: { alignItems: 'center', gap: 8, marginTop: 22 },
  brand: { fontSize: 36, lineHeight: 43, fontWeight: '800', letterSpacing: -1.1 },
  tagline: { maxWidth: 320, textAlign: 'center', fontWeight: '500', lineHeight: 22 },
  serverBadge: { minHeight: 36, borderRadius: 18, marginTop: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  welcomeActions: { width: '100%', alignItems: 'center', gap: 12, paddingBottom: 16 },
  actionTitle: { alignSelf: 'flex-start', marginLeft: 2, marginBottom: 2, fontWeight: '600' },
  serverAction: { width: '100%', maxWidth: 440, minHeight: 64, borderRadius: 20, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textAction: { minHeight: 38, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  previewAction: { minHeight: 38, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  page: { flex: 1 },
  formHeader: { height: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  formHeaderTitle: { flex: 1, textAlign: 'center', fontWeight: '600' },
  headerSpacer: { width: 44, height: 44 },
  keyboard: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 34, paddingBottom: 36 },
  heading: { gap: 8, marginHorizontal: 4, marginBottom: 24 },
  title: { marginTop: 2, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  intro: { lineHeight: 21 },
  form: { borderRadius: 20, overflow: 'hidden' },
  input: { height: 62, backgroundColor: 'transparent' },
  inputContent: { minHeight: 62 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  errorNotice: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginTop: 14 },
  actions: { marginTop: 20 }
});
