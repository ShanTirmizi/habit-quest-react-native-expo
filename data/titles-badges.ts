import { Title, Badge, Habit, UserProgress } from '@/types';

// ============================================
// TITLES - Earned through achievements
// ============================================
export const TITLES: Title[] = [
  // Common Titles
  {
    id: 'novice',
    name: 'Novice Adventurer',
    description: 'Begin your journey',
    icon: '🌱',
    condition: () => true, // Default title
    rarity: 'common',
  },
  {
    id: 'initiate',
    name: 'Habit Initiate',
    description: 'Create your first habit',
    icon: '📜',
    condition: (habits) => habits.length >= 1,
    rarity: 'common',
  },
  {
    id: 'consistent',
    name: 'The Consistent',
    description: 'Reach a 3-day streak',
    icon: '🔥',
    condition: (habits) => habits.some((h) => h.streak >= 3),
    rarity: 'common',
  },

  // Uncommon Titles
  {
    id: 'dedicated',
    name: 'The Dedicated',
    description: 'Reach a 7-day streak',
    icon: '⭐',
    condition: (habits) => habits.some((h) => h.streak >= 7),
    rarity: 'uncommon',
  },
  {
    id: 'multi-tracker',
    name: 'Multi-Tracker',
    description: 'Track 5 or more habits',
    icon: '📊',
    condition: (habits) => habits.length >= 5,
    rarity: 'uncommon',
  },
  {
    id: 'apprentice',
    name: 'Apprentice',
    description: 'Reach level 5',
    icon: '🎓',
    condition: (_, progress) => progress.level >= 5,
    rarity: 'uncommon',
  },
  {
    id: 'chronicler',
    name: 'Chronicler',
    description: 'Write 7 journal entries',
    icon: '📝',
    condition: (_, progress) => (progress.totalCompletions || 0) >= 50,
    rarity: 'uncommon',
  },

  // Rare Titles
  {
    id: 'steadfast',
    name: 'The Steadfast',
    description: 'Reach a 14-day streak',
    icon: '💪',
    condition: (habits) => habits.some((h) => h.streak >= 14),
    rarity: 'rare',
  },
  {
    id: 'journeyman',
    name: 'Journeyman',
    description: 'Reach level 10',
    icon: '🗡️',
    condition: (_, progress) => progress.level >= 10,
    rarity: 'rare',
  },
  {
    id: 'habit-master',
    name: 'Habit Master',
    description: 'Track 10 or more habits',
    icon: '📚',
    condition: (habits) => habits.length >= 10,
    rarity: 'rare',
  },
  {
    id: 'balanced',
    name: 'The Balanced',
    description: 'Have habits in all 4 categories',
    icon: '☯️',
    condition: (habits) => {
      const categories = new Set(habits.map((h) => h.category));
      return categories.size >= 4;
    },
    rarity: 'rare',
  },
  {
    id: 'early-riser',
    name: 'Early Riser',
    description: 'Complete 50 morning habits',
    icon: '🌅',
    condition: (habits) => {
      const morningHabits = habits.filter((h) => h.timeOfDay === 'morning');
      const totalCompletions = morningHabits.reduce((sum, h) => sum + h.completedDates.length, 0);
      return totalCompletions >= 50;
    },
    rarity: 'rare',
  },

  // Epic Titles
  {
    id: 'unyielding',
    name: 'The Unyielding',
    description: 'Reach a 30-day streak',
    icon: '🛡️',
    condition: (habits) => habits.some((h) => h.streak >= 30),
    rarity: 'epic',
  },
  {
    id: 'expert',
    name: 'Expert',
    description: 'Reach level 20',
    icon: '⚔️',
    condition: (_, progress) => progress.level >= 20,
    rarity: 'epic',
  },
  {
    id: 'achievement-hunter',
    name: 'Achievement Hunter',
    description: 'Unlock 15 achievements',
    icon: '🏅',
    condition: (_, progress) => progress.achievements.length >= 15,
    rarity: 'epic',
  },
  {
    id: 'wellness-warrior',
    name: 'Wellness Warrior',
    description: 'Complete 100 health category habits',
    icon: '💚',
    condition: (habits) => {
      const healthHabits = habits.filter((h) => h.category === 'health');
      const totalCompletions = healthHabits.reduce((sum, h) => sum + h.completedDates.length, 0);
      return totalCompletions >= 100;
    },
    rarity: 'epic',
  },
  {
    id: 'scholar-supreme',
    name: 'Scholar Supreme',
    description: 'Complete 100 mind/career habits',
    icon: '📖',
    condition: (habits) => {
      const relevantHabits = habits.filter((h) => h.category === 'mind' || h.category === 'career');
      const totalCompletions = relevantHabits.reduce((sum, h) => sum + h.completedDates.length, 0);
      return totalCompletions >= 100;
    },
    rarity: 'epic',
  },

  // Legendary Titles
  {
    id: 'legendary',
    name: 'The Legendary',
    description: 'Reach a 100-day streak',
    icon: '👑',
    condition: (habits) => habits.some((h) => h.streak >= 100),
    rarity: 'legendary',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    description: 'Reach level 50',
    icon: '🌟',
    condition: (_, progress) => progress.level >= 50,
    rarity: 'legendary',
  },
  {
    id: 'perfectionist',
    name: 'The Perfectionist',
    description: 'Complete all habits for 30 consecutive days',
    icon: '💎',
    condition: (habits) => {
      if (habits.length === 0) return false;
      // Check if all habits have been completed for the last 30 days
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const allCompleted = habits.every((h) => h.completedDates.includes(dateStr));
        if (!allCompleted) return false;
      }
      return true;
    },
    rarity: 'legendary',
  },
  {
    id: 'transcendent',
    name: 'The Transcendent',
    description: 'Reach 10,000 total XP',
    icon: '✨',
    condition: (_, progress) => progress.totalXp >= 10000,
    rarity: 'legendary',
  },
];

