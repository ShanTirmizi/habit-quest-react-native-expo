import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSize, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

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
  color,
  size = 'lg',
  suffix,
  labelColor,
}: OversizedMetricProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const effectiveColor = color ?? colors.foreground;
  const effectiveLabelColor = labelColor ?? colors.textMuted;

  return (
    <View style={styles.container}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontSize: SIZE_MAP[size], color: effectiveColor }]}>
          {value}
        </Text>
        {suffix ? (
          <Text style={[styles.suffix, { color: effectiveColor }]}>{suffix}</Text>
        ) : null}
      </View>
      <Text style={[styles.label, { color: effectiveLabelColor }]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
