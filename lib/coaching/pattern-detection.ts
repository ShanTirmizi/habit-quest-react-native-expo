import { CoachingContext, DetectedPattern, HabitSummary } from './types';

// ============================================
// Pattern Detection
//
// Deterministic pattern detection from habit data.
// Detects patterns without API calls for cost efficiency.
// ============================================

/**
 * Detect weak days - days where completion rate is significantly below average.
 * A day is "weak" if its completion rate is 15%+ below the average.
 */
export function detectWeakDays(
  dayOfWeekPerformance: Record<string, number>
): DetectedPattern[] {
  const entries = Object.entries(dayOfWeekPerformance);
  if (entries.length === 0) return [];

  const values = entries.map(([, v]) => v);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  if (avg === 0) return [];

  const patterns: DetectedPattern[] = [];

  for (const [day, rate] of entries) {
    const diff = avg - rate;
    if (diff >= 15) {
      patterns.push({
        type: 'weak_day',
        description: `${day} is a weak day with ${rate}% completion (${Math.round(diff)}% below your ${Math.round(avg)}% average)`,
        severity: diff >= 25 ? 'warning' : 'info',
        data: { day, rate, average: avg, difference: diff },
      });
    }
  }

  return patterns.sort(
    (a, b) =>
      (b.data.difference as number) - (a.data.difference as number)
  );
}

/**
 * Detect peak times - time slots where the user performs best.
 */
export function detectPeakTimes(
  timeOfDayPerformance: Record<string, number>
): DetectedPattern[] {
  const entries = Object.entries(timeOfDayPerformance).filter(
    ([, v]) => v > 0
  );
  if (entries.length < 2) return [];

  const values = entries.map(([, v]) => v);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  if (avg === 0) return [];

  const patterns: DetectedPattern[] = [];

  // Find peak time (significantly above average)
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const [peakTime, peakRate] = sorted[0];

  if (peakRate > avg * 1.2 && peakRate > 40) {
    patterns.push({
      type: 'peak_time',
      description: `${peakTime.charAt(0).toUpperCase() + peakTime.slice(1)} is your peak performance time (${peakRate}% completion vs ${Math.round(avg)}% average)`,
      severity: 'info',
      data: { time: peakTime, rate: peakRate, average: avg },
    });
  }

  // Find weak time (significantly below average)
  const [weakTime, weakRate] = sorted[sorted.length - 1];
  if (weakRate < avg * 0.6 && avg > 30) {
    patterns.push({
      type: 'peak_time',
      description: `${weakTime.charAt(0).toUpperCase() + weakTime.slice(1)} habits are underperforming (${weakRate}% completion vs ${Math.round(avg)}% average)`,
      severity: 'warning',
      data: { time: weakTime, rate: weakRate, average: avg },
    });
  }

  return patterns;
}

/**
 * Detect keystone habits - habits whose completion correlates strongly
 * with completing other habits.
 */
export function detectKeystoneHabits(
  habitCorrelations: Array<{ habitA: string; habitB: string; rate: number }>,
  habits: HabitSummary[]
): DetectedPattern[] {
  if (habitCorrelations.length === 0 || habits.length < 3) return [];

  // Count how many times each habit appears in high correlations
  const habitMentions: Record<string, number> = {};
  const highCorrelations = habitCorrelations.filter((c) => c.rate >= 70);

  for (const corr of highCorrelations) {
    habitMentions[corr.habitA] = (habitMentions[corr.habitA] || 0) + 1;
    habitMentions[corr.habitB] = (habitMentions[corr.habitB] || 0) + 1;
  }

  const patterns: DetectedPattern[] = [];

  // A keystone habit appears in multiple high correlations
  const sorted = Object.entries(habitMentions).sort((a, b) => b[1] - a[1]);

  for (const [habitName, mentions] of sorted) {
    if (mentions >= 2) {
      const habit = habits.find((h) => h.name === habitName);
      if (!habit) continue;

      patterns.push({
        type: 'keystone_habit',
        description: `"${habitName}" appears to be a keystone habit - it's strongly correlated with ${mentions} other habits`,
        severity: 'info',
        data: {
          habitName,
          correlationCount: mentions,
          completionRate: habit.completionRate30Days,
        },
      });
    }
  }

  return patterns.slice(0, 2);
}

