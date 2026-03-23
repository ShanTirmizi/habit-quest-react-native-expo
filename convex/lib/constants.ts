/**
 * Shared constants and utility functions used across multiple Convex modules.
 * Single source of truth to prevent drift between files.
 */

// ── Medicine Gamification ──
export const MEDICINE_CONFIG = {
  BASE_XP: 5,        // Per dose
  ON_TIME_BONUS_XP: 2, // Within 30 min of scheduled
  GROUP_BONUS_XP: 3,   // Using "Take All"
  STREAK_BONUS_MAX: 5, // +1 per streak day, capped at 5
  HP_HEAL: 3,          // Per dose
  PERFECT_DAY_HP: 10,  // All meds taken bonus
} as const;

// ── HP System ──
export const HP_CONFIG = {
  DEFAULT_HP: 100,
  MAX_HP: 100,
  MISSED_HABIT_DAMAGE: 10,
  FAINT_THRESHOLD: 0,
  FAINT_LEVEL_PENALTY: 1,
  FAINT_HP_RESET: 50,
  COMPLETION_HEAL: 5,
  PERFECT_DAY_HEAL: 20,
} as const;

// ── Underworld System ──
export const UNDERWORLD_CONFIG = {
  DAYS_TO_RESURRECT: 3,
  RESURRECTION_HP: 75,
  RESURRECTION_XP_BONUS: 100,
} as const;

// ── Level Calculation ──
// Formula: level = floor(sqrt(totalXp / 100))
// Centralized here so leveling curve changes are applied everywhere.
export function computeLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100));
}

// ── Date Helpers ──

/**
 * All user-data tables that contain a `userId` field with a `by_user` index.
 * Used by account deletion and data export to ensure consistency.
 */
export const USER_DATA_TABLES = [
  'userProgress',
  'companions',
  'oracleChallenges',
  'timeCapsules',
  'goals',
  'habits',
  'habitCompletions',
  'sideQuests',
  'journalEntries',
  'chatMessages',
  'pushSubscriptions',
  'medicineGroups',
  'medicines',
  'medicineCompletions',
  'aiMemories',
  'microReflections',
] as const;

export type UserDataTable = (typeof USER_DATA_TABLES)[number];
