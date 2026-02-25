import type { Habit } from '@/types';

// ============================================
// Types
// ============================================

export interface HabitScheduleInfo {
  visible: boolean;
  isBonus: boolean;
  weeklyCompleted: number;
  weeklyTarget: number;
}

// ============================================
// Date Helpers
// ============================================

/** Format Date to YYYY-MM-DD using local time (matches the app's todayDate format) */
function formatDate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Get Monday-Sunday week boundaries as YYYY-MM-DD strings */
function getWeekBoundary(today: Date): { weekStart: string; weekEnd: string } {
  const dow = today.getDay(); // 0=Sun, 1=Mon...6=Sat
  const mondayOffset = dow === 0 ? 6 : dow - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { weekStart: formatDate(monday), weekEnd: formatDate(sunday) };
}

/** Count how many days remain in the Mon-Sun week, including today */
function getRemainingWeekDays(today: Date): number {
  const dow = today.getDay(); // 0=Sun
  return dow === 0 ? 1 : 8 - dow;
}

// ============================================
// Weekly Completion Counting
// ============================================

function getWeeklyCompletionCount(
  completedDates: string[],
  weekStart: string,
  weekEnd: string
): number {
  let count = 0;
  for (const d of completedDates) {
    if (d >= weekStart && d <= weekEnd) count++;
  }
  return count;
}

// ============================================
// Smart Distribution for timesPerWeek
// ============================================

function shouldShowTimesPerWeekHabit(
  habit: Habit,
  today: Date,
  todayStr: string
): HabitScheduleInfo {
  const target = habit.frequency?.timesPerWeek ?? 1;
  const { weekStart, weekEnd } = getWeekBoundary(today);
  const completedThisWeek = getWeeklyCompletionCount(
    habit.completedDates,
    weekStart,
    weekEnd
  );

  const isCompletedToday = habit.completedDates.includes(todayStr);

  // Already done today — show in completed section with progress pill
  if (isCompletedToday) {
    return {
      visible: true,
      isBonus: completedThisWeek > target,
      weeklyCompleted: completedThisWeek,
      weeklyTarget: target,
    };
  }

  // Quota met, not done today — hide from dashboard
  if (completedThisWeek >= target) {
    return {
      visible: false,
      isBonus: true,
      weeklyCompleted: completedThisWeek,
      weeklyTarget: target,
    };
  }

  // Quota NOT met — decide if today is a scheduled day
  const remaining = target - completedThisWeek;
  const remainingDays = getRemainingWeekDays(today);

  // Urgency: must do every remaining day
  if (remaining >= remainingDays) {
    return {
      visible: true,
      isBonus: false,
      weeklyCompleted: completedThisWeek,
      weeklyTarget: target,
    };
  }

  // Streak protection: if active streak and done yesterday, show today
  if (habit.streak > 0) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);
    if (habit.completedDates.includes(yesterdayStr)) {
      return {
        visible: true,
        isBonus: false,
        weeklyCompleted: completedThisWeek,
        weeklyTarget: target,
      };
    }
  }

  // Even spacing: distribute `remaining` sessions across `remainingDays`
  // Slot 0 = today, slot 1 = tomorrow, etc.
  const assignedSlots = new Set<number>();
  for (let i = 0; i < remaining; i++) {
    const slot = Math.floor(i * remainingDays / remaining);
    assignedSlots.add(slot);
  }

  return {
    visible: assignedSlots.has(0),
    isBonus: false,
    weeklyCompleted: completedThisWeek,
    weeklyTarget: target,
  };
}

// ============================================
// Main Entry Point
// ============================================

/**
 * Determines if a habit should be visible on the dashboard today.
 * Handles all frequency types: daily, weekdays, weekends, custom, timesPerWeek.
 *
 * @param habit - The habit to check
 * @param today - Current date
 * @param todayStr - Pre-formatted YYYY-MM-DD (avoids UTC/local mismatch)
 */
export function shouldShowHabitToday(
  habit: Habit,
  today: Date,
  todayStr: string
): HabitScheduleInfo {
  const freqType = habit.frequency?.type;

  // No frequency or daily → always show
  if (!freqType || freqType === 'daily') {
    return { visible: true, isBonus: false, weeklyCompleted: 0, weeklyTarget: 0 };
  }

  const dow = today.getDay(); // 0=Sun...6=Sat

  switch (freqType) {
    case 'weekdays': {
      const isWeekday = dow >= 1 && dow <= 5;
      // If completed today, still show it (in completed section)
      if (!isWeekday && !habit.completedDates.includes(todayStr)) {
        return { visible: false, isBonus: false, weeklyCompleted: 0, weeklyTarget: 0 };
      }
      return { visible: true, isBonus: false, weeklyCompleted: 0, weeklyTarget: 0 };
    }

    case 'weekends': {
      const isWeekend = dow === 0 || dow === 6;
      if (!isWeekend && !habit.completedDates.includes(todayStr)) {
        return { visible: false, isBonus: false, weeklyCompleted: 0, weeklyTarget: 0 };
      }
      return { visible: true, isBonus: false, weeklyCompleted: 0, weeklyTarget: 0 };
    }

    case 'custom': {
      const daysOfWeek = habit.frequency?.daysOfWeek ?? [];
      const isDueToday = daysOfWeek.includes(dow);
      if (!isDueToday && !habit.completedDates.includes(todayStr)) {
        return { visible: false, isBonus: false, weeklyCompleted: 0, weeklyTarget: 0 };
      }
      return { visible: true, isBonus: false, weeklyCompleted: 0, weeklyTarget: 0 };
    }

    case 'timesPerWeek':
      return shouldShowTimesPerWeekHabit(habit, today, todayStr);

    default:
      return { visible: true, isBonus: false, weeklyCompleted: 0, weeklyTarget: 0 };
  }
}

/**
 * Build a schedule map for all habits at once.
 * Call this once in a useMemo, then look up individual habits by ID.
 */
export function buildScheduleMap(
  habits: Habit[],
  today: Date,
  todayStr: string
): Map<string, HabitScheduleInfo> {
  const map = new Map<string, HabitScheduleInfo>();
  for (const h of habits) {
    map.set(h.id, shouldShowHabitToday(h, today, todayStr));
  }
  return map;
}
