import { Stack } from 'expo-router';

export default function Layout() {
  return <Stack screenOptions={{ animation: 'default', headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerBackButtonMenuEnabled: false }}>
    <Stack.Screen name="index" options={{ title: '搜索' }} />
  </Stack>;
}
