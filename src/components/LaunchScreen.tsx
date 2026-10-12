import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type Props = {
  prepared: boolean;
  onFinished(): void;
};

export function LaunchScreen({ prepared, onFinished }: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.025, duration: 820, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.985, duration: 820, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [scale]);

  useEffect(() => {
    if (!prepared) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.045, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start(({ finished }) => { if (finished) onFinished(); });
  }, [onFinished, opacity, prepared, scale]);

  return (
    <Animated.View
      pointerEvents={prepared ? 'none' : 'auto'}
      style={[styles.screen, { backgroundColor: theme.colors.background, opacity }]}
    >
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={require('../assets/tempo-mark.png')}
            style={[styles.mark, { tintColor: theme.colors.onBackground }]}
          />
        </Animated.View>
        <Text variant="headlineMedium" style={styles.title}>TEMPO Mail</Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>你的邮箱，由你掌控。</Text>
      </View>
      <View style={styles.footer}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>自托管邮件与服务器管理</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 34
  },
  mark: {
    height: 112,
    width: 112
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.7,
    marginBottom: 7,
    marginTop: 28
  },
  footer: {
    alignItems: 'center',
    bottom: 58,
    left: 0,
    position: 'absolute',
    right: 0
  }
});
