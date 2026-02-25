import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Radius, FontSize, Spacing, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

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

function getVariantStyles(colors: ThemeColors) {
  return {
    primary: {
      container: {
        backgroundColor: colors.primary,
      },
      textColor: colors.primaryButtonText,
    },
    secondary: {
      container: {
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.border,
      },
      textColor: colors.foreground,
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
      },
      textColor: colors.textSecondary,
    },
    danger: {
      container: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
      },
      textColor: colors.danger,
    },
  } as const;
}

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const variantStyles = useMemo(() => getVariantStyles(colors), [colors]);

  const currentVariant = variantStyles[variant];
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
        currentVariant.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: currentVariant.textColor }, sizeStyles.text]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
