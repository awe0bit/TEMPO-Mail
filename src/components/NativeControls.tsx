import { Button, Host, Image, Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, buttonBorderShape, buttonStyle, controlSize, disabled, frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import type { ComponentProps } from 'react';
import { StyleProp, useWindowDimensions, ViewStyle } from 'react-native';

export function NativeGlassButton({ label, systemImage, onPress, prominent = false, isDisabled = false, wide = false, style }: { label: string; systemImage?: ComponentProps<typeof Button>['systemImage']; onPress(): void; prominent?: boolean; isDisabled?: boolean; wide?: boolean; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const controlWidth = Math.min(Math.max(width - 40, 240), 480);
  const height = wide ? 52 : 44;
  return (
    <Host matchContents={!wide} style={[{ height, alignSelf: wide ? 'center' : undefined, width: wide ? controlWidth : undefined }, style]} useViewportSizeMeasurement={wide}>
      <Button label={label} systemImage={systemImage} onPress={onPress} modifiers={[frame({ width: wide ? controlWidth : undefined, height }), controlSize(wide ? 'large' : 'regular'), buttonBorderShape('capsule'), buttonStyle(prominent ? 'glassProminent' : 'glass'), disabled(isDisabled)]} />
    </Host>
  );
}

export function NativeGlassIconButton({ label, systemImage, onPress, prominent = false, isDisabled = false, size = 48, style }: { label: string; systemImage: ComponentProps<typeof Image>['systemName']; onPress(): void; prominent?: boolean; isDisabled?: boolean; size?: 44 | 48; style?: StyleProp<ViewStyle> }) {
  return (
    <Host matchContents style={[{ width: size, height: size }, style]}>
      <Button onPress={onPress} modifiers={[frame({ width: size, height: size }), controlSize('regular'), buttonBorderShape('circle'), buttonStyle(prominent ? 'glassProminent' : 'glass'), disabled(isDisabled), accessibilityLabel(label)]}>
        <Image systemName={systemImage} size={size === 44 ? 19 : 21} />
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
