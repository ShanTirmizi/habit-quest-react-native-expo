import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BadgePill } from '@/components/ui/BadgePill';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { getWeeklyBoss, getWeekStart } from '@/data/weekly-bosses';
import type { HabitCategory } from '@/types';
import type { Id } from '@/convex/_generated/dataModel';

type InsightsTab = 'overview' | 'history' | 'achievements' | 'gamification';

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
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <SegmentedControl
            segments={[
              { label: 'Overview', value: 'overview' },
              { label: 'History', value: 'history' },
              { label: 'Achievements', value: 'achievements' },
              { label: 'Skills', value: 'gamification' },
            ]}
            selectedValue={tab}
            onValueChange={(v) => setTab(v as InsightsTab)}
          />
        </ScrollView>
      </View>

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
      {/* Weekly Boss */}
      <GlassCard>
        <View style={styles.bossHeader}>
          <Ionicons name={bossData.icon} size={32} color={Colors.danger} />
          <View style={styles.bossInfo}>
            <Text style={styles.bossName}>{bossData.name}</Text>
            <Text style={styles.bossStatus}>
              {bossData.defeated ? 'Defeated!' : `${bossData.completions}/${bossData.required} hits`}
            </Text>
          </View>
          <BadgePill label={bossData.defeated ? 'Defeated' : 'This Week'} color={bossData.defeated ? Colors.success : Colors.danger} />
        </View>
        <ProgressBar
          progress={bossData.progress}
          color={bossData.defeated ? Colors.success : Colors.danger}
          height={8}
        />
      </GlassCard>

      {/* Weekly Summary */}
      <GlassCard>
        <Text style={styles.cardTitle}>Weekly Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats.rate}%</Text>
            <Text style={styles.summaryLabel}>Completion</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {stats.xpEarned}
            </Text>
            <Text style={styles.summaryLabel}>XP Earned</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.accent }]}>
              {stats.completions}
            </Text>
            <Text style={styles.summaryLabel}>Completions</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats.bestDay}</Text>
            <Text style={styles.summaryLabel}>Best Day</Text>
          </View>
        </View>
      </GlassCard>

      {/* Category Breakdown */}
      <GlassCard>
        <Text style={styles.cardTitle}>Categories</Text>
        <View style={styles.categoryList}>
          {(Object.entries(stats.categories) as [HabitCategory, number][]).map(([cat, rate]) => (
            <View key={cat} style={styles.categoryRow}>
              <Text style={[styles.categoryLabel, { color: CATEGORY_COLORS[cat] }]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
              <View style={styles.categoryBarContainer}>
                <ProgressBar
                  progress={rate}
                  color={CATEGORY_COLORS[cat]}
                  height={6}
                />
              </View>
              <Text style={styles.categoryPercent}>{rate}%</Text>
            </View>
          ))}
        </View>
      </GlassCard>
    </View>
  );
}

interface HistoryTabProps {
  userId: Id<'users'>;
  habits: Array<{ completedDates: string[] }>;
}

