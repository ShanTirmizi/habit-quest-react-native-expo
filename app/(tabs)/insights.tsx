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
  Easing,
} from 'react-native-reanimated';
import { Skeleton } from '@/components/ui/Skeleton';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { Colors, FontSize, Spacing, Radius, FontFamily, Shadows } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/theme';
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
    // Each habit counts as 1 possible completion per day for simplicity
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

  // Find best day
  let bestDay = 'N/A';
  let bestDayCount = 0;
  for (const [dateStr, count] of Object.entries(dayCompletionCounts)) {
    if (count > bestDayCount) {
      bestDayCount = count;
      bestDay = getDayName(dateStr);
    }
  }

  // Category rates
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
function AnimatedBar({ percentage, color, label, delay }: { percentage: number; color: string; label: string; delay: number }) {
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
      <Text style={[styles.barPercent, { color }]}>{percentage}%</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: color }, animatedBarStyle]} />
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
                onPress={() => setTab(chip.value)}
                style={[
                  styles.chip,
                  isActive ? styles.chipActive : styles.chipInactive,
                ]}
              >
                <Ionicons
                  name={chip.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : Colors.textMuted}
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
        {tab === 'overview' ? <OverviewTab userId={userId} progress={progress} habits={habits ?? []} /> : null}
        {tab === 'history' ? <HistoryTab userId={userId} habits={habits ?? []} /> : null}
        {tab === 'achievements' ? <AchievementsTab userId={userId} progress={progress} /> : null}
        {tab === 'gamification' ? <GamificationTab userId={userId} progress={progress} /> : null}
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
}

