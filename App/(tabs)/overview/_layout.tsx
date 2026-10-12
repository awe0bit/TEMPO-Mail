import { Stack } from 'expo-router';

export default function Layout() {
  return <Stack screenOptions={{ animation: 'simple_push', animationDuration: 280, headerShadowVisible: false }} />;
}
