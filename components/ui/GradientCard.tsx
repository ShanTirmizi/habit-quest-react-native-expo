import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius, Spacing, Shadows, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface GradientCardProps {
  children: React.ReactNode;
  gradient?: [string, string];
  glowColor?: string;
  borderAccent?: string;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
}

export function GradientCard({
  children,
  gradient,
  glowColor,
  borderAccent,
  onPress,
  style,
  padding,
  elevated,
}: GradientCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const cardStyles: ViewStyle[] = [
    styles.card,
    elevated && Shadows.cardRaised,
    glowColor ? Shadows.glow(glowColor) : Shadows.card,
    borderAccent ? { borderLeftColor: borderAccent, borderLeftWidth: 3 } : undefined,
    padding !== undefined ? { padding } : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  const inner = gradient ? (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={cardStyles}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={cardStyles}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
