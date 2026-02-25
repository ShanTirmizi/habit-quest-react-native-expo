import React, { forwardRef, useMemo } from 'react';
import { TextInput, View, Text, StyleSheet, ViewStyle, TextInputProps } from 'react-native';
import { Radius, FontSize, Spacing, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerStyle, style, ...props }, ref) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
      <View style={containerStyle}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          style={[styles.input, error && styles.inputError, style]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          {...props}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.base,
    color: colors.foreground,
    fontFamily: FontFamily.regular,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: FontSize.xs,
    color: colors.danger,
    marginTop: Spacing.xs,
    fontFamily: FontFamily.regular,
  },
});
