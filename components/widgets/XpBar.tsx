import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface XpBarProps {
  totalXp: number;
  level: number;
  progress: number; // 0-100
  xpToNext: number;
}

export function XpBar({ totalXp, level, progress, xpToNext }: XpBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv. {level}</Text>
        </View>
        <Text style={styles.xpText}>
          {totalXp.toLocaleString()} XP
        </Text>
      </View>
      <ProgressBar progress={progress} color={Colors.primary} height={6} />
      <Text style={styles.nextLevel}>
        {xpToNext.toLocaleString()} XP to Level {level + 1}
      </Text>
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
  levelBadge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primary,
  },
  xpText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nextLevel: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
});
