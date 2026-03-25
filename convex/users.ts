import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { Id } from './_generated/dataModel';
import { verifyAuth } from './lib/auth';

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

// Accept GDPR consent
export const acceptConsent = mutation({
  args: {
    healthDataConsent: v.boolean(),
    aiProcessingEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await ctx.db.patch(userId as Id<'users'>, {
      privacyPolicyAccepted: true,
      privacyPolicyAcceptedAt: new Date().toISOString(),
      healthDataConsent: args.healthDataConsent,
      aiProcessingEnabled: args.aiProcessingEnabled,
      consentVersion: '1.0',
    });
  },
});

// Toggle AI processing preference
export const updateAiProcessing = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await ctx.db.patch(userId as Id<'users'>, {
      aiProcessingEnabled: args.enabled,
    });
  },
});

// Export all user data (GDPR Article 20 - right to data portability)
export const exportUserData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const uid = userId as Id<'users'>;
    const user = await ctx.db.get(uid);
    if (!user) return null;

    const queryAll = async (table: 'userProgress' | 'companions' | 'oracleChallenges' | 'timeCapsules' | 'goals' | 'habits' | 'habitCompletions' | 'sideQuests' | 'journalEntries' | 'chatMessages' | 'pushSubscriptions' | 'medicineGroups' | 'medicines' | 'medicineCompletions' | 'aiMemories' | 'microReflections') =>
      ctx.db.query(table).withIndex('by_user', (q) => q.eq('userId', uid)).collect();

    const [
      progress, companions, challenges, capsules, goals, habits,
      completions, quests, journal, chat, subscriptions,
      medGroups, medicines, medCompletions, memories, reflections,
    ] = await Promise.all([
      queryAll('userProgress'),
      queryAll('companions'),
      queryAll('oracleChallenges'),
      queryAll('timeCapsules'),
      queryAll('goals'),
      queryAll('habits'),
      queryAll('habitCompletions'),
      queryAll('sideQuests'),
      queryAll('journalEntries'),
      queryAll('chatMessages'),
      queryAll('pushSubscriptions'),
      queryAll('medicineGroups'),
      queryAll('medicines'),
      queryAll('medicineCompletions'),
      queryAll('aiMemories'),
      queryAll('microReflections'),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: { email: user.email, name: user.name, createdAt: user._creationTime },
      progress,
      companions,
      oracleChallenges: challenges,
      timeCapsules: capsules,
      goals,
      habits,
      habitCompletions: completions,
      sideQuests: quests,
      journalEntries: journal,
      chatMessages: chat,
      pushSubscriptions: subscriptions,
      medicineGroups: medGroups,
      medicines,
      medicineCompletions: medCompletions,
      aiMemories: memories,
      microReflections: reflections,
    };
  },
});

// Delete all AI memories (right to erasure for AI-extracted data)
export const deleteAllAiMemories = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const memories = await ctx.db
      .query('aiMemories')
      .withIndex('by_user', (q) => q.eq('userId', userId as Id<'users'>))
      .collect();
    for (const m of memories) {
      await ctx.db.delete(m._id);
    }
    return { deleted: memories.length };
  },
});

// ── Locale ───────────────────────────────────────────────────────────────

export const updateLocale = mutation({
  args: { locale: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await ctx.db.patch(userId as Id<'users'>, { locale: args.locale });
  },
});

export const getUserLocale = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);
    const user = await ctx.db.get(args.userId);
    return user?.locale ?? 'en';
  },
});

// ── Neurodivergence Profile ──────────────────────────────────────────────

const ndConditionValidator = v.union(
  v.literal('adhd'), v.literal('autism'), v.literal('anxiety'),
  v.literal('depression'), v.literal('dyslexia'),
);

export const updateNeurodivergenceProfile = mutation({
  args: {
    conditions: v.array(ndConditionValidator),
    adhdSubtype: v.optional(v.union(
      v.literal('inattentive'), v.literal('hyperactive-impulsive'), v.literal('combined'),
    )),
    supportNeeds: v.optional(v.array(v.string())),
    medicationStatus: v.optional(v.union(
      v.literal('medicated'), v.literal('unmedicated'), v.literal('prefer-not-to-say'),
    )),
    diagnosisType: v.optional(v.union(
      v.literal('professional'), v.literal('self-identified'), v.literal('exploring'),
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await ctx.db.patch(userId as Id<'users'>, {
      neurodivergenceProfile: {
        conditions: args.conditions,
        adhdSubtype: args.adhdSubtype,
        supportNeeds: args.supportNeeds,
        medicationStatus: args.medicationStatus,
        diagnosisType: args.diagnosisType,
      },
    });
  },
});

export const clearNeurodivergenceProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await ctx.db.patch(userId as Id<'users'>, {
      neurodivergenceProfile: undefined,
    });
  },
});

export const getNdProfile = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);
    const user = await ctx.db.get(args.userId);
    return user?.neurodivergenceProfile ?? null;
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
