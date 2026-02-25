import type { Habit } from '@/types';

// ============================================
// Lally Curve: Automaticity Computation
// ============================================
//
// Based on Phillippa Lally et al. (UCL, 2009):
// - Habits take 18-254 days to become automatic (median 66)
// - Automaticity follows an asymptotic curve: A(t) = Amax * (1 - e^(-k*t))
// - Missing a single day does NOT reset formation
// - The curve flattens as you approach full automaticity
//

export interface AutomaticityInfo {
  /** 0-100 score representing how automatic the habit is */
  score: number;
  /** How many days since habit creation */
  daysSinceStart: number;
  /** Total days the habit was completed */
  totalCompletions: number;
  /** Completion rate (0-1) */
  completionRate: number;
  /** Estimated days until 95% automaticity (null if already there) */
  daysToLockIn: number | null;
  /** Human-readable phase */
  phase: 'forming' | 'building' | 'strengthening' | 'automatic';
  /** Phase label for display */
  phaseLabel: string;
}

/**
 * Compute automaticity score using Lally's asymptotic model.
 *
 * The formula: A(t) = 100 * (1 - e^(-k * effectiveDays))
 *
 * Where:
 * - effectiveDays = completions weighted by consistency
 * - k = personalized rate factor based on completion density
 * - Missing days reduce effectiveDays but don't reset to zero
 */
export function computeAutomaticity(habit: Habit, todayStr: string): AutomaticityInfo {
  const createdDate = habit.createdAt
    ? new Date(habit.createdAt)
    : new Date();
  const today = new Date(todayStr);

  const daysSinceStart = Math.max(1, Math.floor(
    (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  ));

  const totalCompletions = habit.completedDates.length;

  if (totalCompletions === 0) {
    return {
      score: 0,
      daysSinceStart,
      totalCompletions: 0,
      completionRate: 0,
      daysToLockIn: 66,
      phase: 'forming',
      phaseLabel: 'Just Starting',
    };
  }

  // Completion rate — how consistently they've done it
  const completionRate = Math.min(1, totalCompletions / daysSinceStart);

  // Effective days: completions weighted by consistency
  // High consistency = completions count fully
  // Low consistency = completions count less (gaps slow formation)
  const consistencyMultiplier = 0.5 + (completionRate * 0.5); // 0.5 to 1.0
  const effectiveDays = totalCompletions * consistencyMultiplier;

  // Personalized k-factor: frequent doers form habits faster
  // Base k gives 95% at ~66 effective days: k = -ln(0.05) / 66 ≈ 0.0454
  // Adjusted slightly by completion density
  const baseK = 0.0454;
  const k = baseK * (0.8 + completionRate * 0.4); // 0.8k to 1.2k range

  // Lally asymptotic curve
  const rawScore = 100 * (1 - Math.exp(-k * effectiveDays));

  // Clamp to 0-100
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Estimate days to 95% (lock-in)
  let daysToLockIn: number | null = null;
  if (score < 95) {
    // Solve: 95 = 100 * (1 - e^(-k * targetDays))
    // targetDays = -ln(0.05) / k
    const targetEffectiveDays = -Math.log(0.05) / k;
    const remainingEffectiveDays = targetEffectiveDays - effectiveDays;
    // Convert back to real days using current completion rate
    const estimatedRealDays = completionRate > 0.1
      ? Math.ceil(remainingEffectiveDays / (completionRate * consistencyMultiplier))
      : 66;
    daysToLockIn = Math.max(1, estimatedRealDays);
  }

  // Determine phase
  let phase: AutomaticityInfo['phase'];
  let phaseLabel: string;
  if (score >= 95) {
    phase = 'automatic';
    phaseLabel = 'Locked In';
  } else if (score >= 60) {
    phase = 'strengthening';
    phaseLabel = 'Strengthening';
  } else if (score >= 25) {
    phase = 'building';
    phaseLabel = 'Building';
  } else {
    phase = 'forming';
    phaseLabel = 'Forming';
  }

  return {
    score,
    daysSinceStart,
    totalCompletions,
    completionRate,
    daysToLockIn,
    phase,
    phaseLabel,
  };
}

/**
 * Build automaticity map for all habits at once.
 */
export function buildAutomaticityMap(
  habits: Habit[],
  todayStr: string
): Map<string, AutomaticityInfo> {
  const map = new Map<string, AutomaticityInfo>();
  for (const h of habits) {
    map.set(h.id, computeAutomaticity(h, todayStr));
  }
  return map;
}
