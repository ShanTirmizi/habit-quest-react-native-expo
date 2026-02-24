import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, FontSize, Spacing, Radius, FontFamily, Shadows } from '@/constants/theme';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { GradientCard } from '@/components/ui/GradientCard';
import { HabitCard } from '@/components/habits/HabitCard';
import { HabitDetailSheet } from '@/components/habits/HabitDetailSheet';
import { AddHabitSheet } from '@/components/habits/AddHabitSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { CompanionWidget } from '@/components/widgets/CompanionWidget';
import { OracleChallengeCard } from '@/components/widgets/OracleChallengeCard';
import { UnderworldOverlay } from '@/components/overlays/UnderworldOverlay';
import { LevelUpCelebration } from '@/components/overlays/LevelUpCelebration';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import type { Habit, HabitCategory, Goal } from '@/types';
import { GOAL_CATEGORY_CONFIG } from '@/types';

const SPECIES_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  treant: 'leaf',
  phoenix: 'flame',
  owl: 'moon',
  keeper: 'flower',
};

const SPECIES_COLOR: Record<string, string> = {
  treant: Colors.categoryHealth,
  phoenix: Colors.accent,
  owl: Colors.categoryMind,
  keeper: Colors.categoryLife,
};

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  content: '😌',
  sleepy: '😴',
  worried: '😟',
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, userId, user } = useAuth();
  const { showToast } = useToast();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompanionSheet, setShowCompanionSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(0);
  const missedChecked = useRef(false);

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'Adventurer';

  const rawHabits = useQuery(api.habits.getHabits, userId ? { userId } : 'skip');
  const progress = useQuery(api.progress.getProgress, userId ? { userId } : 'skip');
  const companion = useQuery(api.companions.getCompanion, userId ? { userId } : 'skip');
  const rawGoals = useQuery(api.goals.getGoals, userId ? { userId } : 'skip');

  const activeGoals = useMemo(() => {
    if (!rawGoals) return [];
    return rawGoals
      .filter((g: any) => g.status === 'active')
      .map((g: any) => ({
        id: g._id as string,
        title: g.title as string,
        category: g.category as string,
        targetDate: g.targetDate as string,
        milestones: g.milestones as any[] | undefined,
      }));
  }, [rawGoals]);

  const addHabitMutation = useMutation(api.habits.addHabit);
  const toggleCompletionMutation = useMutation(api.habits.toggleCompletion);
  const deleteHabitMutation = useMutation(api.habits.deleteHabit);
  const addNoteMutation = useMutation(api.habits.addNote);
  const addXpMutation = useMutation(api.progress.addXp);
  const checkMissedMutation = useMutation(api.progress.checkMissedHabitsOnLogin);

  useEffect(() => {
    if (userId && !missedChecked.current) {
      missedChecked.current = true;
      checkMissedMutation({ userId })
        .then((result) => {
          if (result.missedCount > 0) {
            showToast(
              `Missed ${result.missedCount} habit${result.missedCount > 1 ? 's' : ''} — lost ${result.hpLost} HP`,
              undefined,
              'hp',
            );
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  const habits: Habit[] = useMemo(() => {
    if (!rawHabits) return [];
    return rawHabits.map((h) => ({
      id: h._id,
      name: h.name,
      category: h.category as HabitCategory,
      xpReward: h.xpReward,
      streak: h.streak,
      completedDates: h.completedDates ?? [],
      createdAt: h._creationTime ? new Date(h._creationTime).toISOString() : '',
      frequency: h.frequency as Habit['frequency'],
      timeOfDay: h.timeOfDay as Habit['timeOfDay'],
      notes: h.notes as Habit['notes'],
      scaledDown: h.scaledDown as Habit['scaledDown'],
      location: h.location,
      trigger: h.trigger,
      rationale: h.rationale,
    }));
  }, [rawHabits]);

  const completedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const habit of habits) {
      if (habit.completedDates.includes(todayDate)) {
        ids.add(habit.id);
      }
    }
    return ids;
  }, [habits, todayDate]);

  const pendingHabits = useMemo(
    () => habits.filter((h) => !completedIds.has(h.id)),
    [habits, completedIds]
  );

  const completedHabits = useMemo(
    () => habits.filter((h) => completedIds.has(h.id)),
    [habits, completedIds]
  );

  const longestStreak = useMemo(
    () => Math.max(0, ...habits.map((h) => h.streak)),
    [habits]
  );

  const totalXp = progress?.totalXp ?? 0;
  const level = progress?.level ?? 0;
  const currentHp = progress?.currentHp ?? 100;
  const maxHp = progress?.maxHp ?? 100;
  const xpForCurrentLevel = level * level * 100;
  const xpForNextLevel = (level + 1) * (level + 1) * 100;
  const xpToNext = xpForNextLevel - totalXp;
  const xpProgress = xpForNextLevel > xpForCurrentLevel
    ? Math.round(((totalXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100)
    : 0;

  const completionRate = habits.length > 0
    ? Math.round((completedIds.size / habits.length) * 100)
    : 0;

  const hpPercent = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 100;
  const hpColor = hpPercent > 60 ? Colors.hpHigh : hpPercent > 30 ? Colors.hpMedium : Colors.hpLow;

  const handleToggle = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      const result = await toggleCompletionMutation({
        habitId: id as any,
        userId,
        date: todayDate,
      });

      if (result.completed) {
        const habit = habits.find((h) => h.id === id);
        if (habit) {
          showToast(`${habit.name} completed!`, habit.xpReward, 'xp');

          try {
            const xpResult = await addXpMutation({ userId, amount: habit.xpReward });
            if (xpResult.leveledUp) {
              setLevelUpLevel(xpResult.newLevel);
              setLevelUpVisible(true);
            }
          } catch {}
        }
      }
    } catch (err) {
      showToast('Failed to toggle habit', undefined, 'error');
    }
  }, [userId, todayDate, toggleCompletionMutation, habits, showToast, addXpMutation]);

  const handleAddHabit = useCallback(
    async (habitData: {
      name: string;
      category: HabitCategory;
      xpReward: number;
      frequency?: { type: string; daysOfWeek?: number[]; timesPerWeek?: number };
      timeOfDay?: string;
      location?: string;
      trigger?: string;
    }) => {
      if (!userId) return;
      try {
        await addHabitMutation({
          userId,
          name: habitData.name,
          category: habitData.category,
          xpReward: habitData.xpReward,
          frequency: habitData.frequency as any,
          timeOfDay: habitData.timeOfDay as any,
          location: habitData.location,
          trigger: habitData.trigger,
        });
        showToast('Habit created!', undefined, 'xp');
      } catch (err) {
        showToast('Failed to add habit', undefined, 'error');
      }
    },
    [userId, addHabitMutation, showToast]
  );

  const handleDeleteHabit = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteHabitMutation({ habitId: id as any, userId });
      showToast('Habit deleted', undefined, 'hp');
    } catch {
      showToast('Failed to delete habit', undefined, 'error');
    }
  }, [userId, deleteHabitMutation, showToast]);

  const handleAddNote = useCallback(async (habitId: string, text: string) => {
    if (!userId) return;
    try {
      await addNoteMutation({ habitId: habitId as any, userId, text });
      showToast('Note added', undefined, 'xp');
    } catch {
      showToast('Failed to add note', undefined, 'error');
    }
  }, [userId, addNoteMutation, showToast]);

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const result = await checkMissedMutation({ userId });
      if (result.missedCount > 0) {
        showToast(
          `Missed ${result.missedCount} habit${result.missedCount > 1 ? 's' : ''} — lost ${result.hpLost} HP`,
          undefined,
          'hp',
        );
      }
    } catch {}
    setRefreshing(false);
  }, [userId, checkMissedMutation, showToast]);

  const isLoading = rawHabits === undefined || progress === undefined;
  const allDone = pendingHabits.length === 0 && habits.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top bar: Dr. Sage left, settings + add right ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {companion ? (
            <Pressable
              onPress={() => setShowCompanionSheet(true)}
              style={({ pressed }) => [styles.sageButton, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Open Dr. Sage companion"
              accessibilityRole="button"
            >
              <View style={[styles.sageAvatar, { borderColor: SPECIES_COLOR[companion.species] || Colors.primary }]}>
                <Ionicons
                  name={SPECIES_ICON[companion.species] || 'paw'}
                  size={18}
                  color={SPECIES_COLOR[companion.species] || Colors.primary}
                />
              </View>
              <Text style={styles.sageMoodBadge}>
                {MOOD_EMOJI[companion.mood] || '😊'}
              </Text>
            </Pressable>
          ) : companion === null ? (
            <Pressable
              onPress={() => setShowCompanionSheet(true)}
              style={({ pressed }) => [styles.sageButton, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Choose companion"
              accessibilityRole="button"
            >
              <View style={[styles.sageAvatar, { borderColor: Colors.primary }]}>
                <Ionicons name="paw" size={18} color={Colors.primary} />
              </View>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarGreeting} numberOfLines={1}>{timeGreeting}, {firstName}</Text>
        </View>
        <View style={styles.topBarRight}>
          <Pressable
            onPress={() => setShowSettings(true)}
            style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddSheet(true);
            }}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            accessibilityLabel="Add new habit"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonDashboard />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          {/* ── Compact Stats Strip ── */}
          {habits.length > 0 ? (
            <View style={styles.statsStrip}>
              {/* Level ring */}
              <View style={styles.statsItem}>
                <CircularProgress
                  progress={xpProgress}
                  size={44}
                  strokeWidth={4}
                  color={Colors.primary}
                  trackColor={Colors.surfaceRaised}
                >
                  <Text style={styles.statsLevelNum}>{level}</Text>
                </CircularProgress>
                <Text style={styles.statsItemLabel}>LVL</Text>
              </View>

              {/* Divider */}
              <View style={styles.statsDivider} />

              {/* XP */}
              <View style={styles.statsItem}>
                <Text style={styles.statsValue}>{totalXp.toLocaleString()}</Text>
                <Text style={styles.statsItemLabel}>XP</Text>
              </View>

              {/* Divider */}
              <View style={styles.statsDivider} />

              {/* HP mini bar */}
              <View style={styles.statsItemWide}>
                <View style={styles.hpRow}>
                  <Ionicons name="heart" size={14} color={hpColor} />
                  <Text style={[styles.statsValue, { color: hpColor }]}>
                    {currentHp}
                  </Text>
                </View>
                <ProgressBar progress={hpPercent} color={hpColor} height={4} />
              </View>

              {/* Divider */}
              <View style={styles.statsDivider} />

              {/* Completion */}
              <View style={styles.statsItem}>
                <Text style={[styles.statsValue, { color: completionRate === 100 ? Colors.success : Colors.secondary }]}>
                  {completedIds.size}/{habits.length}
                </Text>
                <Text style={styles.statsItemLabel}>DONE</Text>
              </View>

              {/* Divider */}
              <View style={styles.statsDivider} />

              {/* Streak */}
              <View style={styles.statsItem}>
                <Text style={[styles.statsValue, { color: Colors.accent }]}>
                  {longestStreak}
                </Text>
                <Text style={styles.statsItemLabel}>STREAK</Text>
              </View>
            </View>
          ) : null}

          {/* Underworld Overlay */}
          {userId ? <UnderworldOverlay userId={userId} /> : null}

          {/* ── Habits (the main content, immediately visible) ── */}
          {habits.length === 0 ? (
            <EmptyState
              icon="flame-outline"
              title="No habits yet"
              description="Start your journey by creating your first habit. Small steps lead to big changes!"
              actionLabel="Create First Habit"
              onAction={() => setShowAddSheet(true)}
            />
          ) : (
            <View style={styles.habitSection}>
              {/* All Done Banner */}
              {allDone ? (
                <GradientCard
                  gradient={['rgba(0, 230, 118, 0.15)', 'rgba(255, 184, 0, 0.10)']}
                  glowColor={Colors.success}
                >
                  <View style={styles.allDoneBanner}>
                    <Ionicons name="trophy" size={40} color={Colors.accent} />
                    <Text style={styles.allDoneTitle}>All Done!</Text>
                    <Text style={styles.allDoneText}>
                      You&apos;ve completed all habits for today. Amazing work!
                    </Text>
                  </View>
                </GradientCard>
              ) : null}

              {/* Pending Habits */}
              {pendingHabits.length > 0 ? (
                <View style={styles.habitGroup}>
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionDividerText}>
                      PENDING ({pendingHabits.length})
                    </Text>
                  </View>
                  <View style={styles.habitList}>
                    {pendingHabits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        isCompleted={false}
                        onToggle={handleToggle}
                        onPress={setSelectedHabit}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Completed Habits */}
              {completedHabits.length > 0 ? (
                <View style={styles.habitGroup}>
                  <View style={styles.sectionDivider}>
                    <Text style={styles.sectionDividerText}>
                      COMPLETED ({completedHabits.length})
                    </Text>
                  </View>
                  <View style={styles.habitList}>
                    {completedHabits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        isCompleted={true}
                        onToggle={handleToggle}
                        onPress={setSelectedHabit}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* ── Active Goals Strip ── */}
          {activeGoals.length > 0 ? (
            <View style={styles.goalsSection}>
              <View style={styles.goalsSectionHeader}>
                <Text style={styles.goalsSectionTitle}>Active Goals</Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/goals')}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.goalsSeeAll}>See all</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.goalsScroll}
              >
                {activeGoals.map((goal) => {
                  const catConfig = GOAL_CATEGORY_CONFIG[goal.category as keyof typeof GOAL_CATEGORY_CONFIG];
                  const daysLeft = differenceInDays(parseISO(goal.targetDate), new Date());
                  const completedM = goal.milestones?.filter((m: any) => m.completed).length ?? 0;
                  const totalM = goal.milestones?.length ?? 0;
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => router.push('/(tabs)/goals')}
                      style={({ pressed }) => [styles.goalPill, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                    >
                      <View style={[styles.goalPillIcon, { backgroundColor: catConfig?.color ? `${catConfig.color}20` : Colors.primaryBg }]}>
                        <Ionicons
                          name={(catConfig?.icon as keyof typeof Ionicons.glyphMap) || 'flag'}
                          size={14}
                          color={catConfig?.color || Colors.primary}
                        />
                      </View>
                      <View style={styles.goalPillContent}>
                        <Text style={styles.goalPillTitle} numberOfLines={1}>{goal.title}</Text>
                        <View style={styles.goalPillMeta}>
                          {totalM > 0 ? (
                            <Text style={styles.goalPillProgress}>{completedM}/{totalM}</Text>
                          ) : null}
                          <Text style={[
                            styles.goalPillDays,
                            daysLeft < 14 && { color: Colors.warning },
                            daysLeft < 0 && { color: Colors.danger },
                          ]}>
                            {daysLeft > 0 ? `${daysLeft}d` : daysLeft === 0 ? 'Today' : 'Overdue'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
                {/* Add goal pill */}
                <Pressable
                  onPress={() => router.push('/(tabs)/goals')}
                  style={({ pressed }) => [styles.goalPillAdd, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="add" size={18} color={Colors.primary} />
                </Pressable>
              </ScrollView>
            </View>
          ) : null}

          {/* Oracle Challenge */}
          {userId ? <OracleChallengeCard userId={userId} /> : null}

          {/* Bottom Spacer for floating tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Habit Detail Sheet */}
      <HabitDetailSheet
        habit={selectedHabit}
        isCompleted={selectedHabit ? completedIds.has(selectedHabit.id) : false}
        onClose={() => setSelectedHabit(null)}
        onToggle={handleToggle}
        onDelete={handleDeleteHabit}
        onAddNote={handleAddNote}
      />

      {/* Add Habit Sheet */}
      <AddHabitSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddHabit}
      />

      {/* Settings Sheet */}
      <BottomSheet visible={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <View style={styles.settingsContent}>
          <Pressable
            onPress={() => {
              setShowSettings(false);
              signOut();
            }}
            style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
          <Text style={styles.versionText}>
            HabitQuest v{Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
      </BottomSheet>

      {/* Companion Sheet (Dr. Sage) — triggered from top bar avatar */}
      {userId ? (
        <CompanionWidget
          userId={userId}
          completionRate={completionRate}
          currentHp={currentHp}
          maxHp={maxHp}
          externalVisible={showCompanionSheet}
          onExternalClose={() => setShowCompanionSheet(false)}
        />
      ) : null}

      {/* Level Up Celebration */}
      <LevelUpCelebration
        level={levelUpLevel}
        visible={levelUpVisible}
        onDismiss={() => setLevelUpVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  topBarGreeting: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sageButton: {
    position: 'relative',
  },
  sageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sageMoodBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    fontSize: 12,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow(Colors.primary, 0.3),
  },
  addButtonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    paddingTop: Spacing.lg,
  },

  // ── ScrollView ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },

  // ── Compact Stats Strip ──
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    ...Shadows.card,
  },
  statsItem: {
    alignItems: 'center',
    gap: 2,
  },
  statsItemWide: {
    alignItems: 'center',
    gap: 3,
    width: 56,
  },
  statsLevelNum: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.extrabold,
    color: Colors.primary,
  },
  statsValue: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
  },
  statsItemLabel: {
    fontSize: 9,
    fontFamily: FontFamily.semibold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  statsDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  hpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  // ── Goals Strip ──
  goalsSection: {
    gap: Spacing.sm,
  },
  goalsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalsSectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goalsSeeAll: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.primary,
  },
  goalsScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minWidth: 150,
    maxWidth: 200,
  },
  goalPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPillContent: {
    flex: 1,
    gap: 2,
  },
  goalPillTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
  },
  goalPillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalPillProgress: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: Colors.textMuted,
  },
  goalPillDays: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
  },
  goalPillAdd: {
    width: 40,
    height: '100%' as any,
    minHeight: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Habits ──
  habitSection: {
    gap: Spacing.lg,
  },
  habitGroup: {
    gap: Spacing.sm,
  },
  sectionDivider: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  sectionDividerText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  habitList: {
    gap: Spacing.sm,
  },

  // ── All Done Banner ──
  allDoneBanner: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  allDoneTitle: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: Colors.success,
  },
  allDoneText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // ── Settings Sheet ──
  settingsContent: {
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  signOutText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    color: Colors.danger,
  },
  versionText: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
    textAlign: 'center',
  },
});
