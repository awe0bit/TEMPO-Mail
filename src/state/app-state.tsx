import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { PropsWithChildren, useEffect, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import { create } from 'zustand';
import { adminAccess, discover, isAdministrator } from '@/api/jmap';
import type { AdminAccess, MailAccount } from '@/types';
import { previewAccess, previewAccount } from '@/preview/fixtures';

type Store = {
  ready: boolean;
  interactive: boolean;
  accounts: MailAccount[];
  selectedId: string | null;
  access: AdminAccess | null;
  selected: MailAccount | null;
  admin: boolean;
  preview: boolean;
  initialize(): Promise<void>;
  markInteractive(): void;
  refreshAccess(): Promise<void>;
  connect(server: string, email: string, username: string, password: string): Promise<void>;
  enterPreview(): void;
  select(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  password(): Promise<string>;
};

const storageKey = 'tempo.accounts.v2';
type SavedState = { accounts: MailAccount[]; selectedId: string | null; access?: AdminAccess | null };

const derive = (accounts: MailAccount[], selectedId: string | null, access: AdminAccess | null) => ({
  selected: accounts.find((item) => item.id === selectedId) ?? accounts[0] ?? null,
  admin: isAdministrator(access)
});
const persist = (accounts: MailAccount[], selectedId: string | null, access: AdminAccess | null) =>
  AsyncStorage.setItem(storageKey, JSON.stringify({ accounts, selectedId, access }));

async function loadAccess(account: MailAccount | null) {
  if (!account) return null;
  if (account.id === previewAccount.id) return previewAccess;
  const secret = await SecureStore.getItemAsync(`tempo.password.${account.id}`);
  return secret ? adminAccess(account, secret) : null;
}

export const useAppState = create<Store>((set, get) => ({
  ready: false,
  interactive: false,
  accounts: [],
  selectedId: null,
  access: null,
  selected: null,
  admin: false,
  preview: false,
  async initialize() {
    let saved: SavedState = { accounts: [], selectedId: null, access: null };
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch {
      // A damaged local cache must never leave the native launch screen stuck.
      await AsyncStorage.removeItem(storageKey).catch(() => undefined);
    }
    const selected = derive(saved.accounts, saved.selectedId, null).selected;
    const preview = selected?.id === previewAccount.id;
    const cachedAccess = preview ? previewAccess : saved.access ?? null;

    // Render the complete saved navigation immediately. Network validation is
    // refreshed in the background so launch never waits for the server and the
    // administrator tab does not get inserted after the tab bar is visible.
    set({ ready: true, preview, accounts: saved.accounts, selectedId: saved.selectedId, access: cachedAccess, ...derive(saved.accounts, saved.selectedId, cachedAccess) });
  },
  markInteractive() {
    set({ interactive: true });
  },
  async refreshAccess() {
    const { selected, selectedId, access: cachedAccess, preview } = get();
    if (!selected || preview) return;
    const refreshedAccess = await loadAccess(selected);
    // Keep the last confirmed capability set when the server is temporarily
    // unavailable, so the native tab bar never rebuilds underneath the user.
    const access = refreshedAccess ?? cachedAccess;
    const accounts = get().accounts;
    await persist(accounts, selectedId, access);
    if (get().selectedId === selectedId) set({ access, ...derive(accounts, selectedId, access) });
  },
  async connect(server, email, username, secret) {
    const account = await discover(server, email, username, secret);
    await SecureStore.setItemAsync(`tempo.password.${account.id}`, secret);
    const accounts = [...(get().preview ? [] : get().accounts), account];
    const access = await adminAccess(account, secret);
    await persist(accounts, account.id, access);
    set({ preview: false, accounts, selectedId: account.id, access, ...derive(accounts, account.id, access) });
  },
  enterPreview() {
    const accounts = [previewAccount];
    void persist(accounts, previewAccount.id, previewAccess);
    set({ preview: true, accounts, selectedId: previewAccount.id, access: previewAccess, ...derive(accounts, previewAccount.id, previewAccess) });
  },
  async select(id) {
    const { accounts } = get();
    const selected = accounts.find((item) => item.id === id) ?? null;
    const access = await loadAccess(selected);
    await persist(accounts, id, access);
    set({ preview: selected?.id === previewAccount.id, selectedId: id, access, ...derive(accounts, id, access) });
  },
  async remove(id) {
    await SecureStore.deleteItemAsync(`tempo.password.${id}`);
    const accounts = get().accounts.filter((item) => item.id !== id);
    const selectedId = get().selectedId === id ? accounts[0]?.id ?? null : get().selectedId;
    const selected = accounts.find((item) => item.id === selectedId) ?? null;
    const access = await loadAccess(selected);
    await persist(accounts, selectedId, access);
    set({ preview: false, accounts, selectedId, access, ...derive(accounts, selectedId, access) });
  },
  async password() {
    const selected = get().selected;
    if (!selected) throw new Error('没有选择账户');
    if (get().preview || selected.id === previewAccount.id) return 'preview';
    const secret = await SecureStore.getItemAsync(`tempo.password.${selected.id}`);
    if (!secret) throw new Error('登录凭据已失效');
    return secret;
  }
}));

export function AppStateProvider({ children }: PropsWithChildren) {
  const initialize = useAppState((state) => state.initialize);
  const ready = useAppState((state) => state.ready);
  const markInteractive = useAppState((state) => state.markInteractive);
  const refreshAccess = useAppState((state) => state.refreshAccess);
  const [contentLaidOut, setContentLaidOut] = useState(false);
  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    if (!ready || !contentLaidOut) return;
    // Wait for the initial redirect/navigation commit. Hiding on an arbitrary
    // timer can briefly reveal the root route before the selected screen.
    let frame = 0;
    let permissionTimer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      frame = requestAnimationFrame(() => {
        void SplashScreen.hideAsync().then(() => {
          if (!active) return;
          // Network access to a private host can trigger iOS Local Network
          // permission. Start it only after the launch screen has fully left.
          markInteractive();
          permissionTimer = setTimeout(() => { void refreshAccess(); }, 350);
        });
      });
    });
    return () => {
      active = false;
      task.cancel();
      if (frame) cancelAnimationFrame(frame);
      if (permissionTimer) clearTimeout(permissionTimer);
    };
  }, [contentLaidOut, markInteractive, ready, refreshAccess]);

  return (
    <View style={styles.appRoot}>
      {ready ? <View style={styles.appRoot} onLayout={() => setContentLaidOut(true)}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({ appRoot: { flex: 1 } });
