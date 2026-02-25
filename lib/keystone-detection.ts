/**
 * Keystone Detection — Charles Duhigg's "The Power of Habit"
 *
 * Keystone habits are habits that, when performed, make other habits
 * more likely to be completed. E.g., exercise often cascades into
 * better eating, better sleep, and higher productivity.
 *
 * We detect keystones by analyzing completion correlations across
 * all habits using the user's own data.
 */

import type { Habit } from '@/types';

export interface KeystoneInfo {
  habitId: string;
  score: number;           // 0-100, higher = stronger keystone
  isKeystone: boolean;     // score >= threshold
  /** Habits that are more likely to be completed on days this habit is done */
  influencedHabits: { habitId: string; name: string; liftPercent: number }[];
}

const KEYSTONE_THRESHOLD = 60;
const MIN_DATA_DAYS = 14;     // Need at least 2 weeks of data
const MIN_COMPLETIONS = 5;    // Need at least 5 completions to analyze

/**
 * Compute keystone scores for all habits.
 * Uses conditional probability: P(B done | A done) vs P(B done | A not done).
 * A large positive difference means A "lifts" B — A is a keystone.
 */
export function detectKeystones(habits: Habit[]): Map<string, KeystoneInfo> {
  const result = new Map<string, KeystoneInfo>();
  const active = habits.filter((h) => !h.hibernatedAt);

  if (active.length < 2) {
    for (const h of active) {
      result.set(h.id, { habitId: h.id, score: 0, isKeystone: false, influencedHabits: [] });
    }
    return result;
  }

  // Build date sets for each habit
  const dateSets = new Map<string, Set<string>>();
  for (const h of active) {
    dateSets.set(h.id, new Set(h.completedDates));
  }

  // Collect all dates across all habits to define the analysis window
  const allDates = new Set<string>();
  for (const dates of dateSets.values()) {
    for (const d of dates) allDates.add(d);
  }
  const sortedDates = Array.from(allDates).sort();

  if (sortedDates.length < MIN_DATA_DAYS) {
    for (const h of active) {
      result.set(h.id, { habitId: h.id, score: 0, isKeystone: false, influencedHabits: [] });
    }
    return result;
  }

  // For each habit A, compute how much it "lifts" every other habit B
  for (const habitA of active) {
    const datesA = dateSets.get(habitA.id)!;

    if (datesA.size < MIN_COMPLETIONS) {
      result.set(habitA.id, { habitId: habitA.id, score: 0, isKeystone: false, influencedHabits: [] });
      continue;
    }

    const lifts: { habitId: string; name: string; liftPercent: number }[] = [];

    for (const habitB of active) {
      if (habitB.id === habitA.id) continue;

      const datesB = dateSets.get(habitB.id)!;
      if (datesB.size < MIN_COMPLETIONS) continue;

      // Days where A was done
      let aDoneBDone = 0;
      let aDoneBNot = 0;
      // Days where A was NOT done
      let aNotBDone = 0;
      let aNotBNot = 0;

      for (const date of sortedDates) {
        const aCompleted = datesA.has(date);
        const bCompleted = datesB.has(date);

        if (aCompleted && bCompleted) aDoneBDone++;
        else if (aCompleted && !bCompleted) aDoneBNot++;
        else if (!aCompleted && bCompleted) aNotBDone++;
        else aNotBNot++;
      }

      const pBgivenA = (aDoneBDone + aDoneBNot) > 0
        ? aDoneBDone / (aDoneBDone + aDoneBNot)
        : 0;

      const pBgivenNotA = (aNotBDone + aNotBNot) > 0
        ? aNotBDone / (aNotBDone + aNotBNot)
        : 0;

      // Lift = how much more likely B is when A is done
      const lift = pBgivenA - pBgivenNotA;

      if (lift > 0.1) { // At least 10% lift to be meaningful
        lifts.push({
          habitId: habitB.id,
          name: habitB.name,
          liftPercent: Math.round(lift * 100),
        });
      }
    }

    // Sort by lift descending
    lifts.sort((a, b) => b.liftPercent - a.liftPercent);

    // Keystone score = average lift across all influenced habits, scaled to 0-100
    const avgLift = lifts.length > 0
      ? lifts.reduce((sum, l) => sum + l.liftPercent, 0) / lifts.length
      : 0;

    // Scale: 20% avg lift → score 60, 40%+ → score 90+
    const score = Math.min(100, Math.round(avgLift * 2.5));

    result.set(habitA.id, {
      habitId: habitA.id,
      score,
      isKeystone: score >= KEYSTONE_THRESHOLD,
      influencedHabits: lifts.slice(0, 3), // Top 3
    });
  }

  return result;
}
