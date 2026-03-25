/**
 * Frontend mirror of gamification overrides from convex/lib/neurodivergence.ts.
 *
 * We need this client-side because Convex server modules ("use node") cannot
 * be imported by React Native code. The logic MUST match the server-side
 * implementation. If you update one, update the other.
 *
 * @see convex/lib/neurodivergence.ts — canonical server-side version
 */
import type { NeurodivergenceProfile } from '@/types';

export interface GamificationOverrides {
  /** How to display streaks. 'percentage' shows "85% this week" instead of "5 day streak" */
  streakDisplayMode: 'standard' | 'percentage' | 'best-effort';
  /** Award bonus XP when returning after a gap (ADHD) */
  enableComebackXp: boolean;
  /** Maximum recommended active habits (0 = unlimited). Depression=3, Anxiety=5 */
  maxRecommendedHabits: number;
  /** Disable random/surprise reward mechanics (Autism) */
  disableSurpriseMechanics: boolean;
  /** Suggest transition buffers between scheduled habits (Autism) */
  showTransitionBuffers: boolean;
}

const DEFAULT_OVERRIDES: GamificationOverrides = {
  streakDisplayMode: 'standard',
  enableComebackXp: false,
  maxRecommendedHabits: 0,
  disableSurpriseMechanics: false,
  showTransitionBuffers: false,
};

/**
 * Calculate gamification display overrides based on the user's ND profile.
 * "Most protective setting wins" when multiple conditions overlap.
 */
export function getGamificationOverrides(profile: NeurodivergenceProfile | undefined): GamificationOverrides {
  if (!profile || profile.conditions.length === 0) return { ...DEFAULT_OVERRIDES };

  const conditions = new Set(profile.conditions);
  const overrides = { ...DEFAULT_OVERRIDES };

  if (conditions.has('depression')) {
    overrides.streakDisplayMode = 'best-effort';
    overrides.maxRecommendedHabits = 3;
  }

  if (conditions.has('anxiety')) {
    if (overrides.streakDisplayMode === 'standard') {
      overrides.streakDisplayMode = 'percentage';
    }
    const cap = overrides.maxRecommendedHabits > 0
      ? Math.min(overrides.maxRecommendedHabits, 5)
      : 5;
    overrides.maxRecommendedHabits = cap;
  }

  if (conditions.has('adhd')) {
    overrides.enableComebackXp = true;
  }

  if (conditions.has('autism')) {
    overrides.disableSurpriseMechanics = true;
    overrides.showTransitionBuffers = true;
  }

  return overrides;
}
