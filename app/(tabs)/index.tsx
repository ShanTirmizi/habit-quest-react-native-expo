import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { HabitCard } from '@/components/habits/HabitCard';
import { DraggableHabitList } from '@/components/habits/DraggableHabitList';
import { HabitDetailSheet } from '@/components/habits/HabitDetailSheet';
import { AddHabitSheet } from '@/components/habits/AddHabitSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { CompanionWidget } from '@/components/widgets/CompanionWidget';
import { OracleChallengeCard } from '@/components/widgets/OracleChallengeCard';
import { UnderworldOverlay } from '@/components/overlays/UnderworldOverlay';
import { LevelUpCelebration } from '@/components/overlays/LevelUpCelebration';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import type { Habit, HabitCategory, Goal, TimeOfDay, ReflectionMood, MicroReflection } from '@/types';
import { GOAL_CATEGORY_CONFIG } from '@/types';
import { buildScheduleMap, type HabitScheduleInfo } from '@/lib/habit-scheduling';
import { buildChainFollowersMap, resolveFullChain } from '@/lib/habit-chains';
import { buildAutomaticityMap, type AutomaticityInfo } from '@/lib/automaticity';
import { detectKeystones, type KeystoneInfo } from '@/lib/keystone-detection';
import { analyzeDifficulty, type DifficultySuggestion } from '@/lib/adaptive-difficulty';
import { generateCompassionMessage, type CompassionMessage } from '@/lib/compassion-engine';
import { CompassionCard } from '@/components/widgets/CompassionCard';
import { MicroReflectionPrompt } from '@/components/habits/MicroReflectionPrompt';

const TIME_SECTION_META: Record<TimeOfDay, { label: string; icon: keyof typeof Ionicons.glyphMap; order: number }> = {
  morning:   { label: 'Morning',   icon: 'sunny-outline',         order: 0 },
  afternoon: { label: 'Afternoon', icon: 'partly-sunny-outline',  order: 1 },
  evening:   { label: 'Evening',   icon: 'moon-outline',          order: 2 },
  anytime:   { label: 'Anytime',   icon: 'time-outline',          order: 3 },
};

// Chronological time slots (anytime excluded — always last)
const CHRONO_SLOTS: TimeOfDay[] = ['morning', 'afternoon', 'evening'];

function getCurrentTimeSection(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  return 'evening';
}

/**
 * Smart section ordering:
 * 1. Current time section (what you should do NOW)
 * 2. Upcoming sections in chronological order (what's next today)
 * 3. Past sections (already missed the window, but still doable)
 * 4. Anytime (always last — no time pressure)
 */
function getSmartSectionOrder(current: TimeOfDay): TimeOfDay[] {
  const currentIdx = CHRONO_SLOTS.indexOf(current);
  const upcoming = CHRONO_SLOTS.slice(currentIdx + 1);
  const past = CHRONO_SLOTS.slice(0, currentIdx);
  return [current, ...upcoming, ...past, 'anytime'];
}

function getSectionStatus(key: TimeOfDay, current: TimeOfDay): 'current' | 'upcoming' | 'past' | 'anytime' {
  if (key === 'anytime') return 'anytime';
  if (key === current) return 'current';
  const keyIdx = CHRONO_SLOTS.indexOf(key);
  const curIdx = CHRONO_SLOTS.indexOf(current);
  return keyIdx > curIdx ? 'upcoming' : 'past';
}

const SPECIES_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  treant: 'leaf',
  phoenix: 'flame',
  owl: 'moon',
  keeper: 'flower',
};

const MOOD_EMOJI: Record<string, string> = {
  happy: '\u{1F60A}',
  content: '\u{1F60C}',
  sleepy: '\u{1F634}',
  worried: '\u{1F61F}',
};

