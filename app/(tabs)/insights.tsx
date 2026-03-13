import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Skeleton } from '@/components/ui/Skeleton';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, getCategoryColors, type ThemeColors } from '@/constants/theme';
import { GradientCard } from '@/components/ui/GradientCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BadgePill } from '@/components/ui/BadgePill';
import { BentoGrid } from '@/components/ui/BentoGrid';
import { BentoCell } from '@/components/ui/BentoCell';
import { OversizedMetric } from '@/components/ui/OversizedMetric';
import { CoachPanel } from '@/components/ai-coach/CoachPanel';
import { getWeeklyBoss, getWeekStart } from '@/data/weekly-bosses';
import type { HabitCategory } from '@/types';
import type { Id } from '@/convex/_generated/dataModel';

type InsightsTab = 'overview' | 'history' | 'achievements' | 'gamification';

const TAB_CHIPS: { value: InsightsTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'overview', label: 'Overview', icon: 'grid-outline' },
  { value: 'history', label: 'History', icon: 'calendar-outline' },
  { value: 'achievements', label: 'Achievements', icon: 'trophy-outline' },
  { value: 'gamification', label: 'Skills', icon: 'sparkles-outline' },
];

// Static achievement definitions (what achievements exist)
const ACHIEVEMENT_DEFINITIONS: { id: string; name: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { id: 'first_step', name: 'First Step', icon: 'footsteps-outline', description: 'Complete your first habit' },
  { id: 'consistent', name: 'Consistent', icon: 'calendar-outline', description: '7-day streak' },
  { id: 'dedicated', name: 'Dedicated', icon: 'fitness-outline', description: '14-day streak' },
  { id: 'well_rounded', name: 'Well-Rounded', icon: 'color-palette-outline', description: 'Complete all 4 categories' },
  { id: 'xp_hunter', name: 'XP Hunter', icon: 'flash-outline', description: 'Earn 1,000 XP' },
  { id: 'perfect_week', name: 'Perfect Week', icon: 'trophy-outline', description: '100% completion for 7 days' },
  { id: 'marathon', name: 'Marathon', icon: 'walk-outline', description: '30-day streak' },
  { id: 'xp_master', name: 'XP Master', icon: 'diamond-outline', description: 'Earn 5,000 XP' },
  { id: 'centurion', name: 'Centurion', icon: 'medal-outline', description: '100 total completions' },
];

// Static skill definitions (what skills exist)
const SKILL_DEFINITIONS: { id: string; name: string; category: string; xpCost: number; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { id: 'iron_will', name: 'Iron Will', category: 'discipline', xpCost: 500, icon: 'shield-outline', description: '+5% XP bonus' },
  { id: 'streak_guardian', name: 'Streak Guardian', category: 'discipline', xpCost: 750, icon: 'lock-closed-outline', description: '+1 streak freeze/week' },
  { id: 'momentum', name: 'Momentum Master', category: 'discipline', xpCost: 1000, icon: 'rocket-outline', description: '+10% for 3+ habits/day' },
  { id: 'vitality', name: 'Vitality', category: 'wellness', xpCost: 500, icon: 'heart-outline', description: '+10% health habits' },
  { id: 'rest_mastery', name: 'Rest Mastery', category: 'wellness', xpCost: 750, icon: 'bed-outline', description: '+1 rest day/week' },
  { id: 'scholar', name: 'Scholar', category: 'growth', xpCost: 500, icon: 'library-outline', description: '+10% career/mind' },
  { id: 'harmony', name: 'Harmony', category: 'balance', xpCost: 500, icon: 'infinite-outline', description: '+10% life habits' },
];

// Helper: get dates for the last 7 days as YYYY-MM-DD strings
function getLast7Days(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Helper: get day name from date string
function getDayName(dateStr: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(dateStr).getDay()];
}

