import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { PropsWithChildren, useEffect } from 'react';
import { create } from 'zustand';
import { adminAccess, discover, isAdministrator } from '@/api/jmap';
import type { AdminAccess, MailAccount } from '@/types';
import { previewAccess, previewAccount } from '@/preview/fixtures';

type Store = {
  ready: boolean;
  accounts: MailAccount[];
  selectedId: string | null;
  access: AdminAccess | null;
  selected: MailAccount | null;
  admin: boolean;
  preview: boolean;
  initialize(): Promise<void>;
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
  accounts: [],
  selectedId: null,
  access: null,
  selected: null,
  admin: false,
  preview: false,
  async initialize() {
    const raw = await AsyncStorage.getItem(storageKey);
    const saved: SavedState = raw ? JSON.parse(raw) : { accounts: [], selectedId: null, access: null };
    const selected = derive(saved.accounts, saved.selectedId, null).selected;
    const preview = selected?.id === previewAccount.id;
    const cachedAccess = preview ? previewAccess : saved.access ?? null;

    // Render the complete saved navigation immediately. Network validation is
    // refreshed in the background so launch never waits for the server and the
    // administrator tab does not get inserted after the tab bar is visible.
    set({ ready: true, preview, accounts: saved.accounts, selectedId: saved.selectedId, access: cachedAccess, ...derive(saved.accounts, saved.selectedId, cachedAccess) });
    if (!selected || preview) return;
    const access = await loadAccess(selected);
    await persist(saved.accounts, saved.selectedId, access);
    if (get().selectedId === saved.selectedId) set({ access, ...derive(saved.accounts, saved.selectedId, access) });
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
  useEffect(() => { void initialize(); }, [initialize]);
  return children;
}
