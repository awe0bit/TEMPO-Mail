import { Tabs } from 'expo-router';
import { TempoTabBar } from '@/components/TempoTabBar';
import { useAppState } from '@/state/app-state';

export default function TabLayout() {
  const { admin } = useAppState();
  return (
    <Tabs
      backBehavior="history"
      detachInactiveScreens={false}
      screenOptions={{ animation: 'fade', freezeOnBlur: false, headerShown: false }}
      tabBar={(props) => <TempoTabBar {...props} admin={admin} />}
    >
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="overview" options={{ href: admin ? undefined : null }} />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="search" />
    </Tabs>
  );
}
