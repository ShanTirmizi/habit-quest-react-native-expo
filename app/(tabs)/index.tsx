import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { StatsHeader } from '@/components/widgets/StatsHeader';
import { HabitCard } from '@/components/habits/HabitCard';
import { AddHabitSheet } from '@/components/habits/AddHabitSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import type { Habit, HabitCategory } from '@/types';

// Demo data for UI preview
const DEMO_HABITS: Habit[] = [
  {
    id: '1',
    name: 'Morning Run',
    category: 'health',
    xpReward: 20,
    streak: 12,
    completedDates: [],
    createdAt: new Date().toISOString(),
    timeOfDay: 'morning',
    frequency: { type: 'daily' },
  },
  {
    id: '2',
    name: 'Read for 30 minutes',
    category: 'mind',
    xpReward: 15,
    streak: 8,
    completedDates: [],
    createdAt: new Date().toISOString(),
    timeOfDay: 'evening',
    frequency: { type: 'daily' },
  },
  {
    id: '3',
    name: 'Practice coding',
    category: 'career',
    xpReward: 25,
    streak: 5,
    completedDates: [],
    createdAt: new Date().toISOString(),
    timeOfDay: 'afternoon',
    frequency: { type: 'weekdays' },
  },
  {
    id: '4',
    name: 'Meditate',
    category: 'mind',
    xpReward: 15,
    streak: 21,
    completedDates: [],
    createdAt: new Date().toISOString(),
    timeOfDay: 'morning',
    frequency: { type: 'daily' },
  },
  {
    id: '5',
    name: 'Journal',
    category: 'life',
    xpReward: 10,
    streak: 3,
    completedDates: [],
    createdAt: new Date().toISOString(),
    timeOfDay: 'evening',
    frequency: { type: 'daily' },
  },
  {
    id: '6',
    name: 'Drink 8 glasses of water',
    category: 'health',
    xpReward: 10,
    streak: 30,
    completedDates: [],
    createdAt: new Date().toISOString(),
    timeOfDay: 'anytime',
    frequency: { type: 'daily' },
  },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>(DEMO_HABITS);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), 'EEEE, MMM d');

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

  const handleToggle = useCallback((id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAddHabit = useCallback(
    (habitData: {
      name: string;
      category: HabitCategory;
      xpReward: number;
      frequency?: { type: string; daysOfWeek?: number[]; timesPerWeek?: number };
      timeOfDay?: string;
    }) => {
      const newHabit: Habit = {
        id: Date.now().toString(),
        name: habitData.name,
        category: habitData.category,
        xpReward: habitData.xpReward,
        streak: 0,
        completedDates: [],
        createdAt: new Date().toISOString(),
        frequency: habitData.frequency as Habit['frequency'],
        timeOfDay: habitData.timeOfDay as Habit['timeOfDay'],
      };
      setHabits((prev) => [...prev, newHabit]);
    },
    []
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const allDone = pendingHabits.length === 0 && habits.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Today&apos;s Quest</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
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
          level={7}
          totalXp={4900}
          xpProgress={64}
          xpToNext={1800}
          currentHp={85}
          maxHp={100}
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
                <Text style={styles.allDoneEmoji}>🎉</Text>
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
  allDoneEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
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
