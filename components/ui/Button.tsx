import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Colors, Radius, FontSize, Spacing, FontFamily } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  style,
  fullWidth,
}: ButtonProps) {
  const variantStyles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityLabel={loading ? `${title}, loading` : title}
      style={({ pressed }) => [
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: variantStyles.textColor }, sizeStyles.text]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const VARIANT_STYLES = {
  primary: {
    container: {
      backgroundColor: Colors.primary,
    },
    textColor: '#FFFFFF',
  },
  secondary: {
    container: {
      backgroundColor: Colors.surfaceLight,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    textColor: Colors.foreground,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    textColor: Colors.textSecondary,
  },
  danger: {
    container: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    textColor: Colors.danger,
  },
} as const;

const SIZE_STYLES = {
  sm: {
    container: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    text: {
      fontSize: FontSize.xs,
    },
  },
  md: {
    container: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 2,
    },
    text: {
      fontSize: FontSize.sm,
    },
  },
  lg: {
    container: {
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
    },
    text: {
      fontSize: FontSize.base,
    },
  },
} as const;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontFamily: FontFamily.semibold,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
