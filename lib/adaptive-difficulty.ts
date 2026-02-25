/**
 * Adaptive Difficulty — Csikszentmihalyi's Flow Theory
 *
 * Habits that are too easy get boring (disengagement).
 * Habits that are too hard trigger avoidance.
 * The sweet spot is "just challenging enough" — the flow channel.
 *
 * We analyze completion patterns and suggest scaling up or down.
 */

import type { Habit } from '@/types';

export type DifficultyDirection = 'scale_up' | 'scale_down' | 'maintain';

export interface DifficultySuggestion {
  habitId: string;
  direction: DifficultyDirection;
  reason: string;
  /** Specific suggestion text */
  suggestion: string;
  /** Confidence 0-100 */
  confidence: number;
  /** Recent completion rate (last 14 days) */
  recentRate: number;
  /** Overall completion rate */
  overallRate: number;
}

const WINDOW_DAYS = 14;
const SCALE_UP_THRESHOLD = 0.85;   // 85%+ completion → suggest scaling up
const SCALE_DOWN_THRESHOLD = 0.35; // <35% completion → suggest scaling down
const MIN_DAYS_FOR_SUGGESTION = 7; // Need at least a week of data

function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

const SCALE_UP_SUGGESTIONS = [
  (h: Habit) => `You've mastered ${h.name} at this level. Try extending it by 50% — e.g., if it's 10 minutes, go for 15.`,
  (h: Habit) => `${h.name} seems easy for you now. Add a twist: do it at a different time, in a new location, or combine it with another habit.`,
  (h: Habit) => `Consider upgrading ${h.name} — increase the intensity, duration, or add a mindfulness component.`,
  (h: Habit) => `You're crushing ${h.name}. Time to level up: set a measurable target that's 20% harder than your current baseline.`,
];

const SCALE_DOWN_SUGGESTIONS = [
  (h: Habit) => h.scaledDown
    ? `Even the scaled-down version of ${h.name} seems tough. Try the absolute minimum: just show up for 2 minutes.`
    : `${h.name} might be too ambitious right now. Scale it down to a 2-minute version — the goal is just to not break the chain.`,
  (h: Habit) => `Missing ${h.name} often? Make it laughably easy: instead of the full version, commit to the first 30 seconds only.`,
  (h: Habit) => `Consider shrinking ${h.name} until it's almost impossible to skip. BJ Fogg calls this "Tiny Habits" — the gateway to consistency.`,
];

export function analyzeDifficulty(habits: Habit[]): Map<string, DifficultySuggestion> {
  const result = new Map<string, DifficultySuggestion>();
  const recentDates = getRecentDates(WINDOW_DAYS);
  const recentSet = new Set(recentDates);

  for (const habit of habits) {
    if (habit.hibernatedAt) continue;

    const completedSet = new Set(habit.completedDates);
    const createdDate = habit.createdAt?.split('T')[0] ?? '';

    // Only suggest after enough data
    const daysExisted = recentDates.filter((d) => d >= createdDate).length;
    if (daysExisted < MIN_DAYS_FOR_SUGGESTION) continue;

    // Recent completion rate (last 14 days since habit creation)
    const relevantDates = recentDates.filter((d) => d >= createdDate);
    const recentCompletions = relevantDates.filter((d) => completedSet.has(d)).length;
    const recentRate = relevantDates.length > 0 ? recentCompletions / relevantDates.length : 0;

    // Overall rate
    const overallRate = habit.completedDates.length > 0 && daysExisted > 0
      ? habit.completedDates.length / daysExisted
      : 0;

    let direction: DifficultyDirection = 'maintain';
    let reason = '';
    let suggestion = '';
    let confidence = 0;

    if (recentRate >= SCALE_UP_THRESHOLD && daysExisted >= WINDOW_DAYS) {
      direction = 'scale_up';
      reason = `${Math.round(recentRate * 100)}% completion rate over the last 2 weeks`;
      suggestion = SCALE_UP_SUGGESTIONS[Math.floor(Math.random() * SCALE_UP_SUGGESTIONS.length)](habit);
      confidence = Math.min(95, Math.round(50 + recentRate * 45));
    } else if (recentRate <= SCALE_DOWN_THRESHOLD && daysExisted >= MIN_DAYS_FOR_SUGGESTION) {
      direction = 'scale_down';
      reason = `Only ${Math.round(recentRate * 100)}% completion rate recently`;
      suggestion = SCALE_DOWN_SUGGESTIONS[Math.floor(Math.random() * SCALE_DOWN_SUGGESTIONS.length)](habit);
      confidence = Math.min(90, Math.round(40 + (1 - recentRate) * 50));
    }

    if (direction !== 'maintain') {
      result.set(habit.id, {
        habitId: habit.id,
        direction,
        reason,
        suggestion,
        confidence,
        recentRate,
        overallRate,
      });
    }
  }

  return result;
}
