import { Button, Host, Image, Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, buttonStyle, disabled, frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps } from 'react';
import { StyleProp, useWindowDimensions, ViewStyle } from 'react-native';

export function NativeGlassButton({ label, systemImage, onPress, prominent = false, isDisabled = false, wide = false, style }: { label: string; systemImage?: ComponentProps<typeof Button>['systemImage']; onPress(): void; prominent?: boolean; isDisabled?: boolean; wide?: boolean; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const controlWidth = Math.min(Math.max(width - 40, 240), 480);
  return (
    <Host matchContents={!wide} style={[{ height: 52, alignSelf: wide ? 'center' : undefined, width: wide ? controlWidth : undefined }, style]} useViewportSizeMeasurement={wide}>
      <Button label={label} systemImage={systemImage} onPress={onPress} modifiers={[frame({ width: wide ? controlWidth : undefined, minHeight: 48 }), buttonStyle(prominent ? 'glassProminent' : 'glass'), disabled(isDisabled)]} />
    </Host>
  );
}

export function NativeGlassIconButton({ label, systemImage, onPress, prominent = false, isDisabled = false, size = 56, style }: { label: string; systemImage: ComponentProps<typeof Image>['systemName']; onPress(): void; prominent?: boolean; isDisabled?: boolean; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Host matchContents style={[{ width: size, height: size }, style]}>
      <Button onPress={onPress} modifiers={[frame({ width: size, height: size }), buttonStyle(prominent ? 'glassProminent' : 'glass'), disabled(isDisabled), accessibilityLabel(label)]}>
        <Image systemName={systemImage} size={22} />
      </Button>
    </Host>
  );
}

export function NativeSegmentedControl({ value, onChange, options }: { value: string; onChange(value: string): void; options: { value: string; label: string }[] }) {
  return (
    <Host style={{ height: 42, marginHorizontal: 16 }} useViewportSizeMeasurement>
      <Picker selection={value} onSelectionChange={(selection) => onChange(selection ?? value)} modifiers={[pickerStyle('segmented'), frame({ maxWidth: 1000 })]}>
        {options.map((option) => <Text key={option.value} modifiers={[tag(option.value)]}>{option.label}</Text>)}
      </Picker>
    </Host>
  );
}