function HistoryTab({ userId, habits }: HistoryTabProps) {
  // Build real heat map data from habit completions over last 8 weeks
  const weeks = 8;
  const days = 7;

  const heatData = useMemo(() => {
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
    const gridStart = new Date(now);
    gridStart.setDate(now.getDate() - todayDayOfWeek - (weeks - 1) * 7);

    const data: number[] = [];
    for (let i = 0; i < weeks * days; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const count = allDates[dateStr] ?? 0;
      data.push(count / maxCompletions);
    }
    return data;
  }, [habits]);

  return (
    <View style={styles.tabContent}>
      <GlassCard>
        <Text style={styles.cardTitle}>Completion Calendar</Text>
        <View style={styles.heatMap}>
          {Array.from({ length: weeks }).map((_, weekIdx) => (
            <View key={weekIdx} style={styles.heatWeek}>
              {Array.from({ length: days }).map((_, dayIdx) => {
                const value = heatData[weekIdx * days + dayIdx];
                const opacity = value > 0.8 ? 1 : value > 0.5 ? 0.6 : value > 0.2 ? 0.3 : 0.08;
                return (
                  <View
                    key={dayIdx}
                    style={[
                      styles.heatCell,
                      { backgroundColor: Colors.primary, opacity },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.heatLegend}>
          <Text style={styles.heatLegendText}>Less</Text>
          {[0.08, 0.3, 0.6, 1].map((op) => (
            <View
              key={op}
              style={[styles.heatLegendCell, { backgroundColor: Colors.primary, opacity: op }]}
            />
          ))}
          <Text style={styles.heatLegendText}>More</Text>
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>Streak History</Text>
        <Text style={styles.placeholderText}>
          Detailed streak analytics coming soon. Your completion data is being tracked in real time.
        </Text>
      </GlassCard>
    </View>
  );
}

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
      <View style={styles.achievementHeader}>
        <Text style={styles.achievementCount}>
          {unlocked}/{total} Unlocked
        </Text>
        <ProgressBar
          progress={(unlocked / total) * 100}
          color={Colors.accent}
          height={4}
          style={{ flex: 1, marginLeft: Spacing.md }}
        />
      </View>

      <View style={styles.achievementGrid}>
        {achievements.map((achievement) => (
          <GlassCard
            key={achievement.id}
            style={{
              ...styles.achievementCard,
              ...(!achievement.unlocked ? styles.achievementLocked : {}),
            }}
          >
            <Ionicons
              name={achievement.icon}
              size={28}
              color={achievement.unlocked ? Colors.accent : Colors.textDim}
              style={!achievement.unlocked ? { opacity: 0.3 } : undefined}
            />
            <Text
              style={[
                styles.achievementName,
                !achievement.unlocked && { color: Colors.textDim },
              ]}
              numberOfLines={1}
            >
              {achievement.name}
            </Text>
            <Text style={styles.achievementDesc} numberOfLines={2}>
              {achievement.description}
            </Text>
          </GlassCard>
        ))}
      </View>
    </View>
  );
}

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
      <Text style={styles.skillTreeTitle}>Skill Tree</Text>
      {categories.map((cat) => {
        const catSkills = skills.filter((s) => s.category === cat);
        return (
          <GlassCard key={cat}>
            <Text style={[styles.skillCategoryTitle, { color: categoryColors[cat] }]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
            <View style={styles.skillList}>
              {catSkills.map((skill) => (
                <View
                  key={skill.id}
                  style={[styles.skillItem, skill.unlocked && styles.skillItemUnlocked]}
                >
                  <Ionicons name={skill.icon} size={20} color={skill.unlocked ? categoryColors[cat] : Colors.textMuted} />
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
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  ) : (
                    <Text style={styles.skillCost}>{skill.xpCost} XP</Text>
                  )}
                </View>
              ))}
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.foreground,
  },
  tabContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
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
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  // Boss
  bossHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  bossIcon: {
    width: 32,
    alignItems: 'center',
  },
  bossInfo: {
    flex: 1,
  },
  bossName: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.foreground,
  },
  bossStatus: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  // Summary
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.foreground,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Categories
  categoryList: {
    gap: Spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  categoryLabel: {
    width: 60,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  categoryBarContainer: {
    flex: 1,
  },
  categoryPercent: {
    width: 36,
    textAlign: 'right',
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.foreground,
  },
  // Heat map
  heatMap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
  },
  heatWeek: {
    gap: 3,
  },
  heatCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  heatLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.md,
  },
  heatLegendText: {
    fontSize: 10,
    color: Colors.textDim,
  },
  heatLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  placeholderText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  // Achievements
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  achievementCount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
    minWidth: 80,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  achievementCard: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.md,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    marginBottom: Spacing.xs,
  },
  achievementName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.foreground,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  // Skills
  skillTreeTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.foreground,
  },
  skillCategoryTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skillList: {
    gap: Spacing.sm,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceLight,
    opacity: 0.6,
  },
  skillItemUnlocked: {
    opacity: 1,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  skillIcon: {
    width: 20,
    alignItems: 'center',
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.foreground,
  },
  skillDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  skillCost: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
  },
});
