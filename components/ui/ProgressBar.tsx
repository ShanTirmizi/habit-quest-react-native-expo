import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors, Radius } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // 0-100
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
  glowColor?: string;
}

export function ProgressBar({
  progress,
  color = Colors.primary,
  trackColor = Colors.surfaceLight,
  height = 8,
  style,
  animated = true,
  glowColor,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const widthProgress = useSharedValue(animated ? 0 : clampedProgress);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      widthProgress.value = withTiming(clampedProgress, {
        duration: 600,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    } else {
      widthProgress.value = clampedProgress;
    }
  }, [clampedProgress, animated]);

  useEffect(() => {
    if (glowColor) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800 }),
          withTiming(0.8, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      glowOpacity.value = 0;
    }
  }, [glowColor]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthProgress.value}%` as any,
    backgroundColor: color,
    height,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View
      style={[styles.track, { backgroundColor: trackColor, height }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedProgress) }}
    >
      {glowColor ? (
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: glowColor, height: height + 4 },
            glowStyle,
          ]}
        />
      ) : null}
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    width: '100%',
    position: 'relative',
  },
  fill: {
    borderRadius: Radius.full,
  },
  glow: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    borderRadius: Radius.full,
  },
});