// ============================================
// BADGES - Special accomplishments
// ============================================
export const BADGE_TEMPLATES: Omit<Badge, 'earnedAt'>[] = [
  // Streak Badges
  {
    id: 'streak-3',
    name: 'First Spark',
    description: '3-day streak achieved',
    icon: '🔥',
    category: 'streak',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: '7-day streak achieved',
    icon: '🗓️',
    category: 'streak',
  },
  {
    id: 'streak-14',
    name: 'Fortnight Fighter',
    description: '14-day streak achieved',
    icon: '⚡',
    category: 'streak',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: '30-day streak achieved',
    icon: '🌙',
    category: 'streak',
  },
  {
    id: 'streak-60',
    name: 'Sixty Sentinel',
    description: '60-day streak achieved',
    icon: '🛡️',
    category: 'streak',
  },
  {
    id: 'streak-100',
    name: 'Century Champion',
    description: '100-day streak achieved',
    icon: '💯',
    category: 'streak',
  },
  {
    id: 'streak-365',
    name: 'Year of Dedication',
    description: '365-day streak achieved',
    icon: '🏆',
    category: 'streak',
  },

  // Level Badges
  {
    id: 'level-5',
    name: 'Rising Star',
    description: 'Reached level 5',
    icon: '⭐',
    category: 'level',
  },
  {
    id: 'level-10',
    name: 'Double Digits',
    description: 'Reached level 10',
    icon: '🌟',
    category: 'level',
  },
  {
    id: 'level-25',
    name: 'Quarter Century',
    description: 'Reached level 25',
    icon: '💫',
    category: 'level',
  },
  {
    id: 'level-50',
    name: 'Half Century',
    description: 'Reached level 50',
    icon: '✨',
    category: 'level',
  },
  {
    id: 'level-100',
    name: 'Centurion',
    description: 'Reached level 100',
    icon: '👑',
    category: 'level',
  },

  // Achievement Badges
  {
    id: 'first-achievement',
    name: 'First Trophy',
    description: 'Unlocked your first achievement',
    icon: '🏅',
    category: 'achievement',
  },
  {
    id: 'achievement-10',
    name: 'Collector',
    description: 'Unlocked 10 achievements',
    icon: '🎖️',
    category: 'achievement',
  },
  {
    id: 'achievement-25',
    name: 'Trophy Hunter',
    description: 'Unlocked 25 achievements',
    icon: '🏆',
    category: 'achievement',
  },

  // Special Badges
  {
    id: 'perfect-day',
    name: 'Perfect Day',
    description: 'Completed all habits in one day',
    icon: '💯',
    category: 'special',
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: 'Completed all habits for 7 consecutive days',
    icon: '🌈',
    category: 'special',
  },
  {
    id: 'boss-slayer',
    name: 'Boss Slayer',
    description: 'Defeated your first weekly boss',
    icon: '⚔️',
    category: 'special',
  },
  {
    id: 'boss-hunter',
    name: 'Boss Hunter',
    description: 'Defeated 10 weekly bosses',
    icon: '🗡️',
    category: 'special',
  },
  {
    id: 'skill-unlocked',
    name: 'Skillful',
    description: 'Unlocked your first skill',
    icon: '🔮',
    category: 'special',
  },
  {
    id: 'skill-master',
    name: 'Skill Master',
    description: 'Unlocked 10 skills',
    icon: '📚',
    category: 'special',
  },
  {
    id: 'comeback',
    name: 'Comeback Kid',
    description: 'Rebuilt a streak after losing it',
    icon: '🔄',
    category: 'special',
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Completed 50 evening habits',
    icon: '🦉',
    category: 'special',
  },

  // Seasonal Badges (can be awarded during special events)
  {
    id: 'new-year',
    name: 'Fresh Start',
    description: 'Started habits in the new year',
    icon: '🎊',
    category: 'seasonal',
  },
  {
    id: 'summer-grind',
    name: 'Summer Grind',
    description: 'Maintained habits through summer',
    icon: '☀️',
    category: 'seasonal',
  },
  {
    id: 'holiday-hero',
    name: 'Holiday Hero',
    description: 'Kept habits during the holidays',
    icon: '🎄',
    category: 'seasonal',
  },
];

