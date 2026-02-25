import React, { useMemo } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  bgColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function IconButton({
  icon,
  onPress,
  size = 22,
  color,
  bgColor,
  style,
  disabled,
  accessibilityLabel,
}: IconButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const resolvedColor = color ?? colors.foreground;
  const resolvedBgColor = bgColor ?? colors.surfaceLight;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? icon.replace(/-/g, ' ').replace(/outline$/, '').trim()}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: resolvedBgColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={resolvedColor} />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
