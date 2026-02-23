import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { StatsHeader } from '@/components/widgets/StatsHeader';
import { HabitCard } from '@/components/habits/HabitCard';
import { AddHabitSheet } from '@/components/habits/AddHabitSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/auth-context';
import type { Habit, HabitCategory } from '@/types';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, userId } = useAuth();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), 'EEEE, MMM d');
  const todayDate = format(new Date(), 'yyyy-MM-dd');

  // Fetch real data from Convex
  const rawHabits = useQuery(api.habits.getHabits, userId ? { userId } : 'skip');
  const progress = useQuery(api.progress.getProgress, userId ? { userId } : 'skip');

  // Mutations
  const addHabitMutation = useMutation(api.habits.addHabit);
  const toggleCompletionMutation = useMutation(api.habits.toggleCompletion);

  // Map Convex habits to the Habit type the UI expects
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

  // Determine which habits are completed today
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

  // XP / Level calculations
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

  const handleToggle = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await toggleCompletionMutation({
        habitId: id as any,
        userId,
        date: todayDate,
      });
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  }, [userId, todayDate, toggleCompletionMutation]);

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
      } catch (err) {
        console.error('Failed to add habit:', err);
      }
    },
    [userId, addHabitMutation]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Convex queries auto-refresh, just show the spinner briefly
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const isLoading = rawHabits === undefined || progress === undefined;
  const allDone = pendingHabits.length === 0 && habits.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Today&apos;s Quest</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => signOut()}
            style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddSheet(true);
            }}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <Ionicons name="add" size={24} color={Colors.background} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
          {/* Stats Header */}
          <StatsHeader
            level={level}
            totalXp={totalXp}
            xpProgress={xpProgress}
            xpToNext={xpToNext}
            currentHp={currentHp}
            maxHp={maxHp}
            todayCompleted={completedIds.size}
            todayTotal={habits.length}
            longestStreak={longestStreak}
          />

          {/* Habit List */}
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
                <GlassCard style={styles.allDoneBanner}>
                  <Ionicons name="trophy" size={32} color={Colors.accent} />
                  <Text style={styles.allDoneTitle}>All Done!</Text>
                  <Text style={styles.allDoneText}>
                    You&apos;ve completed all habits for today. Amazing work!
                  </Text>
                </GlassCard>
              ) : null}

              {/* Pending Habits */}
              {pendingHabits.length > 0 ? (
                <View style={styles.habitGroup}>
                  <Text style={styles.sectionTitle}>
                    Pending ({pendingHabits.length})
                  </Text>
                  <View style={styles.habitList}>
                    {pendingHabits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        isCompleted={false}
                        onToggle={handleToggle}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Completed Habits */}
              {completedHabits.length > 0 ? (
                <View style={styles.habitGroup}>
                  <Text style={styles.sectionTitle}>
                    Completed ({completedHabits.length})
                  </Text>
                  <View style={styles.habitList}>
                    {completedHabits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        isCompleted={true}
                        onToggle={handleToggle}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* Bottom Spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Add Habit Sheet */}
      <AddHabitSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddHabit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  greeting: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.foreground,
  },
  date: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  addButtonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  habitSection: {
    gap: Spacing.lg,
  },
  habitGroup: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs,
  },
  habitList: {
    gap: Spacing.sm,
  },
  allDoneBanner: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  allDoneTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  allDoneText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
