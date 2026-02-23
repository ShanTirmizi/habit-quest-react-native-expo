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

// Get all quests for a user
export const getQuests = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sideQuests')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// Add a new quest
export const addQuest = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    xpReward: v.number(),
    priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    questType: v.optional(v.union(v.literal('daily'), v.literal('weekly'), v.literal('ongoing'))),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const questId = await ctx.db.insert('sideQuests', {
      userId: args.userId,
      title: args.title,
      description: args.description,
      xpReward: args.xpReward,
      priority: args.priority,
      questType: args.questType ?? 'ongoing',
      completed: false,
    });

    return questId;
  },
});

// Complete a quest
export const completeQuest = mutation({
  args: {
    questId: v.id('sideQuests'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const quest = await ctx.db.get(args.questId);
    if (!quest || quest.userId !== args.userId) {
      throw new Error('Quest not found or unauthorized');
    }

    if (quest.completed) {
      return quest; // Already completed
    }

    await ctx.db.patch(args.questId, {
      completed: true,
      completedAt: new Date().toISOString(),
    });

    // Return the updated quest with XP for the caller to handle
    return { ...quest, completed: true, completedAt: new Date().toISOString() };
  },
});

// Uncomplete a quest
export const uncompleteQuest = mutation({
  args: {
    questId: v.id('sideQuests'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const quest = await ctx.db.get(args.questId);
    if (!quest || quest.userId !== args.userId) {
      throw new Error('Quest not found or unauthorized');
    }

    await ctx.db.patch(args.questId, {
      completed: false,
      completedAt: undefined,
    });

    return { ...quest, completed: false, completedAt: undefined };
  },
});

// Delete a quest
export const deleteQuest = mutation({
  args: {
    questId: v.id('sideQuests'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const quest = await ctx.db.get(args.questId);
    if (!quest || quest.userId !== args.userId) {
      throw new Error('Quest not found or unauthorized');
    }

    await ctx.db.delete(args.questId);
  },
});

// Update a quest
export const updateQuest = mutation({
  args: {
    questId: v.id('sideQuests'),
    userId: v.id('users'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal('low'), v.literal('medium'), v.literal('high'))),
    questType: v.optional(v.union(v.literal('daily'), v.literal('weekly'), v.literal('ongoing'))),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const quest = await ctx.db.get(args.questId);
    if (!quest || quest.userId !== args.userId) {
      throw new Error('Quest not found or unauthorized');
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.questType !== undefined) updates.questType = args.questType;

    await ctx.db.patch(args.questId, updates);
  },
});
