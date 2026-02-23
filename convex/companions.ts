import { v } from 'convex/values';
import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

// Helper to verify authenticated user matches requested user
async function verifyAuth(ctx: MutationCtx | QueryCtx, requestedUserId: string) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) {
    throw new Error('Unauthorized: Not authenticated');
  }
  if (authUserId !== requestedUserId) {
    throw new Error("Unauthorized: Cannot access other user's data");
  }
  return authUserId;
}

// Species based on dominant habit category
export type CompanionSpecies = 'treant' | 'phoenix' | 'owl' | 'keeper';
export type CompanionMood = 'happy' | 'content' | 'sleepy' | 'worried';
export type GiftType = 'streak_freeze' | 'xp_boost' | 'hp_potion';

// Evolution stage names for each species
export const EVOLUTION_STAGES: Record<CompanionSpecies, string[]> = {
  treant: ['Seed', 'Forest Spirit', 'Grove Guardian', 'World Tree'],
  phoenix: ['Ember', 'Flame Fox', 'Phoenix', 'Eternal Flame'],
  owl: ['Wisp', 'Owl Sage', 'Cosmic Owl', 'Astral Guardian'],
  keeper: ['Seedling', 'Bloom Sprite', 'Garden Keeper', "Nature's Heart"],
};

// Default companion names
const DEFAULT_NAMES: Record<CompanionSpecies, string> = {
  treant: 'Oakley',
  phoenix: 'Ember',
  owl: 'Athena',
  keeper: 'Bloom',
};

// Get or create companion for user
export const getOrCreateCompanion = mutation({
  args: {
    userId: v.id('users'),
    dominantCategory: v.optional(
      v.union(v.literal('health'), v.literal('career'), v.literal('mind'), v.literal('life'))
    ),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    // Check if companion already exists
    const existing = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (existing) return existing;

    // Determine species based on dominant category
    const categoryToSpecies: Record<string, CompanionSpecies> = {
      health: 'treant',
      career: 'phoenix',
      mind: 'owl',
      life: 'keeper',
    };

    const species = args.dominantCategory ? categoryToSpecies[args.dominantCategory] : 'phoenix'; // Default to phoenix if no habits yet

    // Create new companion
    const companionId = await ctx.db.insert('companions', {
      userId: args.userId,
      name: DEFAULT_NAMES[species],
      species,
      evolutionStage: 1,
      mood: 'content',
      totalXp: 0,
      createdAt: new Date().toISOString(),
    });

    return await ctx.db.get(companionId);
  },
});

// Get companion
export const getCompanion = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();
  },
});

// Update companion mood based on recent completion rate
export const updateMood = mutation({
  args: {
    userId: v.id('users'),
    completionRate: v.number(), // 0-100
    isInUnderworld: v.optional(v.boolean()),
    hpCritical: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const companion = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!companion) return null;

    let mood: CompanionMood;

    // Priority: worried state if HP critical or in underworld
    if (args.isInUnderworld || args.hpCritical) {
      mood = 'worried';
    } else if (args.completionRate >= 80) {
      mood = 'happy';
    } else if (args.completionRate >= 50) {
      mood = 'content';
    } else {
      mood = 'sleepy';
    }

    await ctx.db.patch(companion._id, { mood });

    return { ...companion, mood };
  },
});

// Evolve companion based on streak milestones
// 5 stages: Baby (1) → Toddler (2) → Child (3) → Teen (4) → Adult (5)
export const evolve = mutation({
  args: {
    userId: v.id('users'),
    longestStreak: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const companion = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!companion) return null;

    // Determine evolution stage based on streak
    // Stage 1 (Baby): 0 days
    // Stage 2 (Toddler): 7+ days
    // Stage 3 (Child): 14+ days
    // Stage 4 (Teen): 30+ days
    // Stage 5 (Adult): 60+ days
    let newStage = 1;
    if (args.longestStreak >= 60) {
      newStage = 5; // Adult
    } else if (args.longestStreak >= 30) {
      newStage = 4; // Teen
    } else if (args.longestStreak >= 14) {
      newStage = 3; // Child
    } else if (args.longestStreak >= 7) {
      newStage = 2; // Toddler
    }

    // Only evolve forward, never backward
    if (newStage > companion.evolutionStage) {
      await ctx.db.patch(companion._id, { evolutionStage: newStage });
      return { evolved: true, newStage, species: companion.species };
    }

    return { evolved: false, currentStage: companion.evolutionStage };
  },
});

