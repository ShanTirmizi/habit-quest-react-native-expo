import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSize, Spacing, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface XpBarProps {
  totalXp: number;
  level: number;
  progress: number; // 0-100
  xpToNext: number;
}

export function XpBar({ totalXp, level, progress, xpToNext }: XpBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <ProgressBar progress={progress} color={colors.primary} height={6} />
      <Text style={styles.nextLevel}>
        {xpToNext.toLocaleString()} XP to Level {level + 1}
      </Text>
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
  levelBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.extrabold,
    color: colors.primary,
  },
  xpText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  nextLevel: {
    fontSize: FontSize.xs,
    color: colors.textDim,
  },
});
