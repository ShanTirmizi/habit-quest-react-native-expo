import { WeeklyBoss } from '@/types';

export const WEEKLY_BOSSES: WeeklyBoss[] = [
  {
    id: 'sloth-king',
    name: 'The Sloth King',
    description: 'A massive creature of laziness and procrastination',
    icon: '🦥',
    healthPoints: 100,
    xpReward: 200,
    bonusReward: 'Productivity Crown',
    requiredCompletions: 20,
  },
  {
    id: 'chaos-dragon',
    name: 'Chaos Dragon',
    description: 'Breathes fire of distraction and disorder',
    icon: '🐉',
    healthPoints: 120,
    xpReward: 250,
    bonusReward: 'Order Shield',
    requiredCompletions: 25,
  },
  {
    id: 'shadow-doubt',
    name: 'Shadow of Doubt',
    description: 'Whispers of failure and insecurity',
    icon: '👤',
    healthPoints: 80,
    xpReward: 180,
    bonusReward: 'Confidence Amulet',
    requiredCompletions: 15,
  },
  {
    id: 'time-thief',
    name: 'The Time Thief',
    description: 'Steals hours and wastes potential',
    icon: '⏰',
    healthPoints: 110,
    xpReward: 220,
    bonusReward: 'Time Crystal',
    requiredCompletions: 22,
  },
  {
    id: 'comfort-golem',
    name: 'Comfort Golem',
    description: 'Traps you in the easy path',
    icon: '🛋️',
    healthPoints: 90,
    xpReward: 190,
    bonusReward: 'Growth Gem',
    requiredCompletions: 18,
  },
  {
    id: 'distraction-hydra',
    name: 'Distraction Hydra',
    description: 'Every head is a new notification',
    icon: '📱',
    healthPoints: 130,
    xpReward: 280,
    bonusReward: 'Focus Ring',
    requiredCompletions: 28,
  },
];

// Get boss for current week based on week number
export function getWeeklyBoss(): WeeklyBoss {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7
  );
  return WEEKLY_BOSSES[weekNumber % WEEKLY_BOSSES.length];
}

// Get start of current week (Sunday)
export function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}
