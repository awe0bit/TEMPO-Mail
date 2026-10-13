import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS } from 'react-native';
import { useAppState } from '@/state/app-state';

const tabColors = {
  default: DynamicColorIOS({ light: 'rgba(60, 60, 67, 0.60)', dark: 'rgba(235, 235, 245, 0.60)' }),
  selected: DynamicColorIOS({ light: '#000000', dark: '#FFFFFF' })
};

export default function TabLayout() {
  const { admin } = useAppState();

  return (
    <NativeTabs
      iconColor={tabColors}
      labelStyle={{
        default: { color: tabColors.default },
        selected: { color: tabColors.selected }
      }}
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
