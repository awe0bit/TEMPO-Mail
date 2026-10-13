import { Stack } from 'expo-router';
export default function Layout() {
  return <Stack screenOptions={{ animation: 'default', headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerBackButtonMenuEnabled: false }}>
    <Stack.Screen name="index" options={{ title: '设置' }} />
    <Stack.Screen name="resource" options={{ title: '管理' }} />
    <Stack.Screen name="editor" options={{ title: '编辑' }} />
    <Stack.Screen name="accounts" options={{ title: '账户与地址' }} />
  </Stack>;
}
