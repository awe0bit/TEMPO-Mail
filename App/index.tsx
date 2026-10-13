import { Redirect } from 'expo-router';
import { useAppState } from '@/state/app-state';

export default function Index() {
  const { ready, selected } = useAppState();
  if (!ready) return null;
  return <Redirect href={selected ? '/(tabs)/inbox' : '/setup'} />;
}
