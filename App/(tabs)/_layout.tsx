import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAppState } from '@/state/app-state';

export default function TabLayout() {
  const { admin } = useAppState();
  return (
    <NativeTabs
      minimizeBehavior="never"
    >
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Icon sf="tray" />
        <NativeTabs.Trigger.Label>收件箱</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="overview" hidden={!admin}>
        <NativeTabs.Trigger.Icon sf="chart.xyaxis.line" />
        <NativeTabs.Trigger.Label>概览</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape" />
        <NativeTabs.Trigger.Label>设置</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search" />
    </NativeTabs>
  );
}