function getSpeciesColor(species: string, colors: ThemeColors): string {
  const map: Record<string, string> = {
    treant: colors.categoryHealth,
    phoenix: colors.accent,
    owl: colors.categoryMind,
    keeper: colors.categoryLife,
  };
  return map[species] || colors.primary;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId, user } = useAuth();
  const { showToast } = useToast();
  usePushNotifications(userId);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const [showCompanionSheet, setShowCompanionSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(0);
  const [showHibernated, setShowHibernated] = useState(false);
  const missedChecked = useRef(false);

  const todayDate = format(new Date(), 'yyyy-MM-dd');

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'Adventurer';

  const rawHabits = useQuery(api.habits.getHabits, userId ? { userId } : 'skip');
  const progress = useQuery(api.progress.getProgress, userId ? { userId } : 'skip');
  const companion = useQuery(api.companions.getCompanion, userId ? { userId } : 'skip');
  const rawGoals = useQuery(api.goals.getGoals, userId ? { userId } : 'skip');
  const holidayStatus = useQuery(api.progress.getHolidayStatus, userId ? { userId } : 'skip');
  const startHolidayMutation = useMutation(api.progress.startHoliday);
  const endHolidayMutation = useMutation(api.progress.endHoliday);
  const autoEndHolidayMutation = useMutation(api.progress.autoEndHoliday);

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
  const reorderHabitsMutation = useMutation(api.habits.reorderHabits);
  const hibernateHabitMutation = useMutation(api.habits.hibernateHabit);
  const wakeHabitMutation = useMutation(api.habits.wakeHabit);
  const useStreakFreezeMutation = useMutation(api.progress.useStreakFreeze);
  const checkMissedMutation = useMutation(api.progress.checkMissedHabitsOnLogin);

  useEffect(() => {
    if (userId && !missedChecked.current) {
      missedChecked.current = true;
      checkMissedMutation({ userId, clientDate: new Date().toISOString().split('T')[0] })
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

  // Holiday mode
  const isOnHoliday = holidayStatus?.active === true;

  // Auto-end expired holiday
  useEffect(() => {
    if (userId && holidayStatus?.expired) {
      autoEndHolidayMutation({ userId }).catch(() => {});
    }
  }, [userId, holidayStatus?.expired]);

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
      sortOrder: h.sortOrder,
      chainedToHabitId: h.chainedToHabitId,
      rewardBundle: h.rewardBundle,
      hibernatedAt: h.hibernatedAt,
    }));
  }, [rawHabits]);

  // Filter out hibernated habits for the active dashboard
  const activeHabits = useMemo(
    () => habits.filter((h) => !h.hibernatedAt),
    [habits]
  );
  const hibernatedHabits = useMemo(
    () => habits.filter((h) => !!h.hibernatedAt),
    [habits]
  );

  // Map habit IDs to names for chain badge resolution
  const chainNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of habits) map.set(h.id, h.name);
    return map;
  }, [habits]);


  // Reverse chain map: habit ID -> full list of downstream chained habits
  const chainFollowersMap = useMemo(() => {
    if (habits.length === 0) return new Map<string, Habit[]>();
    const rawMap = buildChainFollowersMap(habits);
    const fullMap = new Map<string, Habit[]>();
    for (const [id] of rawMap) {
      fullMap.set(id, resolveFullChain(id, rawMap));
    }
    return fullMap;
  }, [habits]);

  // Smart scheduling: determine which habits should appear today
  const scheduleMap = useMemo(() => {
    if (activeHabits.length === 0) return new Map<string, HabitScheduleInfo>();
    return buildScheduleMap(activeHabits, new Date(), todayDate);
  }, [activeHabits, todayDate]);

  // Pre-compute which habits are completed today (needed before visibility filtering)
  const todayCompletedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const h of activeHabits) {
      if (h.completedDates.includes(todayDate)) ids.add(h.id);
    }
    return ids;
  }, [activeHabits, todayDate]);

  // Only show habits the scheduler marks as visible
  // Also hide chained habits whose parent hasn't been completed yet today
  const visibleHabits = useMemo(() => {
    return activeHabits.filter((h) => {
      // Schedule-based visibility
      if (scheduleMap.size > 0) {
        const info = scheduleMap.get(h.id);
        if (info && !info.visible) return false;
      }
      // Chain-based visibility: hide if parent habit isn't completed today
      if (h.chainedToHabitId) {
        const parentCompleted = todayCompletedIds.has(h.chainedToHabitId);
        if (!parentCompleted) return false;
      }
      return true;
    });
  }, [activeHabits, scheduleMap, todayCompletedIds]);

  // Automaticity scores for all habits
  const automaticityMap = useMemo(() => {
    if (habits.length === 0) return new Map<string, AutomaticityInfo>();
    return buildAutomaticityMap(habits, todayDate);
  }, [habits, todayDate]);

  // Phase 2: Keystone detection
  const keystoneMap = useMemo(() => {
    if (activeHabits.length < 2) return new Map<string, KeystoneInfo>();
    return detectKeystones(activeHabits);
  }, [activeHabits]);

  // Phase 2: Adaptive difficulty suggestions
  const difficultyMap = useMemo(() => {
    if (activeHabits.length === 0) return new Map<string, DifficultySuggestion>();
    return analyzeDifficulty(activeHabits);
  }, [activeHabits]);

  // Phase 2: Compassion engine state
  const [compassionDismissed, setCompassionDismissed] = useState(false);

  // Phase 2: Micro-reflection state
  const [reflectionHabit, setReflectionHabit] = useState<Habit | null>(null);
  const addReflectionMutation = useMutation(api.habits.addMicroReflection);

  const completedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const habit of visibleHabits) {
      if (habit.completedDates.includes(todayDate)) {
        ids.add(habit.id);
      }
    }
    return ids;
  }, [visibleHabits, todayDate]);

  const pendingHabits = useMemo(
    () => visibleHabits.filter((h) => !completedIds.has(h.id)),
    [visibleHabits, completedIds]
  );

  const completedHabits = useMemo(
    () => visibleHabits.filter((h) => completedIds.has(h.id)),
    [visibleHabits, completedIds]
  );

  // Group habits by time of day
  const currentTimeSection = useMemo(() => getCurrentTimeSection(), []);
  const [collapsedSections, setCollapsedSections] = useState<Set<TimeOfDay>>(new Set());

  const toggleSection = useCallback((section: TimeOfDay) => {
    Haptics.selectionAsync();
    setUserToggledSections((prev) => new Set([...prev, section]));
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const groupedHabits = useMemo(() => {
    const groups: Record<TimeOfDay, { pending: Habit[]; completed: Habit[] }> = {
      morning: { pending: [], completed: [] },
      afternoon: { pending: [], completed: [] },
      evening: { pending: [], completed: [] },
      anytime: { pending: [], completed: [] },
    };
    for (const h of visibleHabits) {
      const tod: TimeOfDay = h.timeOfDay || 'anytime';
      const isComplete = completedIds.has(h.id);
      if (isComplete) groups[tod].completed.push(h);
      else groups[tod].pending.push(h);
    }
    return groups;
  }, [visibleHabits, completedIds]);

  // Smart-ordered sections: current first, upcoming next, past last, anytime always end
  const smartOrder = useMemo(() => getSmartSectionOrder(currentTimeSection), [currentTimeSection]);

  const activeSections = useMemo(() => {
    return smartOrder
      .filter((key) => {
        const g = groupedHabits[key];
        return g.pending.length > 0 || g.completed.length > 0;
      })
      .map((key) => ({
        key,
        ...TIME_SECTION_META[key],
        status: getSectionStatus(key, currentTimeSection),
      }));
  }, [smartOrder, groupedHabits, currentTimeSection]);

  // Auto-collapse sections where all habits are completed (user can still expand them)
  const [userToggledSections, setUserToggledSections] = useState<Set<TimeOfDay>>(new Set());

  const isSectionCollapsed = useCallback((key: TimeOfDay) => {
    // If user explicitly toggled it, respect that
    if (userToggledSections.has(key)) return collapsedSections.has(key);
    // Auto-collapse fully completed sections (except the current one)
    const g = groupedHabits[key];
    const allDone = g.pending.length === 0 && g.completed.length > 0;
    return allDone && key !== currentTimeSection;
  }, [userToggledSections, collapsedSections, groupedHabits, currentTimeSection]);

  const streakFreezes = progress?.streakFreezes ?? 0;

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

  const completionRate = visibleHabits.length > 0
    ? Math.round((completedIds.size / visibleHabits.length) * 100)
    : 0;

  const hpPercent = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 100;
  const hpColor = hpPercent > 60 ? colors.hpHigh : hpPercent > 30 ? colors.hpMedium : colors.hpLow;

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
          const toastMsg = habit.rewardBundle
            ? `${habit.name} done! Time for: ${habit.rewardBundle}`
            : `${habit.name} completed!`;
          showToast(toastMsg, habit.xpReward, 'xp');

          // Phase 2: Trigger micro-reflection prompt
          setReflectionHabit(habit);

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
      chainedToHabitId?: string;
      rewardBundle?: string;
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
          chainedToHabitId: habitData.chainedToHabitId as any,
          rewardBundle: habitData.rewardBundle,
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

  const handleToggleHoliday = useCallback(async () => {
    if (!userId) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isOnHoliday) {
        await endHolidayMutation({ userId });
        showToast('Welcome back! Streaks resumed', undefined, 'xp');
      } else {
        await startHolidayMutation({ userId });
        showToast('Holiday mode on — streaks are safe!', undefined, 'hp');
      }
    } catch {
      showToast('Failed to toggle holiday mode', undefined, 'error');
    }
  }, [userId, isOnHoliday, startHolidayMutation, endHolidayMutation, showToast]);

  const handleHibernate = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await hibernateHabitMutation({ habitId: id as any, userId });
      showToast('Habit hibernated', undefined, 'hp');
    } catch {
      showToast('Failed to hibernate', undefined, 'error');
    }
  }, [userId, hibernateHabitMutation, showToast]);

  const handleWake = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await wakeHabitMutation({ habitId: id as any, userId });
      showToast('Habit reactivated!', undefined, 'xp');
    } catch {
      showToast('Failed to wake habit', undefined, 'error');
    }
  }, [userId, wakeHabitMutation, showToast]);

  const handleUseStreakFreeze = useCallback(async () => {
    if (!userId) return;
    try {
      await useStreakFreezeMutation({ userId });
      showToast('Streak freeze used!', undefined, 'xp');
    } catch {
      showToast('No streak freezes available', undefined, 'error');
    }
  }, [userId, useStreakFreezeMutation, showToast]);

  // Phase 2: Micro-reflection handler
  const handleReflection = useCallback(async (mood: ReflectionMood) => {
    if (!userId || !reflectionHabit) return;
    try {
      await addReflectionMutation({
        userId,
        habitId: reflectionHabit.id as any,
        mood,
        date: todayDate,
      });
    } catch {}
    setReflectionHabit(null);
  }, [userId, reflectionHabit, todayDate, addReflectionMutation]);

  // Phase 2: Compassion message (computed when there were missed habits)
  const compassionMessage = useMemo<CompassionMessage | null>(() => {
    if (compassionDismissed || !progress || habits.length === 0) return null;
    // Check if user missed habits yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    const missedYesterday = activeHabits.filter(
      (h) => !h.completedDates.includes(yesterdayStr) && !h.hibernatedAt
    ).length;
    if (missedYesterday === 0) return null;
    // Find how many days since any habit was completed
    let lastCompletionDate = '';
    for (const h of habits) {
      for (const d of h.completedDates) {
        if (d > lastCompletionDate) lastCompletionDate = d;
      }
    }
    const daysSinceLastCompletion = lastCompletionDate
      ? differenceInDays(new Date(), parseISO(lastCompletionDate))
      : 999;
    return generateCompassionMessage({
      missedCount: missedYesterday,
      totalHabits: activeHabits.length,
      currentHp: progress.currentHp,
      maxHp: progress.maxHp,
      longestActiveStreak: Math.max(0, ...habits.map((h) => h.streak)),
      totalCompletionsAllTime: habits.reduce((s, h) => s + h.completedDates.length, 0),
      daysSinceLastCompletion,
      habits,
    });
  }, [compassionDismissed, progress, habits, activeHabits]);

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

  const handleReorder = useCallback(async (reorderedPending: Habit[]) => {
    if (!userId) return;
    try {
      // Build full ordered list: iterate time sections, use reorderedPending for the matching section
      const allIds: string[] = [];
      const allSectionKeys: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'anytime'];
      for (const key of allSectionKeys) {
        const group = groupedHabits[key];
        // Check if reorderedPending belongs to this section
        const reorderedIds = new Set(reorderedPending.map((h) => h.id));
        const sectionPendingIds = group.pending.map((h) => h.id);
        const isThisSection = sectionPendingIds.length > 0 && sectionPendingIds.some((id) => reorderedIds.has(id));

        if (isThisSection) {
          allIds.push(...reorderedPending.map((h) => h.id));
        } else {
          allIds.push(...group.pending.map((h) => h.id));
        }
        allIds.push(...group.completed.map((h) => h.id));
      }
      await reorderHabitsMutation({
        userId,
        habitIds: allIds as any,
      });
    } catch {}
  }, [userId, reorderHabitsMutation, groupedHabits]);

  const isLoading = rawHabits === undefined || progress === undefined;
  const allDone = pendingHabits.length === 0 && visibleHabits.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top bar: Dr. Sage left, settings + add right ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {companion ? (
            <Pressable
              onPress={() => setShowCompanionSheet(true)}
              style={({ pressed }) => [styles.sageButton, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
              accessibilityLabel="Open Dr. Sage companion"
              accessibilityRole="button"
            >
              <View style={[styles.sageAvatar, { borderColor: colors.primary }]}>
                <Ionicons
                  name="chatbubble-ellipses"
                  size={18}
                  color={colors.primary}
                />
              </View>
            </Pressable>
          ) : companion === null ? (
            <Pressable
              onPress={() => setShowCompanionSheet(true)}
              style={({ pressed }) => [styles.sageButton, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
              accessibilityLabel="Choose companion"
              accessibilityRole="button"
            >
              <View style={[styles.sageAvatar, { borderColor: colors.primary }]}>
                <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
              </View>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarGreeting} numberOfLines={1}>{timeGreeting}, {firstName}</Text>
        </View>
        <View style={styles.topBarRight}>
          <Pressable
            onPress={handleToggleHoliday}
            style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            accessibilityLabel={isOnHoliday ? "End holiday mode" : "Start holiday mode"}
            accessibilityRole="button"
          >
            <Ionicons
              name={isOnHoliday ? 'airplane' : 'airplane-outline'}
              size={20}
              color={isOnHoliday ? '#9C27B0' : colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
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
        <NestableScrollContainer
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── Compact Stats Strip ── */}
          {habits.length > 0 ? (
            <View style={styles.statsStrip}>
              {/* Level ring */}
              <View style={styles.statsItem}>
                <View style={styles.statsValueArea}>
                  <CircularProgress
                    progress={xpProgress}
                    size={36}
                    strokeWidth={3}
                    color={colors.primary}
                    trackColor={colors.surfaceRaised}
                  >
                    <Text style={styles.statsLevelNum}>{level}</Text>
                  </CircularProgress>
                </View>
                <Text style={styles.statsItemLabel}>LVL</Text>
              </View>

              {/* Divider */}
              <View style={styles.statsDivider} />

              {/* XP */}
              <View style={styles.statsItem}>
                <View style={styles.statsValueArea}>
                  <Text style={styles.statsValue}>{totalXp.toLocaleString()}</Text>
                </View>
                <Text style={styles.statsItemLabel}>XP</Text>
              </View>

              {/* Divider */}
              <View style={styles.statsDivider} />

              {/* HP mini bar */}
              <View style={styles.statsItem}>
                <View style={styles.statsValueArea}>
                  <View style={styles.hpRow}>
                    <Ionicons name="heart" size={14} color={hpColor} />
                    <Text style={[styles.statsValue, { color: hpColor }]}>
                      {currentHp}
                    </Text>
                  </View>
                  <View style={{ width: '80%' }}>
                    <ProgressBar progress={hpPercent} color={hpColor} height={3} />
                  </View>
                </View>
                <Text style={styles.statsItemLabel}>HP</Text>
              </View>

              {/* Divider */}
              <View style={styles.statsDivider} />

              {/* Completion */}
              <View style={styles.statsItem}>
                <View style={styles.statsValueArea}>
                  <Text style={[styles.statsValue, { color: completionRate === 100 ? colors.success : colors.secondary }]}>
                    {completedIds.size}/{visibleHabits.length}
                  </Text>
                </View>
                <Text style={styles.statsItemLabel}>DONE</Text>
              </View>

              {/* Divider */}
              <View style={styles.statsDivider} />

              {/* Streak */}
              <View style={styles.statsItem}>
                <View style={styles.statsValueArea}>
                  <Text style={[styles.statsValue, { color: colors.accent }]}>
                    {longestStreak}
                  </Text>
                </View>
                <View style={styles.streakLabelRow}>
                  <Text style={styles.statsItemLabel}>STREAK</Text>
                  {streakFreezes > 0 ? (
                    <View style={styles.freezeIndicator}>
                      <Ionicons name="snow-outline" size={9} color={colors.info} />
                      <Text style={styles.freezeCount}>{streakFreezes}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}

          {/* Holiday Mode Banner */}
          {isOnHoliday ? (
            <Pressable
              onPress={handleToggleHoliday}
              style={({ pressed }) => [styles.holidayBanner, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.holidayBannerContent}>
                <View style={styles.holidayBannerLeft}>
                  <Ionicons name="airplane" size={18} color="#9C27B0" />
                  <View>
                    <Text style={styles.holidayBannerTitle}>Holiday Mode Active</Text>
                    <Text style={styles.holidayBannerSubtitle}>
                      Streaks frozen, no HP damage
                      {holidayStatus?.endDate ? ` \u00B7 Until ${format(parseISO(holidayStatus.endDate), 'MMM d')}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.holidayEndBtn}>
                  <Text style={styles.holidayEndBtnText}>End</Text>
                </View>
              </View>
            </Pressable>
          ) : null}

          {/* Underworld Overlay */}
          {userId ? <UnderworldOverlay userId={userId} /> : null}

          {/* ── Phase 2: Compassion Card (takes priority) or Fresh Start Banner ── */}
          {compassionMessage && !compassionDismissed ? (
            <CompassionCard
              message={compassionMessage}
              onAction={() => {
                setCompassionDismissed(true);
                if (compassionMessage.suggestedHabitId) {
                  const h = habits.find((hab) => hab.id === compassionMessage.suggestedHabitId);
                  if (h) setSelectedHabit(h);
                }
              }}
              onDismiss={() => setCompassionDismissed(true)}
            />
          ) : null}

          {/* ── Phase 2: Micro-Reflection Prompt ── */}
          {reflectionHabit ? (
            <MicroReflectionPrompt
              habitName={reflectionHabit.name}
              onSelect={handleReflection}
              onDismiss={() => setReflectionHabit(null)}
            />
          ) : null}

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
                <View style={styles.allDoneCard}>
                  <View style={styles.allDoneBanner}>
                    <Ionicons name="trophy" size={40} color="#fff" />
                    <Text style={styles.allDoneTitle}>All Done!</Text>
                    <Text style={styles.allDoneText}>
                      You&apos;ve completed all habits for today. Amazing work!
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Time-of-day grouped habits (active, non-hibernated) */}
              {activeSections.map((section, sectionIdx) => {
                const group = groupedHabits[section.key];
                const total = group.pending.length + group.completed.length;
                const done = group.completed.length;
                const isCollapsed = isSectionCollapsed(section.key);
                const isCurrent = section.status === 'current';
                const isPast = section.status === 'past';
                const allSectionDone = done === total;

                // "Up Next" = first upcoming section with pending habits
                const isUpNext = !isCurrent && section.status === 'upcoming' && group.pending.length > 0
                  && !activeSections.slice(0, sectionIdx).some(
                    (s) => s.status === 'upcoming' && groupedHabits[s.key].pending.length > 0
                  );

                return (
                  <View key={section.key} style={[styles.habitGroup, isPast && styles.habitGroupPast]}>
                    {/* Section header */}
                    <Pressable
                      onPress={() => toggleSection(section.key)}
                      style={[
                        styles.timeHeader,
                        isCurrent && !allSectionDone && styles.timeHeaderCurrent,
                        isPast && styles.timeHeaderPast,
                      ]}
                    >
                      <View style={styles.timeHeaderLeft}>
                        <Ionicons
                          name={section.icon}
                          size={16}
                          color={isCurrent && !allSectionDone ? colors.primary : isPast ? colors.textMuted : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.timeHeaderLabel,
                            isCurrent && !allSectionDone && { color: colors.primary },
                            isPast && { color: colors.textMuted },
                          ]}
                        >
                          {section.label}
                        </Text>
                        {isCurrent && !allSectionDone ? (
                          <View style={styles.nowBadge}>
                            <Text style={styles.nowBadgeText}>NOW</Text>
                          </View>
                        ) : null}
                        {isUpNext ? (
                          <View style={styles.upNextBadge}>
                            <Text style={styles.upNextBadgeText}>UP NEXT</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.timeHeaderRight}>
                        <Text
                          style={[
                            styles.timeHeaderCount,
                            allSectionDone && { color: colors.success },
                          ]}
                        >
                          {done}/{total}
                        </Text>
                        <Ionicons
                          name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                          size={14}
                          color={colors.textMuted}
                        />
                      </View>
                    </Pressable>

                    {/* Section content */}
                    {!isCollapsed ? (
                      <View style={styles.habitList}>
                        {group.pending.length > 0 ? (
                          <DraggableHabitList
                            habits={group.pending}
                            isCompleted={false}
                            onToggle={handleToggle}
                            onPress={setSelectedHabit}
                            onReorder={handleReorder}
                            chainNameMap={chainNameMap}
                            scheduleMap={scheduleMap}
                            automaticityMap={automaticityMap}
                            keystoneMap={keystoneMap}
                            chainFollowersMap={chainFollowersMap}
                            completedIds={completedIds}
                          />
                        ) : null}
                        {group.completed.map((habit) => {
                          const info = scheduleMap.get(habit.id);
                          const weeklyProgress = info && info.weeklyTarget > 0
                            ? { completed: info.weeklyCompleted, target: info.weeklyTarget }
                            : undefined;
                          const autoInfo = automaticityMap.get(habit.id);
                          const followers = chainFollowersMap.get(habit.id);
                          return (
                            <HabitCard
                              key={habit.id}
                              habit={habit}
                              isCompleted={true}
                              onToggle={handleToggle}
                              onPress={setSelectedHabit}
                              chainedToName={habit.chainedToHabitId ? chainNameMap.get(habit.chainedToHabitId) : undefined}
                              weeklyProgress={weeklyProgress}
                              automaticityScore={autoInfo?.score}
                              isKeystone={keystoneMap.get(habit.id)?.isKeystone}
                              hasChainFollowers={!!followers && followers.length > 0}
                              chainFollowerCount={followers?.length}
                            />
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {/* Hibernating habits — collapsed section at end */}
              {hibernatedHabits.length > 0 ? (
                <View style={styles.habitGroup}>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowHibernated((p) => !p);
                    }}
                    style={styles.hibernateHeader}
                  >
                    <View style={styles.timeHeaderLeft}>
                      <Ionicons name="snow-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.timeHeaderLabel, { color: colors.textMuted }]}>
                        Hibernating
                      </Text>
                    </View>
                    <View style={styles.timeHeaderRight}>
                      <Text style={styles.timeHeaderCount}>{hibernatedHabits.length}</Text>
                      <Ionicons
                        name={showHibernated ? 'chevron-down' : 'chevron-forward'}
                        size={14}
                        color={colors.textMuted}
                      />
                    </View>
                  </Pressable>
                  {showHibernated ? (
                    <View style={styles.habitList}>
                      {hibernatedHabits.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          isCompleted={false}
                          onToggle={handleToggle}
                          onPress={setSelectedHabit}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}

          {/* ── Active Goals Strip ── */}
          {true ? (
            <View style={styles.goalsSection}>
              <View style={styles.goalsSectionHeader}>
                <Text style={styles.goalsSectionTitle}>Goals</Text>
                <Pressable
                  onPress={() => router.push('/goals')}
                  style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
                >
                  <Text style={styles.goalsSeeAll}>{activeGoals.length > 0 ? 'See all' : 'Set a Goal'}</Text>
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
                      onPress={() => {
                        Haptics.selectionAsync();
                        router.push('/goals');
                      }}
                      style={({ pressed }) => [styles.goalPill, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
                    >
                      <View style={[styles.goalPillIcon, { backgroundColor: catConfig?.color ? `${catConfig.color}20` : colors.primaryBg }]}>
                        <Ionicons
                          name={(catConfig?.icon as keyof typeof Ionicons.glyphMap) || 'flag'}
                          size={14}
                          color={catConfig?.color || colors.primary}
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
                            daysLeft < 14 && { color: colors.warning },
                            daysLeft < 0 && { color: colors.danger },
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
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push('/goals');
                  }}
                  style={({ pressed }) => [styles.goalPillAdd, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                </Pressable>
              </ScrollView>
            </View>
          ) : null}

          {/* Oracle Challenge */}
          {userId ? <OracleChallengeCard userId={userId} /> : null}

          {/* Bottom Spacer for floating tab bar */}
          <View style={{ height: 100 }} />
        </NestableScrollContainer>
      )}

      {/* Habit Detail Sheet */}
      <HabitDetailSheet
        habit={selectedHabit}
        isCompleted={selectedHabit ? completedIds.has(selectedHabit.id) : false}
        onClose={() => setSelectedHabit(null)}
        onToggle={handleToggle}
        onDelete={handleDeleteHabit}
        onAddNote={handleAddNote}
        automaticityInfo={selectedHabit ? automaticityMap.get(selectedHabit.id) ?? null : null}
        streakFreezes={streakFreezes}
        onHibernate={handleHibernate}
        onWake={handleWake}
        onUseStreakFreeze={handleUseStreakFreeze}
        keystoneInfo={selectedHabit ? keystoneMap.get(selectedHabit.id) ?? null : null}
        difficultySuggestion={selectedHabit ? difficultyMap.get(selectedHabit.id) ?? null : null}
      />

      {/* Add Habit Sheet */}
      <AddHabitSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddHabit}
        existingHabits={habits}
      />

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

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  topBarGreeting: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceLight,
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
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow(colors.primary, 0.3),
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
    alignItems: 'stretch',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    ...Shadows.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsValueArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  statsLevelNum: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extrabold,
    color: colors.primary,
  },
  statsValue: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: colors.foreground,
  },
  statsItemLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
    backgroundColor: colors.border,
  },
  hpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  freezeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    backgroundColor: `${colors.info}20`,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  freezeCount: {
    fontSize: 8,
    fontFamily: FontFamily.bold,
    color: colors.info,
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
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  goalsSeeAll: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.primary,
  },
  goalsScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minWidth: 150,
    maxWidth: 200,
    ...Shadows.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
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
    color: colors.foreground,
  },
  goalPillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalPillProgress: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  goalPillDays: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  goalPillAdd: {
    width: 40,
    height: '100%' as any,
    minHeight: 48,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Habits ──
  habitSection: {
    gap: Spacing.md,
  },
  habitGroup: {
    gap: Spacing.xs,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
    ...Shadows.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
  },
  timeHeaderCurrent: {
    backgroundColor: `${colors.primary}12`,
  },
  timeHeaderPast: {
    opacity: 0.6,
  },
  habitGroupPast: {
    opacity: 0.85,
  },
  timeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeHeaderLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  nowBadge: {
    backgroundColor: `${colors.primary}25`,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  nowBadgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  upNextBadge: {
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  upNextBadgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  timeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeHeaderCount: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: colors.textMuted,
  },
  habitList: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  // ── Holiday Banner ──
  holidayBanner: {
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: '#9C27B010',
    borderWidth: 1,
    borderColor: '#9C27B030',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  holidayBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  holidayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  holidayBannerTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: '#9C27B0',
  },
  holidayBannerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  holidayEndBtn: {
    backgroundColor: '#9C27B018',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#9C27B040',
  },
  holidayEndBtnText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: '#9C27B0',
  },

  hibernateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
    opacity: 0.6,
    ...Shadows.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
  },

  // ── All Done Banner ──
  allDoneCard: {
    backgroundColor: colors.success,
    borderRadius: 20,
    ...Shadows.glow(colors.success, 0.3),
  },
  allDoneBanner: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  allDoneTitle: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: '#FFFFFF',
  },
  allDoneText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },

});
