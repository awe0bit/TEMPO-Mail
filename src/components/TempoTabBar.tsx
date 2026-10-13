import { Button, GlassEffectContainer, HStack, Host, Image, Text, VStack } from '@expo/ui/swift-ui';
import { buttonBorderShape, buttonStyle, font, foregroundStyle, frame, glassEffect } from '@expo/ui/swift-ui/modifiers';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useTheme } from 'react-native-paper';

type TabDefinition = {
  label: string;
  name: 'inbox' | 'overview' | 'settings' | 'search';
  symbol: 'tray' | 'chart.xyaxis.line' | 'gearshape' | 'magnifyingglass';
};

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const mailboxTabs: TabDefinition[] = [
  { name: 'inbox', label: '收件箱', symbol: 'tray' },
  { name: 'overview', label: '概览', symbol: 'chart.xyaxis.line' },
  { name: 'settings', label: '设置', symbol: 'gearshape' }
];

export function TempoTabBar({ state, navigation, insets, admin }: BottomTabBarProps & { admin: boolean }) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { width } = useWindowDimensions();
  const tabs = admin ? mailboxTabs : mailboxTabs.filter((tab) => tab.name !== 'overview');
  const horizontalInset = 20;
  const barHeight = 56;
  const searchSize = 56;
  const gap = 10;
  const groupWidth = width - horizontalInset * 2 - searchSize - gap;
  const itemWidth = groupWidth / tabs.length;

  const open = (name: TabDefinition['name']) => {
    const index = state.routes.findIndex((route) => route.name === name);
    if (index < 0) return;
    const route = state.routes[index];
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const isSelected = (name: TabDefinition['name']) => state.routes[state.index]?.name === name;
  const bottom = Math.max(insets.bottom, 8);

  return (
    <View pointerEvents="box-none" style={[styles.container, { height: barHeight + 4 + bottom, paddingBottom: bottom, paddingHorizontal: horizontalInset, gap }]}>
      <Host colorScheme={scheme} ignoreSafeArea="all" style={{ height: barHeight, width: groupWidth }}>
        <GlassEffectContainer spacing={8}>
          <HStack
            spacing={0}
            modifiers={[
              frame({ width: groupWidth, height: barHeight }),
              glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' })
            ]}
          >
            {tabs.map((tab) => {
              const selected = isSelected(tab.name);
              return (
                <Button
                  key={tab.name}
                  onPress={() => open(tab.name)}
                  modifiers={[
                    frame({ width: itemWidth, height: barHeight }),
                    buttonBorderShape('capsule'),
                    buttonStyle('plain')
                  ]}
                >
                  <VStack
                    alignment="center"
                    spacing={1}
                    modifiers={[
                      frame({ width: itemWidth - 4, height: barHeight - 6 }),
                      ...(selected ? [glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' })] : [])
                    ]}
                  >
                    <Image systemName={tab.symbol} size={22} color={selected ? theme.colors.onBackground : theme.colors.onSurfaceVariant} />
                    <Text modifiers={[
                      font({ size: 11, weight: 'medium' }),
                      foregroundStyle(selected ? theme.colors.onBackground : theme.colors.onSurfaceVariant)
                    ]}>{tab.label}</Text>
                  </VStack>
                </Button>
              );
            })}
          </HStack>
        </GlassEffectContainer>
      </Host>

      <Host colorScheme={scheme} ignoreSafeArea="all" matchContents style={{ height: searchSize, width: searchSize }}>
        <Button
          onPress={() => open('search')}
          modifiers={[
            frame({ width: searchSize, height: searchSize }),
            buttonBorderShape('circle'),
            buttonStyle(isSelected('search') ? 'glassProminent' : 'glass')
          ]}
        >
          <Image systemName="magnifyingglass" size={25} color={theme.colors.onBackground} />
        </Button>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center'
  }
});
