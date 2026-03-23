import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { verifyAuth } from './lib/auth';

// Predefined challenge templates based on user patterns
const CHALLENGE_TEMPLATES = [
  {
    template: 'Complete all your {category} habits today',
    xpBase: 50,
    requiresCategory: true,
  },
  {
    template: 'Complete {count} habits before noon',
    xpBase: 40,
    requiresCount: true,
  },
  {
    template: 'Start your day with your first habit within 1 hour of waking',
    xpBase: 35,
  },
  {
    template: 'Complete a habit you usually skip on {dayOfWeek}s',
    xpBase: 45,
    requiresDayOfWeek: true,
  },
  {
    template: 'Achieve a perfect day - complete every habit',
    xpBase: 75,
  },
  {
    template: 'Complete your most challenging habit first',
    xpBase: 40,
  },
  {
    template: 'Add a note to every habit you complete today',
    xpBase: 30,
  },
  {
    template: 'Complete all morning habits before moving to afternoon',
    xpBase: 45,
    requiresTimeOfDay: true,
  },
  {
    template: 'Break your personal best streak on any habit',
    xpBase: 60,
  },
  {
    template: 'Complete at least 3 habits in a row without breaks',
    xpBase: 35,
  },
];

// Helper to get today's end as ISO string
function getTodayEndISO(): string {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.toISOString();
}

// Generate a challenge based on user patterns
export const generateChallenge = mutation({
  args: {
    userId: v.id('users'),
    habitCategories: v.optional(v.array(v.string())),
    habitCount: v.optional(v.number()),
    weakDay: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    // Check if there's already an active challenge
    const existing = await ctx.db
      .query('oracleChallenges')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .first();

    const now = new Date().toISOString();

    // If there's an active, non-expired challenge, return it
    if (existing && !existing.completed && existing.expiresAt > now) {
      return { existing: true, challenge: existing };
    }

    // Select a random challenge template
    const template = CHALLENGE_TEMPLATES[Math.floor(Math.random() * CHALLENGE_TEMPLATES.length)];

    // Build challenge text with substitutions
    let challengeText = template.template;
    let predictionBasis = '';

    if (template.requiresCategory && args.habitCategories?.length) {
      const randomCategory =
        args.habitCategories[Math.floor(Math.random() * args.habitCategories.length)];
      challengeText = challengeText.replace('{category}', randomCategory);
      predictionBasis = `Based on your ${randomCategory} habits`;
    }

    if (template.requiresCount && args.habitCount) {
      const targetCount = Math.max(2, Math.floor(args.habitCount * 0.6));
      challengeText = challengeText.replace('{count}', targetCount.toString());
      predictionBasis = `Based on your ${args.habitCount} total habits`;
    }

    if (template.requiresDayOfWeek && args.weakDay) {
      challengeText = challengeText.replace('{dayOfWeek}', args.weakDay);
      predictionBasis = `You tend to miss more habits on ${args.weakDay}s`;
    }

    // Calculate XP reward (base + slight randomness)
    const xpReward = template.xpBase + Math.floor(Math.random() * 20);

    // Create the challenge
    const challengeId = await ctx.db.insert('oracleChallenges', {
      userId: args.userId,
      challengeText,
      predictionBasis: predictionBasis || undefined,
      xpReward,
      expiresAt: getTodayEndISO(),
      accepted: false,
      completed: false,
      createdAt: now,
    });

    const challenge = await ctx.db.get(challengeId);
    return { existing: false, challenge };
  },
});

// Get current challenge for user
export const getChallenge = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const challenge = await ctx.db
      .query('oracleChallenges')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .first();

    if (!challenge) return null;

    // Check if expired
    const now = new Date().toISOString();
    if (challenge.expiresAt < now && !challenge.completed) {
      return { ...challenge, expired: true };
    }

    return { ...challenge, expired: false };
  },
});

// Accept a challenge
export const acceptChallenge = mutation({
  args: {
    userId: v.id('users'),
    challengeId: v.id('oracleChallenges'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const challenge = await ctx.db.get(args.challengeId);

    if (!challenge || challenge.userId !== args.userId) {
      throw new Error('Challenge not found');
    }

    // Idempotent: if already accepted, just return success
    if (challenge.accepted) {
      return { success: true, xpReward: challenge.xpReward };
    }

    await ctx.db.patch(args.challengeId, { accepted: true });

    return { success: true, xpReward: challenge.xpReward };
  },
});

// Complete a challenge
export const completeChallenge = mutation({
  args: {
    userId: v.id('users'),
    challengeId: v.id('oracleChallenges'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const challenge = await ctx.db.get(args.challengeId);

    if (!challenge || challenge.userId !== args.userId) {
      throw new Error('Challenge not found');
    }

    if (!challenge.accepted) {
      return { success: false, reason: 'not_accepted' };
    }

    if (challenge.completed) {
      return { success: false, reason: 'already_completed' };
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.challengeId, {
      completed: true,
      completedAt: now,
    });

    return {
      success: true,
      xpReward: challenge.xpReward,
    };
  },
});

// Dismiss a challenge (don't accept it)
export const dismissChallenge = mutation({
  args: {
    userId: v.id('users'),
    challengeId: v.id('oracleChallenges'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const challenge = await ctx.db.get(args.challengeId);

    if (!challenge || challenge.userId !== args.userId) {
      throw new Error('Challenge not found');
    }

    // Delete the challenge
    await ctx.db.delete(args.challengeId);

    return { success: true };
  },
});

// Get challenge history for user
export const getChallengeHistory = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const challenges = await ctx.db
      .query('oracleChallenges')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(args.limit ?? 10);

    return challenges;
  },
});

// Get challenge stats
export const getChallengeStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const challenges = await ctx.db
      .query('oracleChallenges')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const accepted = challenges.filter((c) => c.accepted).length;
    const completed = challenges.filter((c) => c.completed).length;
    const totalXpEarned = challenges
      .filter((c) => c.completed)
      .reduce((sum, c) => sum + c.xpReward, 0);

    return {
      totalChallenges: challenges.length,
      accepted,
      completed,
      completionRate: accepted > 0 ? Math.round((completed / accepted) * 100) : 0,
      totalXpEarned,
    };
  },
});
