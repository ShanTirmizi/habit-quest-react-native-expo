import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { FontSize, Spacing, Radius, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const iconScale = useSharedValue(0.5);

  useEffect(() => {
    // Icon bounces in first
    iconScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 100 }));
    // Content fades up
    opacity.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(300, withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <Ionicons name={icon} size={48} color={colors.textMuted} />
      </Animated.View>
      <Animated.View style={[styles.textContainer, contentStyle]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['5xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    color: colors.foreground,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  button: {
    marginTop: Spacing.xl,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
});
