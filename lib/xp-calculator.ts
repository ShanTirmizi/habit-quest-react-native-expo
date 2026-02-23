import { Habit } from '@/types';

// ============================================
// Variable Reward Types (Hooked Model)
// ============================================
export type RewardType = 'standard' | 'critical' | 'jackpot';

export interface XpResult {
  baseXp: number;
  streakBonus: number;
  rewardType: RewardType;
  multiplier: number;
  totalXp: number;
  // Legacy compatibility
  randomBonus: boolean;
}

// Reward configuration based on behavioral psychology
const REWARD_CONFIG = {
  standard: { chance: 0.84, multiplier: 1, label: 'Standard' },
  critical: { chance: 0.15, multiplier: 2.5, label: 'Critical Hit!' },
  jackpot: { chance: 0.01, multiplier: 10, label: 'JACKPOT!' },
};

// Calculate level from total XP
// Formula: level = floor(sqrt(totalXp / 100))
export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100));
}

// Calculate XP needed for a specific level
export function xpForLevel(level: number): number {
  return level * level * 100;
}

// Calculate XP needed to reach next level from current XP
export function xpToNextLevel(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  return nextLevelXp - totalXp;
}

// Calculate progress percentage to next level
export function levelProgress(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const progress = ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, progress));
}

// Calculate streak bonus (5% per day, max 50%)
export function calculateStreakBonus(streak: number): number {
  const bonus = Math.min(streak * 0.05, 0.5);
  return bonus;
}

// Determine reward type using variable reward system (Hooked Model)
// 15% chance for Critical Hit (2.5x), 1% chance for Jackpot (10x)
export function determineRewardType(): RewardType {
  const roll = Math.random();

  if (roll < REWARD_CONFIG.jackpot.chance) {
    return 'jackpot';
  } else if (roll < REWARD_CONFIG.jackpot.chance + REWARD_CONFIG.critical.chance) {
    return 'critical';
  }
  return 'standard';
}

// Get the multiplier for a reward type
export function getRewardMultiplier(rewardType: RewardType): number {
  return REWARD_CONFIG[rewardType].multiplier;
}

// Get the label for a reward type
export function getRewardLabel(rewardType: RewardType): string {
  return REWARD_CONFIG[rewardType].label;
}

// Legacy function for backwards compatibility
export function checkRandomBonus(): boolean {
  return determineRewardType() !== 'standard';
}

// Calculate total XP earned for completing a habit
// Now includes variable rewards (Critical Hits & Jackpots)
export function calculateHabitXp(habit: Habit): XpResult {
  const baseXp = habit.xpReward;
  const streakBonusPercent = calculateStreakBonus(habit.streak);
  const streakBonus = Math.floor(baseXp * streakBonusPercent);

  // Variable reward system
  const rewardType = determineRewardType();
  const multiplier = getRewardMultiplier(rewardType);

  // Calculate total: (base + streak bonus) * multiplier
  const totalXp = Math.floor((baseXp + streakBonus) * multiplier);

  return {
    baseXp,
    streakBonus,
    rewardType,
    multiplier,
    totalXp,
    // Legacy compatibility
    randomBonus: rewardType !== 'standard',
  };
}
