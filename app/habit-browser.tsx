import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/contexts/toast-context';
import {
  FontSize,
  Spacing,
  Radius,
  FontFamily,
  Shadows,
  getCategoryColors,
  type ThemeColors,
} from '@/constants/theme';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { HabitDetailSheet, type HabitUpdateData } from '@/components/habits/HabitDetailSheet';
import type {
  Habit,
  HabitCategory,
  HabitFrequencyType,
} from '@/types';
import {
  FREQUENCY_LABELS,
  DAYS_OF_WEEK,
  TIME_OF_DAY_CONFIG,
  getCategoryColor,
  getCategoryLabel,
} from '@/types';

// ── Types ──

type FrequencyFilter = 'all' | HabitFrequencyType;

const CATEGORY_ICONS: Record<HabitCategory, keyof typeof Ionicons.glyphMap> = {
  health: 'heart',
  career: 'briefcase',
  mind: 'bulb',
  life: 'leaf',
};

const FREQUENCY_FILTER_OPTIONS: { value: FrequencyFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'filter.all' },
  { value: 'daily', labelKey: 'filter.daily' },
  { value: 'weekdays', labelKey: 'filter.weekdays' },
  { value: 'weekends', labelKey: 'filter.weekends' },
  { value: 'custom', labelKey: 'filter.custom' },
  { value: 'timesPerWeek', labelKey: 'filter.timesPerWeek' },
];

// ── Helpers ──

function getFrequencyDescription(habit: Habit, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const freq = habit.frequency;
  if (!freq) return t('frequency.everyDay');
  switch (freq.type) {
    case 'daily':
      return t('frequency.everyDay');
    case 'weekdays':
      return t('frequency.monFri');
    case 'weekends':
      return t('frequency.satSun');
    case 'custom': {
      const days = freq.daysOfWeek ?? [];
      if (days.length === 0) return t('frequency.customDays');
      return days.map((d) => DAYS_OF_WEEK[d]).join(', ');
    }
    case 'timesPerWeek':
      return t('frequency.timesPerWeek', { count: freq.timesPerWeek ?? 1 });
    default:
      return t('frequency.everyDay');
  }
}

function getEffectiveFrequencyType(habit: Habit): HabitFrequencyType {
  return habit.frequency?.type ?? 'daily';
}

// ── Habit Card (read-only, inline) ──

