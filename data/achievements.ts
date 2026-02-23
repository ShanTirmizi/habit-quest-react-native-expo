import { Achievement, Habit, UserProgress, HabitCategory } from '@/types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Complete your first habit',
    icon: '👣',
    condition: (habits: Habit[]) => {
      return habits.some((h) => h.completedDates.length > 0);
    },
  },
  {
    id: 'consistent-7',
    name: 'Consistent',
    description: '7-day streak on any habit',
    icon: '🔥',
    condition: (habits: Habit[]) => {
      return habits.some((h) => h.streak >= 7);
    },
  },
  {
    id: 'dedicated-30',
    name: 'Dedicated',
    description: '30-day streak on any habit',
    icon: '💪',
    condition: (habits: Habit[]) => {
      return habits.some((h) => h.streak >= 30);
    },
  },
  {
    id: 'well-rounded',
    name: 'Well Rounded',
    description: 'Have habits in all 4 categories',
    icon: '🎯',
    condition: (habits: Habit[]) => {
      const categories = new Set(habits.map((h) => h.category));
      const allCategories: HabitCategory[] = ['health', 'career', 'mind', 'life'];
      return allCategories.every((c) => categories.has(c));
    },
  },
  {
    id: 'level-5',
    name: 'Level 5',
    description: 'Reach level 5',
    icon: '⭐',
    condition: (_habits: Habit[], progress: UserProgress) => {
      return progress.level >= 5;
    },
  },
  {
    id: 'level-10',
    name: 'Level 10',
    description: 'Reach level 10',
    icon: '🌟',
    condition: (_habits: Habit[], progress: UserProgress) => {
      return progress.level >= 10;
    },
  },
  {
    id: 'level-25',
    name: 'Veteran',
    description: 'Reach level 25',
    icon: '🏆',
    condition: (_habits: Habit[], progress: UserProgress) => {
      return progress.level >= 25;
    },
  },
  {
    id: 'collector-5',
    name: 'Collector',
    description: 'Unlock 5 achievements',
    icon: '🏅',
    condition: (_habits: Habit[], progress: UserProgress) => {
      return progress.achievements.length >= 5;
    },
  },
  {
    id: 'habit-master',
    name: 'Habit Master',
    description: 'Have 5+ active habits',
    icon: '📚',
    condition: (habits: Habit[]) => {
      return habits.length >= 5;
    },
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: 'Complete all habits for 7 days straight',
    icon: '🎖️',
    condition: (habits: Habit[]) => {
      if (habits.length === 0) return false;

      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];

        const allCompleted = habits.every((h) => h.completedDates.includes(dateStr));
        if (!allCompleted) return false;
      }
      return true;
    },
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Complete 100 total habit check-ins',
    icon: '💯',
    condition: (habits: Habit[]) => {
      const totalCompletions = habits.reduce((sum, h) => sum + h.completedDates.length, 0);
      return totalCompletions >= 100;
    },
  },
  {
    id: 'xp-hunter',
    name: 'XP Hunter',
    description: 'Earn 1000 total XP',
    icon: '💎',
    condition: (_habits: Habit[], progress: UserProgress) => {
      return progress.totalXp >= 1000;
    },
  },
  {
    id: 'xp-master',
    name: 'XP Master',
    description: 'Earn 5000 total XP',
    icon: '👑',
    condition: (_habits: Habit[], progress: UserProgress) => {
      return progress.totalXp >= 5000;
    },
  },
  {
    id: 'streak-saver',
    name: 'Streak Saver',
    description: 'Earn 3 streak freezes',
    icon: '❄️',
    condition: (_habits: Habit[], progress: UserProgress) => {
      return progress.streakFreezes >= 3;
    },
  },
  {
    id: 'health-nut',
    name: 'Health Nut',
    description: 'Complete 50 health habit check-ins',
    icon: '🏃',
    condition: (habits: Habit[]) => {
      const healthCompletions = habits
        .filter((h) => h.category === 'health')
        .reduce((sum, h) => sum + h.completedDates.length, 0);
      return healthCompletions >= 50;
    },
    category: 'category',
    rarity: 'uncommon',
  },
  // === Streak Achievements ===
  {
    id: 'streak-14',
    name: 'Two Weeks Strong',
    description: '14-day streak on any habit',
    icon: '🔥',
    condition: (habits: Habit[]) => habits.some((h) => h.streak >= 14),
    category: 'streak',
    rarity: 'uncommon',
  },
  {
    id: 'streak-60',
    name: 'Habit Veteran',
    description: '60-day streak on any habit',
    icon: '🏅',
    condition: (habits: Habit[]) => habits.some((h) => h.streak >= 60),
    category: 'streak',
    rarity: 'rare',
  },
  {
    id: 'streak-90',
    name: 'Quarterly Champion',
    description: '90-day streak on any habit',
    icon: '🏆',
    condition: (habits: Habit[]) => habits.some((h) => h.streak >= 90),
    category: 'streak',
    rarity: 'epic',
  },
  {
    id: 'streak-365',
    name: 'Year of Discipline',
    description: '365-day streak on any habit',
    icon: '👑',
    condition: (habits: Habit[]) => habits.some((h) => h.streak >= 365),
    category: 'streak',
    rarity: 'legendary',
  },
  // === Level Achievements ===
  {
    id: 'level-50',
    name: 'Master',
    description: 'Reach level 50',
    icon: '⚔️',
    condition: (_habits: Habit[], progress: UserProgress) => progress.level >= 50,
    category: 'level',
    rarity: 'epic',
  },
  {
    id: 'level-100',
    name: 'Legend',
    description: 'Reach level 100',
    icon: '🌟',
    condition: (_habits: Habit[], progress: UserProgress) => progress.level >= 100,
    category: 'level',
    rarity: 'legendary',
  },
  // === Category Achievements ===
  {
    id: 'career-climber',
    name: 'Career Climber',
    description: 'Complete 50 career habit check-ins',
    icon: '💼',
    condition: (habits: Habit[]) => {
      const completions = habits
        .filter((h) => h.category === 'career')
        .reduce((sum, h) => sum + h.completedDates.length, 0);
      return completions >= 50;
    },
    category: 'category',
    rarity: 'uncommon',
  },
  {
    id: 'mindful-master',
    name: 'Mindful Master',
    description: 'Complete 50 mind habit check-ins',
    icon: '🧠',
    condition: (habits: Habit[]) => {
      const completions = habits
        .filter((h) => h.category === 'mind')
        .reduce((sum, h) => sum + h.completedDates.length, 0);
      return completions >= 50;
    },
    category: 'category',
    rarity: 'uncommon',
  },
  {
    id: 'life-organizer',
    name: 'Life Organizer',
    description: 'Complete 50 life habit check-ins',
    icon: '✨',
    condition: (habits: Habit[]) => {
      const completions = habits
        .filter((h) => h.category === 'life')
        .reduce((sum, h) => sum + h.completedDates.length, 0);
      return completions >= 50;
    },
    category: 'category',
    rarity: 'uncommon',
  },
  // === XP Achievements ===
  {
    id: 'xp-10k',
    name: 'XP Overlord',
    description: 'Earn 10,000 total XP',
    icon: '💎',
    condition: (_habits: Habit[], progress: UserProgress) => progress.totalXp >= 10000,
    category: 'special',
    rarity: 'rare',
  },
  {
    id: 'xp-25k',
    name: 'XP Legend',
    description: 'Earn 25,000 total XP',
    icon: '🌟',
    condition: (_habits: Habit[], progress: UserProgress) => progress.totalXp >= 25000,
    category: 'special',
    rarity: 'epic',
  },
  // === Completion Achievements ===
  {
    id: 'completions-500',
    name: 'Half Millennium',
    description: 'Complete 500 total habit check-ins',
    icon: '🎯',
    condition: (habits: Habit[]) => {
      const total = habits.reduce((sum, h) => sum + h.completedDates.length, 0);
      return total >= 500;
    },
    category: 'completion',
    rarity: 'rare',
  },
  {
    id: 'completions-1000',
    name: 'Millennium',
    description: 'Complete 1000 total habit check-ins',
    icon: '🏅',
    condition: (habits: Habit[]) => {
      const total = habits.reduce((sum, h) => sum + h.completedDates.length, 0);
      return total >= 1000;
    },
    category: 'completion',
    rarity: 'epic',
  },
  // === Fun/Special Achievements ===
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Have 3+ habits with morning time preference',
    icon: '🌅',
    condition: (habits: Habit[]) => {
      const morningHabits = habits.filter((h) => h.timeOfDay === 'morning');
      return morningHabits.length >= 3;
    },
    category: 'special',
    rarity: 'common',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Have 3+ habits with evening time preference',
    icon: '🌙',
    condition: (habits: Habit[]) => {
      const eveningHabits = habits.filter((h) => h.timeOfDay === 'evening');
      return eveningHabits.length >= 3;
    },
    category: 'special',
    rarity: 'common',
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Have a habit with weekends-only frequency',
    icon: '🎉',
    condition: (habits: Habit[]) => {
      return habits.some((h) => h.frequency?.type === 'weekends');
    },
    category: 'special',
    rarity: 'common',
  },
  {
    id: 'habit-chain',
    name: 'Chain Reaction',
    description: 'Create a habit chain (link one habit after another)',
    icon: '🔗',
    condition: (habits: Habit[]) => {
      return habits.some((h) => h.chainedToHabitId);
    },
    category: 'special',
    rarity: 'common',
  },
  {
    id: 'multi-streaker',
    name: 'Multi-Streaker',
    description: 'Have 3+ habits with 7+ day streaks simultaneously',
    icon: '🔥',
    condition: (habits: Habit[]) => {
      const streakingHabits = habits.filter((h) => h.streak >= 7);
      return streakingHabits.length >= 3;
    },
    category: 'streak',
    rarity: 'rare',
  },
  {
    id: 'habit-hoarder',
    name: 'Habit Hoarder',
    description: 'Have 10+ active habits',
    icon: '📚',
    condition: (habits: Habit[]) => habits.length >= 10,
    category: 'completion',
    rarity: 'uncommon',
  },
  {
    id: 'perfect-month',
    name: 'Perfect Month',
    description: 'Complete all habits for 30 days straight',
    icon: '🌟',
    condition: (habits: Habit[]) => {
      if (habits.length === 0) return false;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const allCompleted = habits.every((h) => h.completedDates.includes(dateStr));
        if (!allCompleted) return false;
      }
      return true;
    },
    category: 'streak',
    rarity: 'epic',
  },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    description: 'Rebuild a 7-day streak after losing one',
    icon: '🦅',
    condition: (habits: Habit[]) => {
      // Check if any habit has had multiple 7+ day streaks (approximated by total completions vs current streak)
      return habits.some((h) => {
        const totalDays = h.completedDates.length;
        const currentStreak = h.streak;
        // If they've completed more days than their current streak + 7, they likely had a previous streak
        return currentStreak >= 7 && totalDays >= currentStreak + 7;
      });
    },
    category: 'special',
    rarity: 'uncommon',
  },
  {
    id: 'note-taker',
    name: 'Note Taker',
    description: 'Add notes to 5 different habits',
    icon: '📝',
    condition: (habits: Habit[]) => {
      const habitsWithNotes = habits.filter((h) => h.notes && h.notes.length > 0);
      return habitsWithNotes.length >= 5;
    },
    category: 'special',
    rarity: 'common',
  },
];

