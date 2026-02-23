import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { HealthBar } from './HealthBar';

interface StatsHeaderProps {
  level: number;
  totalXp: number;
  xpProgress: number;
  xpToNext: number;
  currentHp: number;
  maxHp: number;
  todayCompleted: number;
  todayTotal: number;
  longestStreak: number;
}

export function StatsHeader({
  level,
  totalXp,
  xpProgress,
  xpToNext,
  currentHp,
  maxHp,
  todayCompleted,
  todayTotal,
  longestStreak,
}: StatsHeaderProps) {
  const completionPercentage = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  return (
    <GlassCard style={styles.card}>
      {/* Top Row: Level + XP */}
      <View style={styles.topRow}>
        <View style={styles.levelContainer}>
          <View style={styles.levelCircle}>
            <Text style={styles.levelNumber}>{level}</Text>
          </View>
          <View>
            <Text style={styles.levelLabel}>Level {level}</Text>
            <Text style={styles.xpTotal}>{totalXp.toLocaleString()} XP</Text>
          </View>
        </View>
        <View style={styles.statsRight}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayCompleted}/{todayTotal}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🔥 {longestStreak}</Text>
            <Text style={styles.statLabel}>Best</Text>
          </View>
        </View>
      </View>

      {/* XP Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>XP Progress</Text>
          <Text style={styles.progressText}>{xpToNext} to next</Text>
        </View>
        <ProgressBar progress={xpProgress} color={Colors.primary} height={6} />
      </View>

      {/* Health Bar */}
      <HealthBar currentHp={currentHp} maxHp={maxHp} />

      {/* Today's Completion */}
      {todayTotal > 0 ? (
        <View style={styles.completionRow}>
          <View style={styles.completionBar}>
            <ProgressBar
              progress={completionPercentage}
              color={completionPercentage === 100 ? Colors.success : Colors.accent}
              height={4}
            />
          </View>
          <Text style={[
            styles.completionText,
            completionPercentage === 100 && styles.completionTextDone,
          ]}>
            {completionPercentage === 100 ? '✨ Perfect Day!' : `${completionPercentage}%`}
          </Text>
        </View>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  levelCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryBg,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  levelLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.foreground,
  },
  xpTotal: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statsRight: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.foreground,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressText: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completionBar: {
    flex: 1,
  },
  completionText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
    minWidth: 60,
    textAlign: 'right',
  },
  completionTextDone: {
    color: Colors.success,
  },
});