function BrowserHabitCard({
  habit,
  colors,
  styles,
  onPress,
  t,
}: {
  habit: Habit;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onPress: (habit: Habit) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const catColor = getCategoryColor(habit.category);
  const freqDesc = getFrequencyDescription(habit, t);
  const timeConfig = TIME_OF_DAY_CONFIG[habit.timeOfDay ?? 'anytime'];
  const isHibernated = !!habit.hibernatedAt;

  return (
    <Pressable
      onPress={() => onPress(habit)}
      style={({ pressed }) => [
        styles.card,
        isHibernated && styles.cardHibernated,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: catColor }]} />

      <View style={styles.cardBody}>
        {/* Top row: icon + name + status */}
        <View style={styles.cardTop}>
          <View style={styles.cardNameRow}>
            <Ionicons
              name={CATEGORY_ICONS[habit.category]}
              size={16}
              color={isHibernated ? colors.textMuted : catColor}
            />
            <Text
              style={[styles.cardName, isHibernated && { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {habit.name}
            </Text>
          </View>
          {isHibernated ? (
            <BadgePill
              label={t('card.hibernated')}
              icon="snow-outline"
              color={colors.textMuted}
              size="sm"
            />
          ) : null}
        </View>

        {/* Meta row: frequency + time of day */}
        <View style={styles.cardMeta}>
          <BadgePill
            label={getCategoryLabel(habit.category)}
            color={isHibernated ? colors.textMuted : catColor}
            size="sm"
          />
          <BadgePill
            label={freqDesc}
            icon="calendar-outline"
            color={colors.textSecondary}
            size="sm"
          />
          <BadgePill
            label={timeConfig.label}
            icon={timeConfig.icon}
            color={colors.textSecondary}
            size="sm"
          />
        </View>

        {/* Footer row: streak + xp */}
        <View style={styles.cardFooter}>
          <View style={styles.cardStat}>
            <Ionicons
              name="flame"
              size={13}
              color={isHibernated ? colors.textMuted : colors.accent}
            />
            <Text style={[styles.cardStatText, isHibernated && { color: colors.textMuted }]}>
              {t('card.streak', { count: habit.streak })}
            </Text>
          </View>
          <View style={styles.cardStat}>
            <Ionicons
              name="star"
              size={13}
              color={isHibernated ? colors.textMuted : colors.primary}
            />
            <Text style={[styles.cardStatText, isHibernated && { color: colors.textMuted }]}>
              {t('card.xp', { count: habit.xpReward })}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main Screen ──

export default function HabitBrowserScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { t } = useTranslation('habit-browser');
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const setSelectedHabit = useCallback((h: Habit | null) => {
    setSelectedHabitId(h?.id ?? null);
  }, []);

  // ── Mutations ──
  const toggleCompletionMutation = useMutation(api.habits.toggleCompletion);
  const deleteHabitMutation = useMutation(api.habits.deleteHabit);
  const addNoteMutation = useMutation(api.habits.addNote);
  const updateHabitMutation = useMutation(api.habits.updateHabit);
  const hibernateHabitMutation = useMutation(api.habits.hibernateHabit);
  const wakeHabitMutation = useMutation(api.habits.wakeHabit);
  const addXpMutation = useMutation(api.progress.addXp);
  const removeXpMutation = useMutation(api.progress.removeXp);

  // ── Data ──
  const rawHabits = useQuery(api.habits.getHabits, userId ? { userId } : 'skip');
  const isLoading = rawHabits === undefined;

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
      goalId: h.goalId?.toString(),
    }));
  }, [rawHabits]);

  // Derive selectedHabit from fresh habits array so it stays in sync after mutations
  const selectedHabit = useMemo(
    () => (selectedHabitId ? habits.find((h) => h.id === selectedHabitId) ?? null : null),
    [selectedHabitId, habits],
  );

  // ── Filtering ──
  const filteredHabits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return habits.filter((h) => {
      if (frequencyFilter !== 'all') {
        if (getEffectiveFrequencyType(h) !== frequencyFilter) return false;
      }
      if (query && !h.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [habits, frequencyFilter, searchQuery]);

  // ── Counts per frequency type (for chip badges) ──
  const frequencyCounts = useMemo(() => {
    const counts: Record<FrequencyFilter, number> = {
      all: habits.length,
      daily: 0,
      weekdays: 0,
      weekends: 0,
      custom: 0,
      timesPerWeek: 0,
    };
    for (const h of habits) {
      const ft = getEffectiveFrequencyType(h);
      counts[ft] = (counts[ft] ?? 0) + 1;
    }
    return counts;
  }, [habits]);

  const activeCount = habits.filter((h) => !h.hibernatedAt).length;
  const hibernatedCount = habits.filter((h) => !!h.hibernatedAt).length;

  // ── Today's date for completions ──
  const todayDate = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const completedIds = useMemo(() => {
    const set = new Set<string>();
    for (const h of habits) {
      if (h.completedDates.includes(todayDate)) {
        set.add(h.id);
      }
    }
    return set;
  }, [habits, todayDate]);

  // ── Handlers ──
  const handleToggle = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      const result = await toggleCompletionMutation({
        habitId: id as Parameters<typeof toggleCompletionMutation>[0]['habitId'],
        userId,
        date: todayDate,
      });
      if (result.completed) {
        const habit = habits.find((h) => h.id === id);
        if (habit) {
          showToast(t('toast.completed', { name: habit.name }), habit.xpReward, 'xp');
          try {
            await addXpMutation({ userId, amount: habit.xpReward });
          } catch { /* ignore xp errors */ }
        }
      } else {
        // Undo: remove the XP that was awarded
        const habit = habits.find((h) => h.id === id);
        if (habit) {
          try {
            await removeXpMutation({ userId, amount: habit.xpReward });
          } catch { /* ignore xp errors */ }
        }
      }
    } catch {
      showToast(t('toast.toggleError'), undefined, 'error');
    }
  }, [userId, todayDate, toggleCompletionMutation, habits, showToast, addXpMutation, removeXpMutation]);

  const handleDeleteHabit = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteHabitMutation({
        habitId: id as Parameters<typeof deleteHabitMutation>[0]['habitId'],
        userId,
      });
      setSelectedHabit(null);
      showToast(t('toast.deleted'), undefined, 'hp');
    } catch {
      showToast(t('toast.deleteError'), undefined, 'error');
    }
  }, [userId, deleteHabitMutation, showToast]);

  const handleAddNote = useCallback(async (habitId: string, text: string) => {
    if (!userId) return;
    try {
      await addNoteMutation({
        habitId: habitId as Parameters<typeof addNoteMutation>[0]['habitId'],
        userId,
        text,
      });
      showToast(t('toast.noteAdded'), undefined, 'xp');
    } catch {
      showToast(t('toast.noteError'), undefined, 'error');
    }
  }, [userId, addNoteMutation, showToast]);

  const handleUpdateHabit = useCallback(async (habitId: string, data: HabitUpdateData) => {
    if (!userId) return;
    try {
      await updateHabitMutation({
        habitId: habitId as Parameters<typeof updateHabitMutation>[0]['habitId'],
        userId,
        ...data,
      } as Parameters<typeof updateHabitMutation>[0]);
      showToast(t('toast.updated'), undefined, 'xp');
    } catch {
      showToast(t('toast.updateError'), undefined, 'error');
    }
  }, [userId, updateHabitMutation, showToast]);

  const handleHibernate = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await hibernateHabitMutation({
        habitId: id as Parameters<typeof hibernateHabitMutation>[0]['habitId'],
        userId,
      });
      showToast(t('toast.hibernated'), undefined, 'hp');
    } catch {
      showToast(t('toast.hibernateError'), undefined, 'error');
    }
  }, [userId, hibernateHabitMutation, showToast]);

  const handleWake = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await wakeHabitMutation({
        habitId: id as Parameters<typeof wakeHabitMutation>[0]['habitId'],
        userId,
      });
      showToast(t('toast.reactivated'), undefined, 'xp');
    } catch {
      showToast(t('toast.wakeError'), undefined, 'error');
    }
  }, [userId, wakeHabitMutation, showToast]);

  // ── Render ──

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{t('title')}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={48} borderRadius={Radius.md} />
          <View style={{ height: Spacing.md }} />
          <Skeleton width="100%" height={100} borderRadius={Radius.lg} />
          <View style={{ height: Spacing.sm }} />
          <Skeleton width="100%" height={100} borderRadius={Radius.lg} />
          <View style={{ height: Spacing.sm }} />
          <Skeleton width="100%" height={100} borderRadius={Radius.lg} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>All Habits</Text>
          <View style={styles.badgeRow}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{t('badge.active', { count: activeCount })}</Text>
            </View>
            {hibernatedCount > 0 ? (
              <View style={styles.hibernatedBadge}>
                <Text style={styles.hibernatedBadgeText}>{t('badge.hibernated', { count: hibernatedCount })}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Frequency Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FREQUENCY_FILTER_OPTIONS.map((opt) => {
          const isActive = frequencyFilter === opt.value;
          const count = frequencyCounts[opt.value];
          return (
            <Pressable
              key={opt.value}
              onPress={() => setFrequencyFilter(opt.value)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {t(opt.labelKey)}
                {count > 0 && opt.value !== 'all' ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Habit List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            tintColor={colors.primary}
          />
        }
      >
        {filteredHabits.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title={t('empty.title')}
            description={
              searchQuery
                ? t('empty.searchDescription', { query: searchQuery })
                : t('empty.filterDescription', { filter: frequencyFilter === 'all' ? '' : FREQUENCY_LABELS[frequencyFilter as HabitFrequencyType].toLowerCase() + ' ' })
            }
          />
        ) : (
          <View style={styles.listContainer}>
            {filteredHabits.map((habit) => (
              <BrowserHabitCard
                key={habit.id}
                habit={habit}
                colors={colors}
                styles={styles}
                onPress={setSelectedHabit}
                t={t}
              />
            ))}
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: insets.bottom + Spacing['2xl'] }} />
      </ScrollView>

      {/* Habit Detail Sheet */}
      <HabitDetailSheet
        habit={selectedHabit}
        isCompleted={selectedHabit ? completedIds.has(selectedHabit.id) : false}
        onClose={() => setSelectedHabit(null)}
        onToggle={handleToggle}
        onDelete={handleDeleteHabit}
        onAddNote={handleAddNote}
        onUpdate={handleUpdateHabit}
        onHibernate={handleHibernate}
        onWake={handleWake}
      />
    </View>
  );
}

// ── Styles ──

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      paddingBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: Radius.sm,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerLeft: {
      flex: 1,
      gap: Spacing.xs,
    },
    title: {
      fontSize: FontSize['3xl'],
      fontFamily: FontFamily.extrabold,
      color: colors.foreground,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    activeBadge: {
      backgroundColor: `${colors.primary}18`,
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    activeBadgeText: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.semibold,
      color: colors.primary,
    },
    hibernatedBadge: {
      backgroundColor: `${colors.textMuted}18`,
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    hibernatedBadgeText: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.semibold,
      color: colors.textMuted,
    },

    // Search
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: FontSize.sm,
      fontFamily: FontFamily.medium,
      color: colors.foreground,
      padding: 0,
    },

    // Filters
    filterScroll: {
      flexGrow: 0,
    },
    filterRow: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs + 2,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    filterChipActive: {
      backgroundColor: colors.primaryBg,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.medium,
      color: colors.textMuted,
    },
    filterChipTextActive: {
      color: colors.primary,
      fontFamily: FontFamily.semibold,
    },

    // Scroll
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: Spacing.lg,
    },

    // Loading
    loadingContainer: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
    },

    // List
    listContainer: {
      gap: Spacing.sm,
    },

    // Card
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      ...Shadows.card,
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.borderStrong,
    },
    cardHibernated: {
      opacity: 0.6,
    },
    cardAccent: {
      width: 4,
    },
    cardBody: {
      flex: 1,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    cardNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    cardName: {
      fontSize: FontSize.base,
      fontFamily: FontFamily.semibold,
      color: colors.foreground,
      flex: 1,
    },
    cardMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    cardStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardStatText: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.medium,
      color: colors.textSecondary,
    },
  });
