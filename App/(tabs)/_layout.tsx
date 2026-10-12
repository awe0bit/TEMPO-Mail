import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from 'react-native-paper';
import { useAppState } from '@/state/app-state';

export default function TabLayout() {
  const theme = useTheme();
  const { admin } = useAppState();
  return (
    <NativeTabs
      minimizeBehavior="never"
      tintColor={theme.colors.onBackground}
      iconColor={{ default: theme.colors.onSurfaceVariant, selected: theme.colors.onBackground }}
      labelStyle={{
        default: { color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '500' },
        selected: { color: theme.colors.onBackground, fontSize: 11, fontWeight: '500' }
      }}
    >
      <NativeTabs.Trigger name="inbox"><NativeTabs.Trigger.Icon sf="tray" /><NativeTabs.Trigger.Label>收件箱</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="overview" hidden={!admin}><NativeTabs.Trigger.Icon sf="chart.xyaxis.line" /><NativeTabs.Trigger.Label>概览</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings"><NativeTabs.Trigger.Icon sf="gearshape" /><NativeTabs.Trigger.Label>设置</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search"><NativeTabs.Trigger.Icon sf="magnifyingglass" /><NativeTabs.Trigger.Label>搜索</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}