function OverviewTab({ userId, progress, habits }: OverviewTabProps) {
  const stats = useMemo(() => computeWeeklyStats(habits), [habits]);

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

  return (
    <View style={styles.tabContent}>
      {/* ── Dr. Sage AI Coach ── */}
      <CoachPanel userId={userId} />

      {/* ── Weekly Boss Card (dramatic) ── */}
      <GradientCard
        gradient={bossData.defeated ? ['rgba(0,230,118,0.12)', 'transparent'] : ['rgba(255,107,107,0.12)', 'transparent']}
        glowColor={bossData.defeated ? Colors.success : undefined}
      >
        <View style={styles.bossRow}>
          <Ionicons name={bossData.icon} size={36} color={bossData.defeated ? Colors.success : Colors.danger} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <View style={styles.bossNameRow}>
              <Text style={[styles.bossName, bossData.defeated && { color: Colors.success }]}>
                {bossData.name}
              </Text>
              {bossData.defeated ? (
                <BadgePill label="DEFEATED" color={Colors.success} />
              ) : null}
            </View>
            <ProgressBar
              progress={bossData.progress}
              color={bossData.defeated ? Colors.success : Colors.danger}
              height={14}
              glowColor={bossData.defeated ? Colors.success : Colors.danger}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </View>
        <View style={styles.bossDamageRow}>
          <Text style={[styles.bossDamageNumber, { color: bossData.defeated ? Colors.success : Colors.danger }]}>
            {bossData.completions}
          </Text>
          <Text style={styles.bossDamageSlash}>/</Text>
          <Text style={[styles.bossDamageNumber, { color: Colors.textSecondary }]}>
            {bossData.required}
          </Text>
          <Text style={styles.bossDamageLabel}>hits</Text>
        </View>
      </GradientCard>

      {/* ── Weekly Summary: 2x2 Bento Grid ── */}
      <Text style={styles.sectionTitle}>Weekly Summary</Text>
      <BentoGrid>
        <BentoCell index={0}>
          <OversizedMetric
            value={stats.rate}
            label="Completion"
            color={Colors.secondary}
            suffix="%"
            size="md"
          />
        </BentoCell>
        <BentoCell index={1}>
          <OversizedMetric
            value={stats.xpEarned}
            label="XP Earned"
            color={Colors.primary}
            suffix="XP"
            size="md"
          />
        </BentoCell>
        <BentoCell index={2}>
          <OversizedMetric
            value={stats.completions}
            label="Completions"
            color={Colors.accent}
            size="md"
          />
        </BentoCell>
        <BentoCell index={3}>
          <OversizedMetric
            value={stats.bestDay}
            label="Best Day"
            size="md"
          />
        </BentoCell>
      </BentoGrid>

      {/* ── Category Breakdown: Vertical Bar Chart ── */}
      <GradientCard>
        <Text style={styles.cardTitle}>Categories</Text>
        <View style={styles.barChart}>
          {(Object.entries(stats.categories) as [HabitCategory, number][]).map(([cat, rate], idx) => (
            <AnimatedBar
              key={cat}
              percentage={rate}
              color={CATEGORY_COLORS[cat]}
              label={cat.charAt(0).toUpperCase() + cat.slice(1)}
              delay={idx * 100}
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

    // Current streak: walk backwards from today
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

    // Longest ever streak
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

function HistoryTab({ userId, habits }: HistoryTabProps) {
  // Build real heat map data from habit completions over last 8 weeks
  const weeks = 8;
  const days = 7;

  const { heatData, monthLabels, gridStart } = useMemo(() => {
    // Collect all completed dates across all habits
    const allDates: Record<string, number> = {};
    for (const habit of habits) {
      for (const dateStr of habit.completedDates) {
        allDates[dateStr] = (allDates[dateStr] ?? 0) + 1;
      }
    }

    // Find max completions in a day for normalization
    const maxCompletions = Math.max(1, ...Object.values(allDates));

    // Build 8 weeks of data ending today
    const now = new Date();
    const todayDayOfWeek = now.getDay(); // 0 = Sunday
    // Go back to the start of the grid (8 weeks ago, starting on Sunday)
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

      // Track month labels (on first day of week, i.e. Sunday)
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
  const SHOW_DAY_INDICES = [1, 3, 5]; // M, W, F

  // Determine today's index in the heatmap grid
  const todayGridIndex = useMemo(() => {
    const now = new Date();
    const diffMs = now.getTime() - gridStart.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < weeks * days ? diffDays : -1;
  }, [gridStart]);

  return (
    <View style={styles.tabContent}>
      {/* ── Heatmap Calendar ── */}
      <GradientCard>
        <Text style={styles.cardTitle}>Completion Calendar</Text>
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
                        { backgroundColor: Colors.primary, opacity },
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
              style={[styles.heatLegendDot, { backgroundColor: Colors.primary, opacity: op }]}
            />
          ))}
          <Text style={styles.heatLegendText}>More</Text>
        </View>
      </GradientCard>

      {/* ── Streak Summary: 4 oversized metrics in a row ── */}
      <BentoGrid>
        <BentoCell index={0} height={100}>
          <OversizedMetric
            value={streakStats.bestCurrentStreak}
            label="Current Best"
            size="md"
          />
        </BentoCell>
        <BentoCell index={1} height={100}>
          <OversizedMetric
            value={streakStats.longestEverStreak}
            label="Longest Ever"
            color={Colors.accent}
            size="md"
          />
        </BentoCell>
        <BentoCell index={2} height={100}>
          <OversizedMetric
            value={streakStats.activeStreaksCount}
            label="Active Streaks"
            color={Colors.primary}
            size="md"
          />
        </BentoCell>
        <BentoCell index={3} height={100}>
          <OversizedMetric
            value={streakStats.totalHabits}
            label="Total Habits"
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
}

function AchievementsTab({ userId, progress }: AchievementsTabProps) {
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
      <GradientCard gradient={['rgba(255,184,0,0.12)', 'transparent']}>
        <OversizedMetric
          value={unlocked}
          label="Unlocked"
          color={Colors.accent}
          suffix={`/${total}`}
          size="lg"
        />
      </GradientCard>

      {/* Medal Grid */}
      <View style={styles.medalGrid}>
        {achievements.map((achievement) => (
          <View key={achievement.id} style={styles.medalWrapper}>
            <View
              style={[
                styles.medal,
                achievement.unlocked ? styles.medalUnlocked : styles.medalLocked,
              ]}
            >
              <Ionicons
                name={achievement.icon}
                size={28}
                color={achievement.unlocked ? Colors.accent : Colors.textDim}
                style={!achievement.unlocked ? { opacity: 0.4 } : undefined}
              />
              {!achievement.unlocked ? (
                <View style={styles.medalLockOverlay}>
                  <Ionicons name="lock-closed" size={10} color={Colors.textDim} />
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.medalName,
                !achievement.unlocked && { color: Colors.textDim },
              ]}
              numberOfLines={1}
            >
              {achievement.name}
            </Text>
          </View>
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
}

function GamificationTab({ userId, progress }: GamificationTabProps) {
  const unlockedSkillIds = new Set(
    (progress?.unlockedSkills ?? []).map((s) => s.skillId)
  );

  const skills = SKILL_DEFINITIONS.map((s) => ({
    ...s,
    unlocked: unlockedSkillIds.has(s.id),
  }));

  const categories = ['discipline', 'wellness', 'growth', 'balance'] as const;
  const categoryColors = {
    discipline: Colors.danger,
    wellness: Colors.categoryHealth,
    growth: Colors.categoryCareer,
    balance: Colors.categoryLife,
  };

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Skill Tree</Text>
      {categories.map((cat) => {
        const catSkills = skills.filter((s) => s.category === cat);
        const catColor = categoryColors[cat];
        return (
          <GradientCard key={cat}>
            {/* Category header with color bar */}
            <View style={styles.skillCatHeader}>
              <View style={[styles.skillCatBar, { backgroundColor: catColor }]} />
              <Text style={[styles.skillCatTitle, { color: catColor }]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </View>
            <View style={styles.skillList}>
              {catSkills.map((skill) => (
                <View
                  key={skill.id}
                  style={[
                    styles.skillCard,
                    skill.unlocked ? styles.skillCardUnlocked : styles.skillCardLocked,
                  ]}
                >
                  <View style={[styles.skillIconWrap, { backgroundColor: skill.unlocked ? `${catColor}20` : Colors.surfaceLight }]}>
                    <Ionicons
                      name={skill.icon}
                      size={20}
                      color={skill.unlocked ? catColor : Colors.textMuted}
                    />
                  </View>
                  <View style={styles.skillInfo}>
                    <Text
                      style={[
                        styles.skillName,
                        !skill.unlocked && { color: Colors.textMuted },
                      ]}
                    >
                      {skill.name}
                    </Text>
                    <Text style={styles.skillDesc}>{skill.description}</Text>
                  </View>
                  {skill.unlocked ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                  ) : (
                    <View style={styles.skillCostBadge}>
                      <Text style={styles.skillCostText}>{skill.xpCost} XP</Text>
                    </View>
                  )}
                </View>
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

const styles = StyleSheet.create({
  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: Colors.foreground,
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
    backgroundColor: Colors.primary,
  },
  chipInactive: {
    backgroundColor: Colors.surfaceLight,
  },
  chipText: {
    fontSize: FontSize.sm,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semibold,
  },
  chipTextInactive: {
    color: Colors.textMuted,
    fontFamily: FontFamily.medium,
  },

  // ── Section title ──
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
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
    color: Colors.danger,
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
    color: Colors.textMuted,
  },
  bossDamageLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.textMuted,
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
    backgroundColor: Colors.surfaceRaised,
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
    color: Colors.textSecondary,
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
    borderColor: Colors.primary,
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
    color: Colors.textDim,
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
    color: Colors.textDim,
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
    color: Colors.textDim,
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
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 2,
    borderColor: Colors.accent,
    ...Shadows.glow(Colors.accentGlow, 0.5),
  },
  medalLocked: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.textDim,
    borderStyle: 'dashed',
  },
  medalLockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medalName: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
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
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  skillCardLocked: {
    backgroundColor: Colors.surfaceLight,
    opacity: 0.6,
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
    color: Colors.foreground,
  },
  skillDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  skillCostBadge: {
    backgroundColor: Colors.accentBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  skillCostText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.accent,
  },
});
