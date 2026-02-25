import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, FontSize, Spacing, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface BadgePillProps {
  label: string;
  color?: string;
  bgColor?: string;
  icon?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function BadgePill({
  label,
  color,
  bgColor,
  icon,
  size = 'sm',
  style,
}: BadgePillProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const resolvedColor = color ?? colors.primary;
  const bg = bgColor || `${resolvedColor}15`;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg,
          paddingHorizontal: isSmall ? Spacing.sm : Spacing.md,
          paddingVertical: isSmall ? 2 : 4,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={isSmall ? 10 : 12} color={resolvedColor} />
      ) : null}
      <Text
        style={[
          styles.label,
          {
            color: resolvedColor,
            fontSize: isSmall ? FontSize.xs : FontSize.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    gap: 4,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontFamily: FontFamily.semibold,
  },
});