/**
 * Detect vulnerable habits - habits with declining completion rates
 * or frequent recent streak breaks.
 */
export function detectVulnerableHabits(
  habits: HabitSummary[]
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const habit of habits) {
    // Check for significant decline: 7-day rate much lower than 30-day rate
    if (
      habit.completionRate30Days > 40 &&
      habit.completionRate7Days < habit.completionRate30Days - 20
    ) {
      const decline = habit.completionRate30Days - habit.completionRate7Days;
      patterns.push({
        type: 'vulnerable_habit',
        description: `"${habit.name}" is declining - ${habit.completionRate7Days}% this week vs ${habit.completionRate30Days}% over 30 days (${decline}% drop)`,
        severity: decline >= 30 ? 'critical' : 'warning',
        data: {
          habitName: habit.name,
          rate7Days: habit.completionRate7Days,
          rate30Days: habit.completionRate30Days,
          decline,
        },
      });
    }

    // Check for habits that had a streak and lost it recently
    if (
      habit.lastCompletedDaysAgo !== null &&
      habit.lastCompletedDaysAgo >= 3 &&
      habit.streak === 0 &&
      habit.completionRate30Days > 30
    ) {
      patterns.push({
        type: 'vulnerable_habit',
        description: `"${habit.name}" hasn't been completed in ${habit.lastCompletedDaysAgo} days despite a ${habit.completionRate30Days}% 30-day rate`,
        severity: habit.lastCompletedDaysAgo >= 5 ? 'critical' : 'warning',
        data: {
          habitName: habit.name,
          daysSinceCompletion: habit.lastCompletedDaysAgo,
          historicalRate: habit.completionRate30Days,
        },
      });
    }
  }

  return patterns
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 3);
}

/**
 * Detect category imbalance - categories where completion rate is
 * significantly below the average across all categories.
 */
export function detectCategoryImbalance(
  categoryBreakdown: Record<string, { count: number; avgCompletion: number }>
): DetectedPattern[] {
  const entries = Object.entries(categoryBreakdown).filter(
    ([, v]) => v.count > 0
  );
  if (entries.length < 2) return [];

  const avgCompletion =
    entries.reduce((sum, [, v]) => sum + v.avgCompletion, 0) / entries.length;

  if (avgCompletion === 0) return [];

  const patterns: DetectedPattern[] = [];

  for (const [category, data] of entries) {
    const diff = avgCompletion - data.avgCompletion;
    if (diff >= 15 && data.count >= 1) {
      patterns.push({
        type: 'category_imbalance',
        description: `${category.charAt(0).toUpperCase() + category.slice(1)} habits are underperforming (${data.avgCompletion}% avg completion vs ${Math.round(avgCompletion)}% overall)`,
        severity: diff >= 30 ? 'warning' : 'info',
        data: {
          category,
          categoryCompletion: data.avgCompletion,
          overallCompletion: avgCompletion,
          habitCount: data.count,
          difference: diff,
        },
      });
    }
  }

  return patterns.sort(
    (a, b) =>
      (b.data.difference as number) - (a.data.difference as number)
  );
}

/**
 * Run all pattern detectors against a full coaching context.
 * Returns a deduplicated, prioritized list of patterns.
 */
export function detectAllPatterns(
  context: CoachingContext
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [
    ...detectWeakDays(context.dayOfWeekPerformance),
    ...detectPeakTimes(context.timeOfDayPerformance),
    ...detectKeystoneHabits(context.habitCorrelations, context.habits),
    ...detectVulnerableHabits(context.habits),
    ...detectCategoryImbalance(context.categoryBreakdown),
  ];

  // Deduplicate by description prefix
  const seen = new Set<string>();
  const deduplicated = patterns.filter((p) => {
    const key = p.description.slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by severity then by type
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return deduplicated
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 8);
}
