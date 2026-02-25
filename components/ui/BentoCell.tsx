import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { BentoRadius, Shadows, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useBentoContext } from './BentoGrid';

interface BentoCellProps {
  children: React.ReactNode;
  span?: 1 | 2;
  height?: number;
  gradient?: [string, string];
  glowColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
  index?: number; // for staggered animation
}

export function BentoCell({
  children,
  span = 1,
  height,
  gradient,
  glowColor,
  onPress,
  style,
  index = 0,
}: BentoCellProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { columnWidth, gap } = useBentoContext();
  const width = span === 2 ? columnWidth * 2 + gap : columnWidth;
  const defaultHeight = span === 2 ? 100 : columnWidth;

  // Staggered entry animation
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(15);

  useEffect(() => {
    opacity.value = withDelay(
      index * 60,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    translateY.value = withDelay(
      index * 60,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const cellStyle: ViewStyle[] = [
    styles.cell,
    {
      width,
      height: height ?? defaultHeight,
    },
    glowColor ? Shadows.glow(glowColor) : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  const content = gradient ? (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[cellStyle, styles.gradient]}
    >
      {children}
    </LinearGradient>
  ) : (
    <Animated.View style={cellStyle}>
      {children}
    </Animated.View>
  );

  const wrapped = onPress ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    content
  );

  return (
    <Animated.View style={animatedStyle}>
      {wrapped}
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  cell: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: BentoRadius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  gradient: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
