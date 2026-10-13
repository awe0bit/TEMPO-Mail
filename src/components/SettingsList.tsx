import { SymbolView } from 'expo-symbols';
import type { ComponentProps, PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';

export type SettingsTone = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal' | 'gray';
export type SettingsSymbol = ComponentProps<typeof SymbolView>['name'];

const tones: Record<SettingsTone, { light: string; dark: string }> = {
  blue: { light: '#007AFF', dark: '#0A84FF' },
  green: { light: '#34C759', dark: '#30D158' },
  orange: { light: '#FF9500', dark: '#FF9F0A' },
  purple: { light: '#AF52DE', dark: '#BF5AF2' },
  red: { light: '#FF3B30', dark: '#FF453A' },
  teal: { light: '#30B0C7', dark: '#40C8E0' },
  gray: { light: '#8E8E93', dark: '#636366' }
};

export function SettingsIcon({ symbol, tone = 'blue' }: { symbol: SettingsSymbol; tone?: SettingsTone }) {
  const theme = useTheme();
  return <View style={[styles.iconTile, { backgroundColor: tones[tone][theme.dark ? 'dark' : 'light'] }]}>
    <SymbolView name={symbol} tintColor="#FFFFFF" size={17} weight="semibold" resizeMode="center" style={styles.iconSymbol} />
  </View>;
}

export function SettingsChevron() {
  const theme = useTheme();
  return <SymbolView name="chevron.right" tintColor={theme.colors.onSurfaceVariant} size={13} weight="semibold" resizeMode="center" style={styles.chevron} />;
}

export function SettingsRow({
  title, description, value, symbol, tone = 'blue', onPress, destructive = false, disabled = false
}: {
  title: string;
  description?: string;
  value?: string;
  symbol: SettingsSymbol;
  tone?: SettingsTone;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return <List.Item
    style={[styles.row, disabled && styles.disabled]}
    title={title}
    description={description}
    titleNumberOfLines={1}
    descriptionNumberOfLines={2}
    titleStyle={[styles.title, destructive && { color: theme.colors.error }]}
    descriptionStyle={[styles.description, { color: theme.colors.onSurfaceVariant }]}
    left={() => <View style={styles.left}><SettingsIcon symbol={symbol} tone={tone} /></View>}
    right={() => <View style={styles.right}>
      {value ? <Text numberOfLines={1} variant="bodyMedium" style={[styles.value, { color: theme.colors.onSurfaceVariant }]}>{value}</Text> : null}
      {onPress ? <SettingsChevron /> : null}
    </View>}
    onPress={disabled ? undefined : onPress}
  />;
}

export function SettingsGroup({ children }: PropsWithChildren) {
  const theme = useTheme();
  return <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>{children}</View>;
}

export function SettingsDivider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />;
}

export function SettingsSectionTitle({ children }: PropsWithChildren) {
  const theme = useTheme();
  return <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  group: { borderRadius: 16, overflow: 'hidden' },
  row: { minHeight: 58, paddingVertical: 1, paddingLeft: 2 },
  left: { width: 48, alignItems: 'center', justifyContent: 'center' },
  iconTile: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  iconSymbol: { width: 20, height: 20 },
  chevron: { width: 16, height: 22 },
  right: { maxWidth: '48%', minHeight: 56, paddingRight: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  title: { fontSize: 17, letterSpacing: -0.25 },
  description: { fontSize: 13, lineHeight: 18 },
  value: { flexShrink: 1, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  sectionTitle: { marginHorizontal: 14, marginTop: 24, marginBottom: 7, letterSpacing: 0.1 },
  disabled: { opacity: 0.52 }
});
