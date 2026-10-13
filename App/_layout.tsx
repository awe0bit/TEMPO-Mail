import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { AppStateProvider } from '@/state/app-state';
import { createTempoTheme } from '@/theme';

const queryClient = new QueryClient();

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 220, fade: true });

function AutomaticUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let active = true;
    const synchronize = async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable || !active) return;
        // Download in the background and apply on the next cold launch. An
        // immediate reload makes a successful launch visibly restart itself.
        await Updates.fetchUpdateAsync();
      } catch {
        // Mail must remain usable when the update service or network is unavailable.
      }
    };
    void synchronize();
    return () => { active = false; };
  }, []);
  return null;
}

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const paperTheme = useMemo(() => createTempoTheme(isDark), [isDark]);
  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: paperTheme.colors.onBackground,
        background: paperTheme.colors.background,
        card: paperTheme.colors.surface,
        text: paperTheme.colors.onBackground,
        border: 'transparent',
        notification: paperTheme.colors.error
      }
    };
  }, [isDark, paperTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <PaperProvider theme={paperTheme}>
          <AutomaticUpdates />
          <AppStateProvider>
            <Stack screenOptions={{ animation: 'default', headerShown: false, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerBackButtonMenuEnabled: false, contentStyle: { backgroundColor: paperTheme.colors.background } }}>
              <Stack.Screen name="setup" options={{ animation: 'fade', animationDuration: 220, headerShown: true }} />
              <Stack.Screen name="compose" options={{ animation: 'slide_from_bottom', headerShown: true, presentation: 'modal' }} />
              <Stack.Screen name="mail/[id]" options={{ animation: 'simple_push', headerShown: true }} />
            </Stack>
          </AppStateProvider>
        </PaperProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