// ============================================
// Medicine Achievements
// ============================================
// Note: These achievements are checked server-side in convex/medicines.ts
// The conditions here are for display/reference only
export const MEDICINE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'med-starter',
    name: 'Pill Popper',
    description: 'Take your first medicine dose',
    icon: '💊',
    condition: () => false, // Checked server-side via totalMedicinesTaken >= 1
    category: 'special',
    rarity: 'common',
  },
  {
    id: 'med-consistent-7',
    name: 'Consistent Care',
    description: '7-day medicine adherence streak',
    icon: '🏥',
    condition: () => false, // Checked server-side via medicineStreak >= 7
    category: 'streak',
    rarity: 'uncommon',
  },
  {
    id: 'med-consistent-30',
    name: 'Health Guardian',
    description: '30-day medicine adherence streak',
    icon: '🛡️',
    condition: () => false, // Checked server-side via medicineStreak >= 30
    category: 'streak',
    rarity: 'rare',
  },
  {
    id: 'med-perfect-week',
    name: 'Perfect Prescription',
    description: 'Take all medicines on time for 7 days',
    icon: '⭐',
    condition: () => false, // Checked server-side
    category: 'streak',
    rarity: 'uncommon',
  },
  {
    id: 'med-century',
    name: 'Medicine Centurion',
    description: 'Take 100 medicine doses',
    icon: '💯',
    condition: () => false, // Checked server-side via totalMedicinesTaken >= 100
    category: 'completion',
    rarity: 'uncommon',
  },
  {
    id: 'med-group-master',
    name: 'Stack Master',
    description: 'Use "Take All" for medicine groups 50 times',
    icon: '📦',
    condition: () => false, // Checked server-side via totalGroupTakeAllUsed >= 50
    category: 'special',
    rarity: 'rare',
  },
];

// Combine all achievements for easy access
export const ALL_ACHIEVEMENTS = [...ACHIEVEMENTS, ...MEDICINE_ACHIEVEMENTS];

export const STARTER_HABITS = [
  { name: 'Gym', category: 'health' as HabitCategory, xpReward: 20 },
  { name: 'Reading', category: 'mind' as HabitCategory, xpReward: 15 },
  { name: 'Interview Prep', category: 'career' as HabitCategory, xpReward: 25 },
  { name: 'Hiking', category: 'health' as HabitCategory, xpReward: 20 },
  { name: 'Clean Room', category: 'life' as HabitCategory, xpReward: 10 },
];
