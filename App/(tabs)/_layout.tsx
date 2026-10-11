import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from 'react-native-paper';
import { useAppState } from '@/state/app-state';

export default function TabLayout() {
  const theme = useTheme();
  const { admin } = useAppState();
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={theme.colors.onBackground}
      iconColor={{ default: theme.colors.onSurfaceVariant, selected: theme.colors.onBackground }}
      labelStyle={{ default: { color: theme.colors.onSurfaceVariant, fontSize: 11 }, selected: { color: theme.colors.onBackground, fontSize: 11, fontWeight: '600' } }}
    >
      <NativeTabs.Trigger name="inbox"><NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.fill' }} /><NativeTabs.Trigger.Label>收件箱</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="overview" hidden={!admin}><NativeTabs.Trigger.Icon sf={{ default: 'chart.xyaxis.line', selected: 'chart.xyaxis.line' }} /><NativeTabs.Trigger.Label>概览</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings"><NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} /><NativeTabs.Trigger.Label>设置</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search"><NativeTabs.Trigger.Icon sf="magnifyingglass" /><NativeTabs.Trigger.Label>搜索</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}
