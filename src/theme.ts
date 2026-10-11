import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const tempoPalette = {
  light: {
    canvas: '#F7F7F9',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    subtle: '#ECECF1',
    separator: '#DDDDE3',
    text: '#1C1C1E',
    muted: '#68686F'
  },
  dark: {
    canvas: '#101012',
    surface: '#1B1B1E',
    surfaceRaised: '#232326',
    subtle: '#2A2A2E',
    separator: '#38383E',
    text: '#F2F2F7',
    muted: '#A7A7AE'
  }
} as const;

export function createTempoTheme(isDark: boolean): MD3Theme {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  const palette = isDark ? tempoPalette.dark : tempoPalette.light;

  return {
    ...base,
    roundness: 18,
    colors: {
      ...base.colors,
      primary: palette.text,
      onPrimary: isDark ? '#111113' : '#FFFFFF',
      primaryContainer: palette.subtle,
      onPrimaryContainer: palette.text,
      secondary: palette.muted,
      background: palette.canvas,
      onBackground: palette.text,
      surface: palette.surface,
      surfaceVariant: palette.subtle,
      surfaceDisabled: palette.subtle,
      onSurface: palette.text,
      onSurfaceVariant: palette.muted,
      outline: palette.separator,
      outlineVariant: palette.separator,
      elevation: {
        ...base.colors.elevation,
        level0: 'transparent',
        level1: palette.surface,
        level2: palette.surfaceRaised,
        level3: palette.surfaceRaised
      }
    }
  };
}