// Give a random gift (5% daily chance, called on habit completion)
export const giveGift = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const companion = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!companion) return null;

    const today = new Date().toISOString().split('T')[0];

    // Only one gift attempt per day
    if (companion.lastGiftDate === today) {
      return { giftGiven: false, reason: 'already_attempted_today' };
    }

    // Update last gift date regardless of outcome
    await ctx.db.patch(companion._id, { lastGiftDate: today });

    // 5% chance of getting a gift
    if (Math.random() > 0.05) {
      return { giftGiven: false, reason: 'no_luck' };
    }

    // Random gift type
    const giftTypes: GiftType[] = ['streak_freeze', 'xp_boost', 'hp_potion'];
    const randomGift = giftTypes[Math.floor(Math.random() * giftTypes.length)];

    const newGift = {
      id: `gift_${Date.now()}`,
      type: randomGift,
      giftedAt: new Date().toISOString(),
      claimed: false,
    };

    const existingGifts = companion.gifts ?? [];

    await ctx.db.patch(companion._id, {
      gifts: [...existingGifts, newGift],
    });

    return { giftGiven: true, gift: newGift };
  },
});

// Claim a gift
export const claimGift = mutation({
  args: {
    userId: v.id('users'),
    giftId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const companion = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!companion || !companion.gifts) {
      return { claimed: false, reason: 'no_companion_or_gifts' };
    }

    const giftIndex = companion.gifts.findIndex((g) => g.id === args.giftId);
    if (giftIndex === -1) {
      return { claimed: false, reason: 'gift_not_found' };
    }

    const gift = companion.gifts[giftIndex];
    if (gift.claimed) {
      return { claimed: false, reason: 'already_claimed' };
    }

    // Mark gift as claimed
    const updatedGifts = [...companion.gifts];
    updatedGifts[giftIndex] = { ...gift, claimed: true };

    await ctx.db.patch(companion._id, { gifts: updatedGifts });

    return { claimed: true, giftType: gift.type };
  },
});

// Update companion name
export const updateName = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    if (!args.name.trim() || args.name.length > 20) {
      throw new Error('Name must be 1-20 characters');
    }

    const companion = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!companion) {
      throw new Error('Companion not found');
    }

    await ctx.db.patch(companion._id, { name: args.name.trim() });

    return { success: true };
  },
});

// Update companion species
export const updateSpecies = mutation({
  args: {
    userId: v.id('users'),
    species: v.union(
      v.literal('treant'),
      v.literal('phoenix'),
      v.literal('owl'),
      v.literal('keeper')
    ),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const companion = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!companion) throw new Error('Companion not found');

    await ctx.db.patch(companion._id, {
      species: args.species,
      name: DEFAULT_NAMES[args.species],
    });

    return { success: true, newSpecies: args.species };
  },
});

// Add XP to companion (mirrors user XP gains)
export const addXp = mutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const companion = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!companion) return null;

    await ctx.db.patch(companion._id, {
      totalXp: companion.totalXp + args.amount,
    });

    return { newTotalXp: companion.totalXp + args.amount };
  },
});

// Get unclaimed gifts count
export const getUnclaimedGiftsCount = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const companion = await ctx.db
      .query('companions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!companion || !companion.gifts) return 0;

    return companion.gifts.filter((g) => !g.claimed).length;
  },
});
