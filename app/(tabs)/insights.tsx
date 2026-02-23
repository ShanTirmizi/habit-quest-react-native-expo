import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BadgePill } from '@/components/ui/BadgePill';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { HabitCategory } from '@/types';

type InsightsTab = 'overview' | 'history' | 'achievements' | 'gamification';

// Demo data
const DEMO_ACHIEVEMENTS: { id: string; name: string; icon: keyof typeof Ionicons.glyphMap; description: string; unlocked: boolean }[] = [
  { id: 'first_step', name: 'First Step', icon: 'footsteps-outline', description: 'Complete your first habit', unlocked: true },
  { id: 'consistent', name: 'Consistent', icon: 'calendar-outline', description: '7-day streak', unlocked: true },
  { id: 'dedicated', name: 'Dedicated', icon: 'fitness-outline', description: '14-day streak', unlocked: true },
  { id: 'well_rounded', name: 'Well-Rounded', icon: 'color-palette-outline', description: 'Complete all 4 categories', unlocked: false },
  { id: 'xp_hunter', name: 'XP Hunter', icon: 'flash-outline', description: 'Earn 1,000 XP', unlocked: true },
  { id: 'perfect_week', name: 'Perfect Week', icon: 'trophy-outline', description: '100% completion for 7 days', unlocked: false },
  { id: 'marathon', name: 'Marathon', icon: 'walk-outline', description: '30-day streak', unlocked: false },
  { id: 'xp_master', name: 'XP Master', icon: 'diamond-outline', description: 'Earn 5,000 XP', unlocked: false },
  { id: 'centurion', name: 'Centurion', icon: 'medal-outline', description: '100 total completions', unlocked: false },
];

const DEMO_SKILLS: { id: string; name: string; category: string; xpCost: number; unlocked: boolean; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { id: 'iron_will', name: 'Iron Will', category: 'discipline', xpCost: 500, unlocked: true, icon: 'shield-outline', description: '+5% XP bonus' },
  { id: 'streak_guardian', name: 'Streak Guardian', category: 'discipline', xpCost: 750, unlocked: true, icon: 'lock-closed-outline', description: '+1 streak freeze/week' },
  { id: 'momentum', name: 'Momentum Master', category: 'discipline', xpCost: 1000, unlocked: false, icon: 'rocket-outline', description: '+10% for 3+ habits/day' },
  { id: 'vitality', name: 'Vitality', category: 'wellness', xpCost: 500, unlocked: true, icon: 'heart-outline', description: '+10% health habits' },
  { id: 'rest_mastery', name: 'Rest Mastery', category: 'wellness', xpCost: 750, unlocked: false, icon: 'bed-outline', description: '+1 rest day/week' },
  { id: 'scholar', name: 'Scholar', category: 'growth', xpCost: 500, unlocked: false, icon: 'library-outline', description: '+10% career/mind' },
  { id: 'harmony', name: 'Harmony', category: 'balance', xpCost: 500, unlocked: false, icon: 'infinite-outline', description: '+10% life habits' },
];

const DEMO_WEEKLY_STATS = {
  completions: 28,
  total: 35,
  rate: 80,
  xpEarned: 620,
  bestDay: 'Monday',
  categories: {
    health: 85,
    career: 75,
    mind: 90,
    life: 70,
  } as Record<HabitCategory, number>,
};

const DEMO_BOSS = {
  name: 'Chaos Dragon',
  icon: 'skull-outline' as keyof typeof Ionicons.glyphMap,
  progress: 65,
  completions: 16,
  required: 25,
  defeated: false,
};

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<InsightsTab>('overview');

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
        {tab === 'overview' ? <OverviewTab /> : null}
        {tab === 'history' ? <HistoryTab /> : null}
        {tab === 'achievements' ? <AchievementsTab /> : null}
        {tab === 'gamification' ? <GamificationTab /> : null}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function OverviewTab() {
  const stats = DEMO_WEEKLY_STATS;
  const boss = DEMO_BOSS;

  return (
    <View style={styles.tabContent}>
      {/* Weekly Boss */}
      <GlassCard>
        <View style={styles.bossHeader}>
          <Ionicons name={boss.icon} size={32} color={Colors.danger} />
          <View style={styles.bossInfo}>
            <Text style={styles.bossName}>{boss.name}</Text>
            <Text style={styles.bossStatus}>
              {boss.completions}/{boss.required} hits
            </Text>
          </View>
          <BadgePill label="This Week" color={Colors.danger} />
        </View>
        <ProgressBar
          progress={boss.progress}
          color={Colors.danger}
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

function HistoryTab() {
  // Simplified calendar heat map
  const weeks = 8;
  const days = 7;
  const generateHeatData = () => {
    return Array.from({ length: weeks * days }, () => Math.random());
  };
  const heatData = useMemo(generateHeatData, []);

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
          Detailed streak analytics will be available once connected to the backend.
        </Text>
      </GlassCard>
    </View>
  );
}

function AchievementsTab() {
  const unlocked = DEMO_ACHIEVEMENTS.filter((a) => a.unlocked).length;
  const total = DEMO_ACHIEVEMENTS.length;

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
        {DEMO_ACHIEVEMENTS.map((achievement) => (
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

function GamificationTab() {
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
        const skills = DEMO_SKILLS.filter((s) => s.category === cat);
        return (
          <GlassCard key={cat}>
            <Text style={[styles.skillCategoryTitle, { color: categoryColors[cat] }]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
            <View style={styles.skillList}>
              {skills.map((skill) => (
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
