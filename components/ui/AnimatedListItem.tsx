import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface AnimatedListItemProps {
  index: number;
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export function AnimatedListItem({ index, children, delay = 80, style }: AnimatedListItemProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const itemDelay = index * delay;
    opacity.value = withDelay(
      itemDelay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
    translateY.value = withDelay(
      itemDelay,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      {children}
    </Animated.View>
  );
}
