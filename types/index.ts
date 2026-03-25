export type HabitCategory = 'health' | 'career' | 'mind' | 'life';

export type HabitFrequencyType = 'daily' | 'weekdays' | 'weekends' | 'custom' | 'timesPerWeek';

export interface HabitFrequency {
  type: HabitFrequencyType;
  daysOfWeek?: number[];
  timesPerWeek?: number;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface HabitNote {
  id: string;
  date: string;
  text: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  xpReward: number;
  streak: number;
  completedDates: string[];
  createdAt: string;
  frequency?: HabitFrequency;
  timeOfDay?: TimeOfDay;
  chainedToHabitId?: string;
  allowedRestDays?: number;
  restDaysUsed?: string[];
  notes?: HabitNote[];
  location?: string;
  trigger?: string;
  rationale?: string;
  citation?: {
    author: string;
    year: number;
    finding: string;
  };
  scaledDown?: {
    originalName: string;
    originalXp: number;
    scaledAt: string;
    expiresAt: string;
  };
  goalId?: string;
  sortOrder?: number;
  rewardBundle?: string;
  hibernatedAt?: string;
}

// ── Micro-Reflections ──
export type ReflectionMood = 'energized' | 'good' | 'meh' | 'tough';

export interface MicroReflection {
  habitId: string;
  mood: ReflectionMood;
  date: string;
}

export const REFLECTION_MOOD_CONFIG: Record<ReflectionMood, { icon: string; label: string; color: string }> = {
  energized: { icon: 'flash', label: 'Energized', color: '#FBBF24' },
  good: { icon: 'thumbs-up', label: 'Good', color: '#4ADE80' },
  meh: { icon: 'remove-circle-outline', label: 'Meh', color: '#94A3B8' },
  tough: { icon: 'barbell-outline', label: 'Tough', color: '#F87171' },
};

export type QuestPriority = 'low' | 'medium' | 'high';
export type QuestType = 'daily' | 'weekly' | 'ongoing';

export interface SideQuest {
  id: string;
  title: string;
  description?: string;
  xpReward: number;
  priority: QuestPriority;
  questType?: QuestType;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export type JournalMood = 'great' | 'good' | 'okay' | 'rough';
export type JournalEntryType = 'daily' | 'weekly';

export interface JournalEntry {
  id: string;
  entryType?: JournalEntryType;
  gratitudes: [string, string, string];
  achievements?: string[];
  improvement?: string;
  content?: string;
  weekHighlights?: string;
  weekChallenges?: string;
  nextWeekGoals?: string;
  mood?: JournalMood;
  createdAt: string;
  wordCount: number;
  xpAwarded: number;
  promptsUsed?: string[];
  entryDate?: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  condition: (
    habits: Habit[],
    progress: UserProgress,
    quests: SideQuest[],
    entries: JournalEntry[]
  ) => boolean;
  type: 'habits' | 'quests' | 'journal' | 'mixed';
}

export interface WeeklyBoss {
  id: string;
  name: string;
  description: string;
  icon: string;
  healthPoints: number;
  xpReward: number;
  bonusReward?: string;
  requiredCompletions: number;
}

export interface WeeklyBossProgress {
  bossId: string;
  currentDamage: number;
  defeated: boolean;
  weekStart: string;
}

export type SkillTreeCategory = 'discipline' | 'wellness' | 'growth' | 'balance';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: SkillTreeCategory;
  xpCost: number;
  prerequisiteIds?: string[];
  effect: {
    type: 'xp_bonus' | 'streak_protection' | 'rest_day' | 'category_bonus';
    value: number;
    categoryTarget?: HabitCategory;
  };
}

export interface UnlockedSkill {
  skillId: string;
  unlockedAt: string;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (habits: Habit[], progress: UserProgress) => boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (habits: Habit[], progress: UserProgress) => boolean;
  category?: 'streak' | 'level' | 'completion' | 'category' | 'special';
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'level' | 'achievement' | 'special' | 'seasonal';
  earnedAt?: string;
}

export interface UserProgress {
  totalXp: number;
  level: number;
  achievements: string[];
  streakFreezes: number;
  lastWeeklyFreezeEarned: string | null;
  lastJournalXpDate?: string;
  todayJournalXp?: number;
  currentHp: number;
  maxHp: number;
  lastLoginDate?: string;
  faintCount?: number;
  activeTitle?: string;
  unlockedTitles?: string[];
  badges?: Badge[];
  unlockedSkills?: UnlockedSkill[];
  weeklyBossProgress?: WeeklyBossProgress;
  completedChallenges?: string[];
  lastChallengeDate?: string;
  totalCompletions?: number;
  milestonesReached?: string[];
  inUnderworld?: boolean;
  underworldStartDate?: string;
  underworldDaysCompleted?: number;
  underworldResurrections?: number;
  medicineStreak?: number;
  lastMedicineStreakDate?: string;
  totalMedicinesTaken?: number;
  todayMedicineXp?: number;
  lastMedicineXpDate?: string;
}

export const HP_CONFIG = {
  DEFAULT_HP: 100,
  MAX_HP: 100,
  MISSED_HABIT_DAMAGE: 10,
  FAINT_THRESHOLD: 0,
  FAINT_LEVEL_PENALTY: 1,
  FAINT_HP_RESET: 50,
  COMPLETION_HEAL: 5,
  PERFECT_DAY_HEAL: 20,
};

export type CompanionSpecies = 'treant' | 'phoenix' | 'owl' | 'keeper';
export type CompanionMood = 'happy' | 'content' | 'sleepy' | 'worried';
export type GiftType = 'streak_freeze' | 'xp_boost' | 'hp_potion';

export interface CompanionGift {
  id: string;
  type: GiftType;
  giftedAt: string;
  claimed: boolean;
}

export interface Companion {
  id: string;
  userId: string;
  name: string;
  species: CompanionSpecies;
  evolutionStage: number;
  mood: CompanionMood;
  totalXp: number;
  lastGiftDate?: string;
  gifts?: CompanionGift[];
  createdAt: string;
}

export const BIRD_EVOLUTION_STAGES: string[] = [
  'Baby',
  'Toddler',
  'Child',
  'Teen',
  'Adult',
];

export function getBirdStageName(stage: number): string {
  return BIRD_EVOLUTION_STAGES[Math.min(Math.max(stage - 1, 0), 4)];
}

export type GoalCategory = 'fitness' | 'learning' | 'career' | 'health' | 'creative' | 'financial';
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned';
export type GoalLevel = 'beginner' | 'intermediate' | 'advanced';
export type CheckInStatus = 'on_track' | 'struggling' | 'ahead' | 'paused';

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface GoalCheckIn {
  date: string;
  status: CheckInStatus;
  note?: string;
  aiAdjustments?: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  targetDate: string;
  status: GoalStatus;
  currentLevel?: GoalLevel;
  dailyTimeAvailable?: number;
  constraints?: string;
  preferences?: string;
  linkedHabitIds?: string[];
  milestones?: GoalMilestone[];
  checkIns?: GoalCheckIn[];
  phases?: {
    weekStart: number;
    weekEnd: number;
    description: string;
    habitUpdates: { habitId: string; newName?: string; newXpReward?: number }[];
  }[];
  currentPhaseIndex?: number;
  createdAt: string;
}

export type MedicineScheduleLabel = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

export interface MedicineScheduleTime {
  label: MedicineScheduleLabel | string;
  time: string;
  reminderEnabled: boolean;
}

export interface Medicine {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  instructions?: string;
  prescriber?: string;
  groupId?: string;
  scheduledTimes: MedicineScheduleTime[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MedicineCompletionStatus = 'taken' | 'skipped' | 'pending';

export interface TodayMedicineScheduleItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  instructions?: string;
  scheduledTime: string;
  label: string;
  status: MedicineCompletionStatus;
  takenAt?: string;
  notes?: string;
  groupId?: string;
  groupName?: string;
}

export interface OracleChallenge {
  id: string;
  userId: string;
  challengeText: string;
  predictionBasis?: string;
  xpReward: number;
  expiresAt: string;
  accepted: boolean;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export type MilestoneType = '30_days' | '90_days' | '365_days' | 'custom';

export interface TimeCapsule {
  id: string;
  userId: string;
  message: string;
  milestoneType: MilestoneType;
  createdAt: string;
  openDate: string;
  opened: boolean;
  openedAt?: string;
  canOpen?: boolean;
  daysUntilOpen?: number;
}

// Config constants
export const MOOD_CONFIG: Record<JournalMood, { icon: string; label: string; color: string }> = {
  great: { icon: 'sparkles', label: 'Great', color: '#FBBF24' },
  good: { icon: 'leaf', label: 'Good', color: '#4ADE80' },
  okay: { icon: 'cloudy-night', label: 'Okay', color: '#60A5FA' },
  rough: { icon: 'rainy', label: 'Rough', color: '#9CA3AF' },
};

export const JOURNAL_XP = {
  BASE: 20,
  ACHIEVEMENTS_BONUS: 5,
  IMPROVEMENT_BONUS: 10,
  THOUGHTS_BONUS: 10,
  WEEKLY_BONUS: 25,
  MAX_DAILY: 65,
};

export const TIME_OF_DAY_CONFIG: Record<TimeOfDay, { icon: string; label: string; range: string }> =
  {
    morning: { icon: 'sunny-outline', label: 'Morning', range: '5am - 12pm' },
    afternoon: { icon: 'partly-sunny-outline', label: 'Afternoon', range: '12pm - 5pm' },
    evening: { icon: 'moon-outline', label: 'Evening', range: '5pm - 12am' },
    anytime: { icon: 'time-outline', label: 'Anytime', range: 'All day' },
  };

export const QUEST_PRIORITY_CONFIG: Record<
  QuestPriority,
  { label: string; xp: number; color: string }
> = {
  low: { label: 'Minor', xp: 25, color: '#9CA3AF' },
  medium: { label: 'Standard', xp: 50, color: '#00E5CC' },
  high: { label: 'Epic', xp: 100, color: '#FFB800' },
};

export const FREQUENCY_LABELS: Record<HabitFrequencyType, string> = {
  daily: 'Every day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  custom: 'Custom days',
  timesPerWeek: 'Times per week',
};

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const GOAL_CATEGORY_CONFIG: Record<
  GoalCategory,
  { label: string; icon: string; color: string }
> = {
  fitness: { label: 'Fitness', icon: 'barbell-outline', color: '#22C55E' },
  learning: { label: 'Learning', icon: 'book-outline', color: '#3B82F6' },
  career: { label: 'Career', icon: 'briefcase-outline', color: '#A855F7' },
  health: { label: 'Health', icon: 'heart-outline', color: '#EF4444' },
  creative: { label: 'Creative', icon: 'color-palette-outline', color: '#EC4899' },
  financial: { label: 'Financial', icon: 'wallet-outline', color: '#F59E0B' },
};

export const GOAL_STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; icon: string; color: string }
> = {
  active: { label: 'Active', icon: 'radio-button-on', color: '#00E5CC' },
  achieved: { label: 'Achieved', icon: 'trophy', color: '#22C55E' },
  paused: { label: 'Paused', icon: 'pause-circle', color: '#F59E0B' },
  abandoned: { label: 'Abandoned', icon: 'close-circle', color: '#71717A' },
};

export const UNDERWORLD_CONFIG = {
  DAYS_TO_RESURRECT: 3,
  RESURRECTION_HP: 75,
  RESURRECTION_XP_BONUS: 100,
};

export function formatMedicineTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getCategoryColor(category: HabitCategory): string {
  const colors: Record<HabitCategory, string> = {
    health: '#00FF88',
    career: '#4D9FFF',
    mind: '#B366FF',
    life: '#FFB800',
  };
  return colors[category] ?? '#A1A1AA';
}

export function getCategoryLabel(category: HabitCategory): string {
  const labels: Record<HabitCategory, string> = {
    health: 'Health',
    career: 'Career',
    mind: 'Mind',
    life: 'Life',
  };
  return labels[category] ?? category;
}

// ============================================
// Goal-to-Habit AI Pipeline Types
// ============================================

export interface ContextQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
  placeholder?: string;
}

export interface ContextAnswer {
  question: string;
  answer: string;
}

export interface SuggestedHabit {
  name: string;
  category: HabitCategory;
  xpReward: number;
  frequency?: HabitFrequency;
  timeOfDay?: TimeOfDay;
  location?: string;
  trigger?: string;
  rationale: string;
  citation?: { author: string; year: number; finding: string };
}

export interface SuggestedMilestone {
  title: string;
  targetWeek: number;
  description: string;
}

export interface SuggestedPhase {
  weekStart: number;
  weekEnd: number;
  description: string;
  habitProgressions: {
    habitName: string;
    newName: string;
    newXpReward?: number;
  }[];
}

// ── Neurodivergence Profile ──────────────────────────────────────────────

export type NdCondition = 'adhd' | 'autism' | 'anxiety' | 'depression' | 'dyslexia';
export type AdhdSubtype = 'inattentive' | 'hyperactive-impulsive' | 'combined';
export type MedicationStatus = 'medicated' | 'unmedicated' | 'prefer-not-to-say';
export type DiagnosisType = 'professional' | 'self-identified' | 'exploring';

export interface NeurodivergenceProfile {
  conditions: NdCondition[];
  adhdSubtype?: AdhdSubtype;
  supportNeeds?: string[];
  medicationStatus?: MedicationStatus;
  diagnosisType?: DiagnosisType;
}

// Colors are WCAG AA compliant (≥3:1 contrast) against both light (#FDF6EE) and dark (#1A1A2E) backgrounds
export const ND_CONDITION_CONFIG: Record<NdCondition, { label: string; icon: string; color: string; description: string }> = {
  adhd: { label: 'ADHD', icon: 'flash-outline', color: '#D4511E', description: 'Attention, focus, and executive function' },
  autism: { label: 'Autism', icon: 'color-filter-outline', color: '#0A8F7F', description: 'Sensory processing and routine preferences' },
  anxiety: { label: 'Anxiety', icon: 'pulse-outline', color: '#448AFF', description: 'Worry, perfectionism, and avoidance' },
  depression: { label: 'Depression', icon: 'cloudy-outline', color: '#7C4DFF', description: 'Low energy, motivation, and mood' },
  dyslexia: { label: 'Dyslexia', icon: 'book-outline', color: '#B8860B', description: 'Reading and text processing' },
};

export const ADHD_SUBTYPE_CONFIG: Record<AdhdSubtype, { label: string; description: string }> = {
  inattentive: { label: 'Inattentive', description: 'Difficulty focusing, forgetfulness, losing track of tasks' },
  'hyperactive-impulsive': { label: 'Hyperactive-Impulsive', description: 'Restlessness, impulsivity, difficulty waiting' },
  combined: { label: 'Combined', description: 'Both inattentive and hyperactive-impulsive patterns' },
};

export const DIAGNOSIS_TYPE_CONFIG: Record<DiagnosisType, { label: string }> = {
  professional: { label: 'Professionally diagnosed' },
  'self-identified': { label: 'Self-identified' },
  exploring: { label: 'Still exploring' },
};
