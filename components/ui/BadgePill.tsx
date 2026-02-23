import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, FontSize, Spacing } from '@/constants/theme';

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
  color = Colors.primary,
  bgColor,
  icon,
  size = 'sm',
  style,
}: BadgePillProps) {
  const bg = bgColor || `${color}15`;
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
        <Text style={[styles.icon, { fontSize: isSmall ? 10 : 12 }]}>{icon}</Text>
      ) : null}
      <Text
        style={[
          styles.label,
          {
            color,
            fontSize: isSmall ? FontSize.xs : FontSize.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '600',
  },
});
