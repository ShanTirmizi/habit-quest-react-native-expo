import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface HealthBarProps {
  currentHp: number;
  maxHp: number;
  compact?: boolean;
}

export function HealthBar({ currentHp, maxHp, compact }: HealthBarProps) {
  const percentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
  const hpColor =
    percentage > 60 ? Colors.hpHigh : percentage > 30 ? Colors.hpMedium : Colors.hpLow;
  const isCritical = percentage <= 20;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Ionicons name="heart" size={14} color={hpColor} />
        <ProgressBar progress={percentage} color={hpColor} height={4} style={styles.compactBar} />
        <Text style={[styles.compactText, { color: hpColor }]}>
          {currentHp}/{maxHp}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons name="heart" size={16} color={hpColor} />
          <Text style={styles.label}>HP</Text>
        </View>
        <Text style={[styles.value, { color: hpColor }]}>
          {currentHp}/{maxHp}
        </Text>
      </View>
      <ProgressBar progress={percentage} color={hpColor} height={6} />
      {isCritical ? (
        <View style={styles.criticalRow}>
          <Ionicons name="warning-outline" size={12} color={Colors.danger} />
          <Text style={styles.criticalText}>Critical! Complete habits to heal.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  value: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  criticalText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
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
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'right',
  },
});
