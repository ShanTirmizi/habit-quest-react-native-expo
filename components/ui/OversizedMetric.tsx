import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontFamily } from '@/constants/theme';

interface OversizedMetricProps {
  value: string | number;
  label: string;
  color?: string;
  size?: 'md' | 'lg' | 'xl';
  suffix?: string;
  labelColor?: string;
}

const SIZE_MAP = {
  md: FontSize['3xl'],
  lg: FontSize['4xl'],
  xl: FontSize['5xl'],
};

export function OversizedMetric({
  value,
  label,
  color = Colors.foreground,
  size = 'lg',
  suffix,
  labelColor = Colors.textMuted,
}: OversizedMetricProps) {
  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontSize: SIZE_MAP[size], color }]}>
          {value}
        </Text>
        {suffix ? (
          <Text style={[styles.suffix, { color }]}>{suffix}</Text>
        ) : null}
      </View>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  value: {
    fontFamily: FontFamily.extrabold,
    lineHeight: undefined,
  },
  suffix: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    marginBottom: 6,
    marginLeft: 2,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
