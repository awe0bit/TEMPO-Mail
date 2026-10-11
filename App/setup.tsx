import { Button as NativeButton, Host } from '@expo/ui/swift-ui';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_MAIL_DOMAIN, DEFAULT_MAIL_SERVER, DEFAULT_REGISTRATION_URL } from '@/config';
import { registerDefaultAccount } from '@/api/registration';
import { NativeGlassButton } from '@/components/NativeControls';
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
            <Text variant="titleMedium" style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>你的邮箱，由你掌控。</Text>
            <Text variant="bodyMedium" style={[styles.serverLabel, { color: theme.colors.onSurfaceVariant }]}>默认服务 · @{DEFAULT_MAIL_DOMAIN}</Text>
          </View>
        </View>
        <View style={styles.welcomeActions}>
          <NativeGlassButton label="注册 TEMPO 邮箱" systemImage="person.badge.plus" prominent wide isDisabled={!DEFAULT_REGISTRATION_URL} onPress={() => changeMode('register')} />
          <NativeGlassButton label="邮箱登录" systemImage="envelope" wide onPress={() => changeMode('login')} />
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => changeMode('custom')} style={styles.textAction}>
            <Text variant="labelLarge" style={{ color: theme.colors.onBackground }}>自定义服务器</Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={preview} style={styles.previewAction}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>不登录，预览界面</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const custom = mode === 'custom';
  const registering = mode === 'register';
  return (
    <>
      <Stack.Screen options={{
        headerShown: true,
        title: custom ? '自定义服务器' : registering ? '注册邮箱' : '邮箱登录',
        headerShadowVisible: false,
        headerLeft: () => <Host matchContents><NativeButton label="返回" systemImage="chevron.left" onPress={() => changeMode('welcome')} /></Host>
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.page, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            <Text variant="headlineSmall" style={styles.title}>{custom ? '连接你的邮箱服务' : registering ? `创建 @${DEFAULT_MAIL_DOMAIN}` : `登录 @${DEFAULT_MAIL_DOMAIN}`}</Text>
            <Text variant="bodyMedium" style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
              {custom ? '填写支持 JMAP 的服务地址和邮箱凭据。' : registering ? '选择邮箱名，输入邀请码后即可创建并直接登录。' : '使用你的完整邮箱地址和密码登录 TEMPO 邮箱。'}
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
          {Boolean(error) && <HelperText type="error" visible style={styles.helper}>{error}</HelperText>}
          <View style={styles.actions}>
            <NativeGlassButton label={busy ? (registering ? '正在创建…' : '正在登录…') : (registering ? '创建并登录' : '登录')} systemImage="arrow.right" prominent wide isDisabled={(custom && !server) || !email || !password || (registering && (!confirmPassword || !inviteCode)) || busy} onPress={() => void (registering ? register() : submit())} />
          </View>
          {!custom && !registering && <Pressable accessibilityRole="button" hitSlop={12} onPress={() => changeMode('custom')} style={styles.textAction}>
            <Text variant="labelLarge" style={{ color: theme.colors.onBackground }}>使用自定义服务器</Text>
          </Pressable>}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  welcome: { flex: 1, overflow: 'hidden', paddingHorizontal: 20 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 42, paddingBottom: 28 },
  heroSymbol: { width: 120, height: 120 },
  brandBlock: { alignItems: 'center', gap: 7, marginTop: 28 },
  brand: { fontSize: 38, lineHeight: 45, fontWeight: '800', letterSpacing: -1.2 },
  tagline: { fontWeight: '500' },
  serverLabel: { marginTop: 6 },
  welcomeActions: { width: '100%', alignItems: 'center', gap: 11, paddingBottom: 18 },
  textAction: { minHeight: 38, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  previewAction: { minHeight: 34, justifyContent: 'center', alignItems: 'center' },
  page: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 36 },
  heading: { gap: 8, marginHorizontal: 4, marginBottom: 22 },
  title: { fontWeight: '700', letterSpacing: -0.5 },
  intro: { lineHeight: 21 },
  form: { borderRadius: 16, overflow: 'hidden' },
  input: { height: 60, backgroundColor: 'transparent' },
  inputContent: { minHeight: 60 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  helper: { marginTop: 4 },
  actions: { marginTop: 20 }
});