// Helper to check which titles are unlocked
export function getUnlockedTitles(habits: Habit[], progress: UserProgress): Title[] {
  return TITLES.filter((title) => title.condition(habits, progress));
}

// Helper to get title by ID
export function getTitleById(titleId: string): Title | undefined {
  return TITLES.find((t) => t.id === titleId);
}

// Helper to get rarity color
export function getRarityColor(rarity: Title['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'text-gray-400';
    case 'uncommon':
      return 'text-green-400';
    case 'rare':
      return 'text-blue-400';
    case 'epic':
      return 'text-purple-400';
    case 'legendary':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
}

export function getRarityBg(rarity: Title['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'bg-gray-500/10 border-gray-500/20';
    case 'uncommon':
      return 'bg-green-500/10 border-green-500/20';
    case 'rare':
      return 'bg-blue-500/10 border-blue-500/20';
    case 'epic':
      return 'bg-purple-500/10 border-purple-500/20';
    case 'legendary':
      return 'bg-yellow-500/10 border-yellow-500/20';
    default:
      return 'bg-gray-500/10 border-gray-500/20';
  }
}

// Check if badge should be awarded
export function checkBadgeCondition(
  badgeId: string,
  habits: Habit[],
  progress: UserProgress
): boolean {
  const maxStreak = Math.max(...habits.map((h) => h.streak), 0);

  switch (badgeId) {
    case 'streak-3':
      return maxStreak >= 3;
    case 'streak-7':
      return maxStreak >= 7;
    case 'streak-14':
      return maxStreak >= 14;
    case 'streak-30':
      return maxStreak >= 30;
    case 'streak-60':
      return maxStreak >= 60;
    case 'streak-100':
      return maxStreak >= 100;
    case 'streak-365':
      return maxStreak >= 365;
    case 'level-5':
      return progress.level >= 5;
    case 'level-10':
      return progress.level >= 10;
    case 'level-25':
      return progress.level >= 25;
    case 'level-50':
      return progress.level >= 50;
    case 'level-100':
      return progress.level >= 100;
    case 'first-achievement':
      return progress.achievements.length >= 1;
    case 'achievement-10':
      return progress.achievements.length >= 10;
    case 'achievement-25':
      return progress.achievements.length >= 25;
    case 'perfect-day': {
      const today = new Date().toISOString().split('T')[0];
      return habits.length > 0 && habits.every((h) => h.completedDates.includes(today));
    }
    case 'skill-unlocked':
      return (progress.unlockedSkills || []).length >= 1;
    case 'skill-master':
      return (progress.unlockedSkills || []).length >= 10;
    default:
      return false;
  }
}
