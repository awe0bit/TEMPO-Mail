import { Button, Divider, Host, Menu } from '@expo/ui/swift-ui';
import { controlSize, frame } from '@expo/ui/swift-ui/modifiers';
import { router } from 'expo-router';
import { useAppState } from '@/state/app-state';

export function AccountMenu() {
  const { accounts, selected, select } = useAppState();
  const localPart = selected?.email.split('@')[0] || selected?.name || '账户';
  const label = localPart.length > 10 ? `${localPart.slice(0, 9)}…` : localPart;
  return (
    <Host matchContents style={{ height: 44, maxWidth: 148 }}>
      <Menu label={label} systemImage="person.crop.circle" modifiers={[controlSize('regular'), frame({ height: 44, maxWidth: 148 })]}>
        {accounts.map((account) => (
          <Button key={account.id} label={account.email} systemImage={account.id === selected?.id ? 'checkmark.circle.fill' : 'person.crop.circle'} onPress={() => select(account.id)} />
        ))}
        <Divider />
        <Button label="添加账户" systemImage="person.crop.circle.badge.plus" onPress={() => router.push('/setup')} />
        <Button label="设置" systemImage="gearshape" onPress={() => router.push('/(tabs)/settings')} />
      </Menu>
    </Host>
  );
}
