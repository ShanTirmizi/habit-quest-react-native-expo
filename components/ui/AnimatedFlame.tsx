import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/theme-context';

interface AnimatedFlameProps {
  size?: number;
  color?: string;
  active?: boolean;
}

export function AnimatedFlame({
  size = 32,
  color,
  active = true,
}: AnimatedFlameProps) {
  const { colors } = useTheme();
  const effectiveColor = color ?? colors.accent;

  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false
      );
      rotate.value = withRepeat(
        withSequence(
          withTiming(3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1);
      rotate.value = withTiming(0);
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name="flame"
        size={size}
        color={active ? effectiveColor : colors.textMuted}
      />
    </Animated.View>
  );
}