// Compute weekly stats from real habit data
function computeWeeklyStats(habits: Array<{ category: HabitCategory; xpReward: number; completedDates: string[] }>) {
  const last7Days = getLast7Days();
  const last7DaysSet = new Set(last7Days);

  let totalCompletions = 0;
  let totalPossible = 0;
  const categoryCompletions: Record<HabitCategory, number> = { health: 0, career: 0, mind: 0, life: 0 };
  const categoryTotals: Record<HabitCategory, number> = { health: 0, career: 0, mind: 0, life: 0 };
  const dayCompletionCounts: Record<string, number> = {};
  let totalXpEarned = 0;

  for (const habit of habits) {
    totalPossible += 7;
    categoryTotals[habit.category] += 7;

    for (const dateStr of habit.completedDates) {
      if (last7DaysSet.has(dateStr)) {
        totalCompletions++;
        categoryCompletions[habit.category]++;
        dayCompletionCounts[dateStr] = (dayCompletionCounts[dateStr] ?? 0) + 1;
        totalXpEarned += habit.xpReward;
      }
    }
  }

  const rate = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;

  let bestDay = 'N/A';
  let bestDayCount = 0;
  for (const [dateStr, count] of Object.entries(dayCompletionCounts)) {
    if (count > bestDayCount) {
      bestDayCount = count;
      bestDay = getDayName(dateStr);
    }
  }

  const categories: Record<HabitCategory, number> = {
    health: categoryTotals.health > 0 ? Math.round((categoryCompletions.health / categoryTotals.health) * 100) : 0,
    career: categoryTotals.career > 0 ? Math.round((categoryCompletions.career / categoryTotals.career) * 100) : 0,
    mind: categoryTotals.mind > 0 ? Math.round((categoryCompletions.mind / categoryTotals.mind) * 100) : 0,
    life: categoryTotals.life > 0 ? Math.round((categoryCompletions.life / categoryTotals.life) * 100) : 0,
  };

  return {
    completions: totalCompletions,
    total: totalPossible,
    rate,
    xpEarned: totalXpEarned,
    bestDay,
    categories,
  };
}

