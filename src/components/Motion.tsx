import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export function MotionView({ children, style, distance = 10, duration = 260, delay = 0 }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  distance?: number;
  duration?: number;
  delay?: number;
}>) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress]);

  return (
    <Animated.View style={[
      style,
      {
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }]
      }
    ]}>
      {children}
    </Animated.View>
  );
}
