/**
 * Compassion Engine — Kristin Neff's self-compassion research
 *
 * Instead of punishing users for missed habits, provide empathetic
 * encouragement that reduces shame spirals and increases re-engagement.
 * Research shows self-compassion after setbacks increases persistence
 * by ~30% compared to self-criticism (Breines & Chen, 2012).
 */

import type { Habit } from '@/types';

export interface CompassionMessage {
  headline: string;
  body: string;
  actionLabel: string;
  /** Which habit to suggest starting with (lowest friction) */
  suggestedHabitId?: string;
  tone: 'gentle' | 'encouraging' | 'celebratory';
}

interface CompassionContext {
  missedCount: number;
  totalHabits: number;
  currentHp: number;
  maxHp: number;
  longestActiveStreak: number;
  totalCompletionsAllTime: number;
  daysSinceLastCompletion: number;
  habits: Habit[];
}

// ── Message Banks ──

const GENTLE_HEADLINES = [
  'Everyone has off days',
  'Progress isn\'t always linear',
  'Be kind to yourself today',
  'One day doesn\'t define you',
  'You\'re still here — that counts',
  'Rest is part of the journey',
];

const ENCOURAGING_HEADLINES = [
  'Ready for a fresh start?',
  'Your streak is waiting',
  'Small steps, big impact',
  'Let\'s build momentum',
  'Today is a new chapter',
  'One habit at a time',
];

const GENTLE_BODIES: ((ctx: CompassionContext) => string)[] = [
  (ctx) => `You missed ${ctx.missedCount} habit${ctx.missedCount > 1 ? 's' : ''} — and that's okay. Research shows that self-compassion after a setback makes you more likely to bounce back, not less.`,
  (ctx) => `Missing a day doesn't erase your ${ctx.totalCompletionsAllTime} total completions. Your brain has already built pathways from all that practice.`,
  (ctx) => `${ctx.missedCount > 1 ? 'A few' : 'One'} missed habit${ctx.missedCount > 1 ? 's don\'t' : ' doesn\'t'} undo weeks of progress. The fact that you're opening this app right now shows real commitment.`,
  () => 'Habit scientists call this "the what-the-hell effect" — missing once makes you want to give up entirely. But you\'re smarter than that instinct.',
  (ctx) => ctx.longestActiveStreak > 3
    ? `You still have a ${ctx.longestActiveStreak}-day streak going. Focus on protecting that momentum today.`
    : 'Every expert was once a beginner. Today is another chance to practice.',
];

const LOW_HP_BODIES: ((ctx: CompassionContext) => string)[] = [
  () => 'Your HP is low, but that just means you\'ve been ambitious. Consider scaling one habit down to its 2-minute version today.',
  () => 'When HP drops, it\'s a signal to simplify — not quit. Pick your easiest habit and start there.',
  () => 'Low HP? Think of it as a rest day in training. Even athletes have recovery days built into their programs.',
];

const COMEBACK_BODIES: ((ctx: CompassionContext) => string)[] = [
  (ctx) => `It's been ${ctx.daysSinceLastCompletion} days since your last completion. No judgment — life happens. The best time to restart is right now.`,
  () => 'Welcome back. Research shows that returning after a break actually strengthens long-term habit formation. Your brain remembers more than you think.',
  () => 'You took a break, and that\'s human. The beautiful thing about habits is they\'re always waiting for you to come back.',
];

// ── Core Logic ──

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Find the lowest-friction habit to suggest as a starting point.
 * Prefers: shortest name (proxy for simplicity), has scaledDown version, lowest XP (easiest).
 */
function findEasiestHabit(habits: Habit[]): Habit | undefined {
  const active = habits.filter((h) => !h.hibernatedAt);
  if (active.length === 0) return undefined;

  return active.reduce((best, h) => {
    const bestScore = (best.scaledDown ? 0 : 2) + best.xpReward;
    const hScore = (h.scaledDown ? 0 : 2) + h.xpReward;
    return hScore < bestScore ? h : best;
  });
}

function shortName(name: string, max = 20): string {
  return name.length <= max ? name : name.slice(0, max - 1).trimEnd() + '…';
}

export function generateCompassionMessage(ctx: CompassionContext): CompassionMessage | null {
  // No missed habits — no compassion needed
  if (ctx.missedCount === 0) return null;

  const easiest = findEasiestHabit(ctx.habits);
  const hpRatio = ctx.maxHp > 0 ? ctx.currentHp / ctx.maxHp : 1;

  // Comeback after extended absence (3+ days)
  if (ctx.daysSinceLastCompletion >= 3) {
    return {
      headline: pickRandom(GENTLE_HEADLINES),
      body: pickRandom(COMEBACK_BODIES)(ctx),
      actionLabel: easiest ? `Start with ${shortName(easiest.name)}` : 'Start small today',
      suggestedHabitId: easiest?.id,
      tone: 'gentle',
    };
  }

  // Low HP — user is struggling
  if (hpRatio < 0.35) {
    return {
      headline: pickRandom(GENTLE_HEADLINES),
      body: pickRandom(LOW_HP_BODIES)(ctx),
      actionLabel: easiest ? `Just do ${shortName(easiest.name)}` : 'Pick your easiest one',
      suggestedHabitId: easiest?.id,
      tone: 'gentle',
    };
  }

  // Normal miss — encouraging tone
  if (ctx.missedCount <= Math.ceil(ctx.totalHabits / 2)) {
    return {
      headline: pickRandom(ENCOURAGING_HEADLINES),
      body: pickRandom(GENTLE_BODIES)(ctx),
      actionLabel: 'Let\'s go',
      suggestedHabitId: easiest?.id,
      tone: 'encouraging',
    };
  }

  // Missed most habits — gentler approach
  return {
    headline: pickRandom(GENTLE_HEADLINES),
    body: pickRandom(GENTLE_BODIES)(ctx),
    actionLabel: easiest ? `Start with ${shortName(easiest.name)}` : 'Start with one',
    suggestedHabitId: easiest?.id,
    tone: 'gentle',
  };
}