// ─── Animated Vertical Bar ────────────────────────────────────────────────────
function AnimatedBar({ percentage, color, label, delay, colors, styles, isDark }: { percentage: number; color: string; label: string; delay: number; colors: ThemeColors; styles: ReturnType<typeof createStyles>; isDark: boolean }) {
  const MAX_HEIGHT = 100;
  const barHeight = useSharedValue(0);

  useEffect(() => {
    barHeight.value = withDelay(
      delay,
      withTiming((percentage / 100) * MAX_HEIGHT, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [percentage]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    height: barHeight.value,
  }));

  return (
    <View style={styles.barColumn}>
      <Text style={[styles.barPercent, { color: isDark ? color : '#FFFFFF' }]}>{percentage}%</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: isDark ? color : '#FFFFFF' }, animatedBarStyle]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<InsightsTab>('overview');
  const { userId } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const progress = useQuery(
    api.progress.getProgress,
    userId ? { userId } : 'skip'
  );
  const habits = useQuery(
    api.habits.getHabits,
    userId ? { userId } : 'skip'
  );

  const isLoading = progress === undefined || habits === undefined;


  if (!userId) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Please sign in to view insights.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
        </View>
        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
          <Skeleton width="30%" height={14} />
          <Skeleton height={120} borderRadius={Radius.lg} />
          <Skeleton height={120} borderRadius={Radius.lg} />
          <Skeleton height={120} borderRadius={Radius.lg} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      {/* Tab Chips */}
      <View style={styles.chipContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {TAB_CHIPS.map((chip) => {
            const isActive = tab === chip.value;
            return (
              <Pressable
                key={chip.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  setTab(chip.value);
                }}
                style={[
                  styles.chip,
                  isActive ? styles.chipActive : styles.chipInactive,
                ]}
              >
                <Ionicons
                  name={chip.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : colors.textMuted}
                />
                <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {tab === 'overview' ? <OverviewTab userId={userId} progress={progress} habits={habits ?? []} colors={colors} styles={styles} isDark={isDark} /> : null}
          {tab === 'history' ? <HistoryTab userId={userId} habits={habits ?? []} colors={colors} styles={styles} isDark={isDark} /> : null}
          {tab === 'achievements' ? <AchievementsTab userId={userId} progress={progress} colors={colors} styles={styles} isDark={isDark} /> : null}
          {tab === 'gamification' ? <GamificationTab userId={userId} progress={progress} colors={colors} styles={styles} isDark={isDark} /> : null}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface OverviewTabProps {
  userId: Id<'users'>;
  progress: {
    totalXp: number;
    level: number;
    currentHp: number;
    maxHp: number;
    weeklyBossProgress?: {
      bossId: string;
      currentDamage: number;
      defeated: boolean;
      weekStart: string;
    };
  } | null;
  habits: Array<{ category: HabitCategory; xpReward: number; completedDates: string[] }>;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  isDark: boolean;
}

function OverviewTab({ userId, progress, habits, colors, styles, isDark }: OverviewTabProps) {
  const stats = useMemo(() => computeWeeklyStats(habits), [habits]);
  const CATEGORY_COLORS = useMemo(() => getCategoryColors(colors), [colors]);

  // Boss icon pulse animation (only when not defeated)
  const bossIconScale = useSharedValue(1);

  const bossIconPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bossIconScale.value }],
  }));

  // Get current weekly boss info
  const weeklyBoss = getWeeklyBoss();
  const weekStart = getWeekStart();
  const bossProgress = progress?.weeklyBossProgress;
  const isSameWeekBoss = bossProgress && bossProgress.weekStart === weekStart;

  const bossData = {
    name: weeklyBoss.name,
    icon: 'skull-outline' as keyof typeof Ionicons.glyphMap,
    progress: isSameWeekBoss
      ? Math.min(Math.round((bossProgress.currentDamage / weeklyBoss.requiredCompletions) * 100), 100)
      : 0,
    completions: isSameWeekBoss ? bossProgress.currentDamage : 0,
    required: weeklyBoss.requiredCompletions,
    defeated: isSameWeekBoss ? bossProgress.defeated : false,
  };

  // Start or stop pulse based on defeated state
  useEffect(() => {
    if (!bossData.defeated) {
      bossIconScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // repeat forever
      );
    } else {
      bossIconScale.value = withTiming(1, { duration: 200 });
    }
  }, [bossData.defeated]);

  return (
    <View style={styles.tabContent}>
      {/* ── Dr. Sage AI Coach ── */}
      <CoachPanel userId={userId} />

      {/* ── Weekly Boss Card (dramatic) ── */}
      <GradientCard
        gradient={isDark ? (bossData.defeated ? [`${colors.success}20`, 'transparent'] : [`${colors.danger}20`, 'transparent']) : undefined}
        glowColor={bossData.defeated ? colors.success : undefined}
        style={!isDark ? { backgroundColor: bossData.defeated ? colors.categoryHealthCard : colors.categoryMindCard } : undefined}
      >
        <View style={styles.bossRow}>
          <Animated.View style={bossIconPulseStyle}>
            <Ionicons name={bossData.icon} size={36} color={isDark ? (bossData.defeated ? colors.success : colors.danger) : '#FFFFFF'} />
          </Animated.View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <View style={styles.bossNameRow}>
              <Text style={[styles.bossName, { color: isDark ? (bossData.defeated ? colors.success : colors.danger) : '#FFFFFF' }]}>
                {bossData.name}
              </Text>
              {bossData.defeated ? (
                <BadgePill label="DEFEATED" color={isDark ? colors.success : '#FFFFFF'} />
              ) : null}
            </View>
            <ProgressBar
              progress={bossData.progress}
              color={isDark ? (bossData.defeated ? colors.success : colors.danger) : '#FFFFFF'}
              height={14}
              glowColor={isDark ? (bossData.defeated ? colors.success : colors.danger) : undefined}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </View>
        <View style={styles.bossDamageRow}>
          <Text style={[styles.bossDamageNumber, { color: isDark ? (bossData.defeated ? colors.success : colors.danger) : '#FFFFFF' }]}>
            {bossData.completions}
          </Text>
          <Text style={[styles.bossDamageSlash, !isDark && { color: 'rgba(255,255,255,0.5)' }]}>/</Text>
          <Text style={[styles.bossDamageNumber, { color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.70)' }]}>
            {bossData.required}
          </Text>
          <Text style={[styles.bossDamageLabel, !isDark && { color: 'rgba(255,255,255,0.70)' }]}>hits</Text>
        </View>
      </GradientCard>

      {/* ── Weekly Summary: 2x2 Bento Grid ── */}
      <Text style={styles.sectionTitle}>Weekly Summary</Text>
      <BentoGrid>
        <BentoCell index={0} height={100} style={!isDark ? { backgroundColor: colors.secondary } : undefined}>
          <OversizedMetric
            value={stats.rate}
            label="Completion"
            color={isDark ? colors.secondary : '#FFFFFF'}
            labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
            suffix="%"
            size="md"
          />
        </BentoCell>
        <BentoCell index={1} height={100} style={!isDark ? { backgroundColor: colors.primary } : undefined}>
          <OversizedMetric
            value={stats.xpEarned}
            label="XP Earned"
            color={isDark ? colors.primary : '#FFFFFF'}
            labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
            suffix="XP"
            size="md"
          />
        </BentoCell>
        <BentoCell index={2} height={100} style={!isDark ? { backgroundColor: colors.accent } : undefined}>
          <OversizedMetric
            value={stats.completions}
            label="Completions"
            color={isDark ? colors.accent : '#FFFFFF'}
            labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
            size="md"
          />
        </BentoCell>
        <BentoCell index={3} height={100} style={!isDark ? { backgroundColor: colors.categoryLife } : undefined}>
          <OversizedMetric
            value={stats.bestDay}
            label="Best Day"
            color={isDark ? undefined : '#FFFFFF'}
            labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
            size="md"
          />
        </BentoCell>
      </BentoGrid>

      {/* ── Category Breakdown: Vertical Bar Chart ── */}
      <GradientCard style={!isDark ? { backgroundColor: colors.categoryCareerCard } : undefined}>
        <Text style={[styles.cardTitle, !isDark && { color: '#FFFFFF' }]}>Categories</Text>
        <View style={styles.barChart}>
          {(Object.entries(stats.categories) as [HabitCategory, number][]).map(([cat, rate], idx) => (
            <AnimatedBar
              key={cat}
              percentage={rate}
              color={CATEGORY_COLORS[cat]}
              label={cat.charAt(0).toUpperCase() + cat.slice(1)}
              delay={idx * 100}
              colors={colors}
              styles={styles}
              isDark={isDark}
            />
          ))}
        </View>
      </GradientCard>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface HistoryTabProps {
  userId: Id<'users'>;
  habits: Array<{ completedDates: string[] }>;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  isDark: boolean;
}

function computeStreakStats(habits: Array<{ completedDates: string[] }>) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let bestCurrentStreak = 0;
  let longestEverStreak = 0;
  let activeStreaksCount = 0;

  for (const habit of habits) {
    const sorted = [...habit.completedDates].sort();
    if (sorted.length === 0) continue;

    let currentStreak = 0;
    const d = new Date(today);
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (habit.completedDates.includes(dateStr)) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    if (currentStreak > bestCurrentStreak) bestCurrentStreak = currentStreak;
    if (currentStreak > 0) activeStreaksCount++;

    let longest = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        run++;
        if (run > longest) longest = run;
      } else if (diffDays > 1) {
        run = 1;
      }
    }
    if (longest > longestEverStreak) longestEverStreak = longest;
  }

  return { bestCurrentStreak, longestEverStreak, activeStreaksCount, totalHabits: habits.length };
}

