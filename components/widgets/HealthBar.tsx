import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, Radius, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface HealthBarProps {
  currentHp: number;
  maxHp: number;
  compact?: boolean;
}

export function HealthBar({ currentHp, maxHp, compact }: HealthBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const percentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
  const hpColor =
    percentage > 60 ? colors.hpHigh : percentage > 30 ? colors.hpMedium : colors.hpLow;
  const isCritical = percentage <= 20;

  if (compact) {
    return (
      <View style={styles.compactContainer} accessibilityLabel={`HP: ${currentHp} out of ${maxHp}${isCritical ? ', critical' : ''}`}>
        <Ionicons name="heart" size={14} color={hpColor} />
        <ProgressBar progress={percentage} color={hpColor} height={4} style={styles.compactBar} glowColor={isCritical ? colors.hpCritical : undefined} />
        <Text style={[styles.compactText, { color: hpColor }]}>
          {currentHp}/{maxHp}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLabel={`HP: ${currentHp} out of ${maxHp}${isCritical ? ', critical health warning' : ''}`}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons name="heart" size={16} color={hpColor} />
          <Text style={styles.label}>HP</Text>
        </View>
        <Text style={[styles.value, { color: hpColor }]}>
          {currentHp}/{maxHp}
        </Text>
      </View>
      <ProgressBar progress={percentage} color={hpColor} height={6} glowColor={isCritical ? colors.hpCritical : undefined} />
      {isCritical ? (
        <View style={styles.criticalRow}>
          <Ionicons name="warning-outline" size={12} color={colors.danger} />
          <Text style={styles.criticalText}>Critical! Complete habits to heal.</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  value: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  criticalText: {
    fontSize: FontSize.xs,
    color: colors.danger,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactBar: {
    flex: 1,
  },
  compactText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    minWidth: 44,
    textAlign: 'right',
  },
});
