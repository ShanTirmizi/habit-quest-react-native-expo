import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { Id } from './_generated/dataModel';

// Get current authenticated user
// Convex Auth stores the user directly in the users table
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // The userId from getAuthUserId IS the users table _id
    const user = await ctx.db.get(userId as Id<'users'>);
    return user;
  },
});

// Ensure user progress exists (call after sign in)
export const ensureUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if progress record exists
    const existingProgress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', userId as Id<'users'>))
      .first();

    if (existingProgress) {
      return await ctx.db.get(userId as Id<'users'>);
    }

    // Create initial progress record for the user
    await ctx.db.insert('userProgress', {
      userId: userId as Id<'users'>,
      totalXp: 0,
      level: 0,
      achievements: [],
      streakFreezes: 0,
      currentHp: 100,
      maxHp: 100,
      faintCount: 0,
    });

    return await ctx.db.get(userId as Id<'users'>);
  },
});

// Get user with progress
export const getCurrentUserWithProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId as Id<'users'>);
    if (!user) return null;

    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', userId as Id<'users'>))
      .first();

    return { user, progress };
  },
});

// Mark onboarding as completed for current user
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await ctx.db.patch(userId as Id<'users'>, { hasCompletedOnboarding: true });
  },
});

// Legacy: Get or create user by external ID (for migration from localStorage)
export const getOrCreateUser = mutation({
  args: {
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists by external ID
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_external_id', (q) => q.eq('externalId', args.externalId))
      .first();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert('users', {
      externalId: args.externalId,
      email: args.email,
      name: args.name,
      isAnonymous: true,
    });

    // Create initial progress record
    await ctx.db.insert('userProgress', {
      userId,
      totalXp: 0,
      level: 0,
      achievements: [],
      streakFreezes: 0,
      currentHp: 100,
      maxHp: 100,
      faintCount: 0,
    });

    return await ctx.db.get(userId);
  },
});

// Legacy: Get user by external ID
export const getUserByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_external_id', (q) => q.eq('externalId', args.externalId))
      .first();
  },
});