function HistoryTab({ userId, habits, colors, styles, isDark }: HistoryTabProps) {
  const weeks = 8;
  const days = 7;

  const { heatData, monthLabels, gridStart } = useMemo(() => {
    const allDates: Record<string, number> = {};
    for (const habit of habits) {
      for (const dateStr of habit.completedDates) {
        allDates[dateStr] = (allDates[dateStr] ?? 0) + 1;
      }
    }

    const maxCompletions = Math.max(1, ...Object.values(allDates));

    const now = new Date();
    const todayDayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - todayDayOfWeek - (weeks - 1) * 7);

    const data: number[] = [];
    const months: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;

    for (let i = 0; i < weeks * days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const count = allDates[dateStr] ?? 0;
      data.push(count / maxCompletions);

      if (i % 7 === 0) {
        const month = d.getMonth();
        if (month !== lastMonth) {
          months.push({ label: format(d, 'MMM'), weekIdx: Math.floor(i / 7) });
          lastMonth = month;
        }
      }
    }
    return { heatData: data, monthLabels: months, gridStart: start };
  }, [habits]);

  const streakStats = useMemo(() => computeStreakStats(habits), [habits]);

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const SHOW_DAY_INDICES = [1, 3, 5];

  const todayGridIndex = useMemo(() => {
    const now = new Date();
    const diffMs = now.getTime() - gridStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < weeks * days ? diffDays : -1;
  }, [gridStart]);

  return (
    <View style={styles.tabContent}>
      {/* ── Heatmap Calendar ── */}
      <GradientCard style={!isDark ? { backgroundColor: colors.categoryHealthCard } : undefined}>
        <Text style={[styles.cardTitle, !isDark && { color: '#FFFFFF' }]}>Completion Calendar</Text>
        {/* Month labels */}
        <View style={styles.heatMonthRow}>
          <View style={{ width: 22 }} />
          <View style={{ flex: 1, position: 'relative', height: 16 }}>
            {monthLabels.map((m, i) => (
              <Text
                key={`${m.label}-${i}`}
                style={[styles.heatMonthLabel, { left: m.weekIdx * 22 }]}
              >
                {m.label}
              </Text>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {/* Day labels */}
          <View style={styles.heatDayLabels}>
            {DAY_LABELS.map((label, i) => (
              <Text key={i} style={styles.heatDayLabel}>
                {SHOW_DAY_INDICES.includes(i) ? label : ''}
              </Text>
            ))}
          </View>
          {/* Heatmap grid */}
          <View style={styles.heatMap}>
            {Array.from({ length: weeks }).map((_, weekIdx) => (
              <View key={weekIdx} style={styles.heatWeek}>
                {Array.from({ length: days }).map((_, dayIdx) => {
                  const idx = weekIdx * days + dayIdx;
                  const value = heatData[idx];
                  const opacity = value > 0.8 ? 1 : value > 0.5 ? 0.6 : value > 0.2 ? 0.3 : 0.08;
                  const isToday = idx === todayGridIndex;
                  return (
                    <View
                      key={dayIdx}
                      style={[
                        styles.heatCell,
                        { backgroundColor: isDark ? colors.primary : '#FFFFFF', opacity },
                        isToday && styles.heatCellToday,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
        {/* Legend */}
        <View style={styles.heatLegend}>
          <Text style={styles.heatLegendText}>Less</Text>
          {[0.08, 0.3, 0.6, 1].map((op) => (
            <View
              key={op}
              style={[styles.heatLegendDot, { backgroundColor: isDark ? colors.primary : '#FFFFFF', opacity: op }]}
            />
          ))}
          <Text style={styles.heatLegendText}>More</Text>
        </View>
      </GradientCard>

      {/* ── Streak Summary ── */}
      <BentoGrid>
        <BentoCell index={0} height={100} style={!isDark ? { backgroundColor: colors.primary } : undefined}>
          <OversizedMetric
            value={streakStats.bestCurrentStreak}
            label="Current Best"
            color={isDark ? undefined : '#FFFFFF'}
            labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
            size="md"
          />
        </BentoCell>
        <BentoCell index={1} height={100} style={!isDark ? { backgroundColor: colors.accent } : undefined}>
          <OversizedMetric
            value={streakStats.longestEverStreak}
            label="Longest Ever"
            color={isDark ? colors.accent : '#FFFFFF'}
            labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
            size="md"
          />
        </BentoCell>
        <BentoCell index={2} height={100} style={!isDark ? { backgroundColor: colors.categoryMind } : undefined}>
          <OversizedMetric
            value={streakStats.activeStreaksCount}
            label="Active Streaks"
            color={isDark ? colors.primary : '#FFFFFF'}
            labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
            size="md"
          />
        </BentoCell>
        <BentoCell index={3} height={100} style={!isDark ? { backgroundColor: colors.categoryLife } : undefined}>
          <OversizedMetric
            value={streakStats.totalHabits}
            label="Total Habits"
            color={isDark ? undefined : '#FFFFFF'}
            labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
            size="md"
          />
        </BentoCell>
      </BentoGrid>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface AchievementsTabProps {
  userId: Id<'users'>;
  progress: {
    achievements: string[];
  } | null;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  isDark: boolean;
}

function AchievementsTab({ userId, progress, colors, styles, isDark }: AchievementsTabProps) {
  const unlockedAchievementIds = new Set(progress?.achievements ?? []);

  const achievements = ACHIEVEMENT_DEFINITIONS.map((a) => ({
    ...a,
    unlocked: unlockedAchievementIds.has(a.id),
  }));

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;

  return (
    <View style={styles.tabContent}>
      {/* Progress counter */}
      <GradientCard
        gradient={isDark ? [`${colors.accent}20`, 'transparent'] : undefined}
        style={!isDark ? { backgroundColor: colors.accent } : undefined}
      >
        <OversizedMetric
          value={unlocked}
          label="Unlocked"
          color={isDark ? colors.accent : '#FFFFFF'}
          labelColor={isDark ? undefined : 'rgba(255,255,255,0.75)'}
          suffix={`/${total}`}
          size="lg"
        />
      </GradientCard>

      {/* Medal Grid */}
      <View style={styles.medalGrid}>
        {achievements.map((achievement, i) => (
            <Pressable
              key={achievement.id}
              style={styles.medalWrapper}
              onPress={() => Haptics.selectionAsync()}
            >
              <View
                style={[
                  styles.medal,
                  achievement.unlocked ? styles.medalUnlocked : styles.medalLocked,
                ]}
              >
                <Ionicons
                  name={achievement.icon}
                  size={28}
                  color={achievement.unlocked ? (isDark ? colors.accent : '#FFFFFF') : colors.textMuted}
                  style={!achievement.unlocked ? { opacity: 0.4 } : undefined}
                />
                {!achievement.unlocked ? (
                  <View style={styles.medalLockOverlay}>
                    <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.medalName,
                  !achievement.unlocked && { color: colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {achievement.name}
              </Text>
            </Pressable>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAMIFICATION / SKILLS TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface GamificationTabProps {
  userId: Id<'users'>;
  progress: {
    unlockedSkills?: Array<{ skillId: string; unlockedAt: string }>;
  } | null;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  isDark: boolean;
}

function GamificationTab({ userId, progress, colors, styles, isDark }: GamificationTabProps) {
  const unlockedSkillIds = new Set(
    (progress?.unlockedSkills ?? []).map((s) => s.skillId)
  );

  const skills = SKILL_DEFINITIONS.map((s) => ({
    ...s,
    unlocked: unlockedSkillIds.has(s.id),
  }));

  const categories = ['discipline', 'wellness', 'growth', 'balance'] as const;
  const categoryColors = {
    discipline: colors.danger,
    wellness: colors.categoryHealth,
    growth: colors.categoryCareer,
    balance: colors.categoryLife,
  };

  const categoryCardBgs: Record<string, string> = {
    discipline: colors.categoryMindCard,
    wellness: colors.categoryHealthCard,
    growth: colors.categoryCareerCard,
    balance: colors.categoryLifeCard,
  };

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Skill Tree</Text>
      {categories.map((cat) => {
        const catSkills = skills.filter((s) => s.category === cat);
        const catColor = categoryColors[cat];
        return (
          <GradientCard key={cat} style={!isDark ? { backgroundColor: categoryCardBgs[cat] } : undefined}>
            {/* Category header with color bar */}
            <View style={styles.skillCatHeader}>
              <View style={[styles.skillCatBar, { backgroundColor: isDark ? catColor : 'rgba(255,255,255,0.5)' }]} />
              <Text style={[styles.skillCatTitle, { color: isDark ? catColor : '#FFFFFF' }]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </View>
            <View style={styles.skillList}>
              {catSkills.map((skill, i) => (
                  <Pressable
                    key={skill.id}
                    onPress={() => Haptics.selectionAsync()}
                    style={[
                      styles.skillCard,
                      skill.unlocked ? styles.skillCardUnlocked : styles.skillCardLocked,
                    ]}
                  >
                    <View style={[styles.skillIconWrap, { backgroundColor: isDark ? (skill.unlocked ? `${catColor}20` : colors.surfaceLight) : 'rgba(255,255,255,0.25)' }]}>
                      <Ionicons
                        name={skill.icon}
                        size={20}
                        color={isDark ? (skill.unlocked ? catColor : colors.textMuted) : '#FFFFFF'}
                      />
                    </View>
                    <View style={styles.skillInfo}>
                      <Text
                        style={[
                          styles.skillName,
                          !skill.unlocked && !isDark && { color: 'rgba(255,255,255,0.6)' },
                          !skill.unlocked && isDark && { color: colors.textSecondary },
                        ]}
                      >
                        {skill.name}
                      </Text>
                      <Text style={styles.skillDesc}>{skill.description}</Text>
                    </View>
                    {skill.unlocked ? (
                      <Ionicons name="checkmark-circle" size={22} color={isDark ? colors.success : '#FFFFFF'} />
                    ) : (
                      <View style={styles.skillCostBadge}>
                        <Text style={styles.skillCostText}>{skill.xpCost} XP</Text>
                      </View>
                    )}
                  </Pressable>
              ))}
            </View>
          </GradientCard>
        );
      })}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.base,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  tabContent: {
    gap: Spacing.lg,
  },

  // ── Tab Chips ──
  chipContainer: {
    paddingBottom: Spacing.md,
  },
  chipScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.surfaceLight,
  },
  chipText: {
    fontSize: FontSize.sm,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semibold,
  },
  chipTextInactive: {
    color: colors.textMuted,
    fontFamily: FontFamily.medium,
  },

  // ── Section title ──
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    color: colors.foreground,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: colors.foreground,
    marginBottom: Spacing.md,
  },

  // ── Boss Card ──
  bossRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bossNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  bossName: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extrabold,
    color: colors.danger,
  },
  bossDamageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: 4,
  },
  bossDamageNumber: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
  },
  bossDamageSlash: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    color: colors.textMuted,
  },
  bossDamageLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textMuted,
    marginLeft: 4,
  },

  // ── Vertical Bar Chart ──
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingTop: Spacing.md,
  },
  barColumn: {
    alignItems: 'center',
    gap: 6,
    width: 50,
  },
  barPercent: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  barTrack: {
    width: 50,
    height: 100,
    backgroundColor: isDark ? colors.surfaceRaised : 'rgba(255,255,255,0.25)',
    borderRadius: Radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: Radius.sm,
  },
  barLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.80)',
  },

  // ── Heatmap ──
  heatMap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  heatWeek: {
    gap: 4,
  },
  heatCell: {
    width: 18,
    height: 18,
    borderRadius: Radius.xs,
  },
  heatCellToday: {
    borderWidth: 2,
    borderColor: isDark ? colors.primary : '#FFFFFF',
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  heatLegendText: {
    fontSize: 10,
    color: isDark ? colors.textMuted : 'rgba(255,255,255,0.70)',
    fontFamily: FontFamily.medium,
  },
  heatLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  heatMonthRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  heatMonthLabel: {
    position: 'absolute',
    fontSize: 10,
    color: isDark ? colors.textMuted : 'rgba(255,255,255,0.70)',
    fontFamily: FontFamily.medium,
  },
  heatDayLabels: {
    gap: 4,
    marginRight: 4,
    justifyContent: 'center',
  },
  heatDayLabel: {
    height: 18,
    fontSize: 10,
    color: isDark ? colors.textMuted : 'rgba(255,255,255,0.70)',
    lineHeight: 18,
    textAlign: 'right',
    width: 18,
    fontFamily: FontFamily.medium,
  },

  // ── Achievements: Circular Medals ──
  medalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  medalWrapper: {
    alignItems: 'center',
    width: 80,
  },
  medal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  medalUnlocked: {
    backgroundColor: isDark ? colors.surfaceRaised : colors.accent,
    borderWidth: 2,
    borderColor: isDark ? colors.accent : colors.accent,
    ...Shadows.glow(colors.accentGlow, 0.5),
  },
  medalLocked: {
    backgroundColor: isDark ? colors.surfaceLight : 'rgba(0,0,0,0.06)',
    borderWidth: 2,
    borderColor: isDark ? colors.textMuted : 'rgba(0,0,0,0.12)',
    borderStyle: 'dashed',
  },
  medalLockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: isDark ? colors.surfaceLight : '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  medalName: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
    textAlign: 'center',
  },

  // ── Skills / Gamification ──
  skillCatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  skillCatBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  skillCatTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skillList: {
    gap: Spacing.sm,
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  skillCardUnlocked: {
    backgroundColor: isDark ? colors.surfaceRaised : 'rgba(255,255,255,0.25)',
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
  },
  skillCardLocked: {
    backgroundColor: isDark ? colors.surfaceLight : 'rgba(255,255,255,0.12)',
  },
  skillIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: isDark ? colors.foreground : '#FFFFFF',
  },
  skillDesc: {
    fontSize: FontSize.xs,
    color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.70)',
    marginTop: 2,
  },
  skillCostBadge: {
    backgroundColor: isDark ? colors.accentBg : 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  skillCostText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: isDark ? colors.accent : '#FFFFFF',
  },
});
