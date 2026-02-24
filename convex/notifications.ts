import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { Id } from './_generated/dataModel';

export const registerPushToken = mutation({
  args: {
    expoPushToken: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        expoPushToken: args.expoPushToken,
        timezone: args.timezone,
      });
    } else {
      await ctx.db.insert('pushSubscriptions', {
        userId,
        expoPushToken: args.expoPushToken,
        timezone: args.timezone,
        enabled: true,
        morningReminder: true,
        afternoonReminder: true,
        eveningReminder: true,
        createdAt: new Date().toISOString(),
      });
    }
  },
});

export const updatePreferences = mutation({
  args: {
    morningReminder: v.optional(v.boolean()),
    afternoonReminder: v.optional(v.boolean()),
    eveningReminder: v.optional(v.boolean()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const subscription = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (!subscription) {
      throw new Error('No push subscription found');
    }

    const updates: Record<string, boolean> = {};
    if (args.morningReminder !== undefined) {
      updates.morningReminder = args.morningReminder;
    }
    if (args.afternoonReminder !== undefined) {
      updates.afternoonReminder = args.afternoonReminder;
    }
    if (args.eveningReminder !== undefined) {
      updates.eveningReminder = args.eveningReminder;
    }
    if (args.enabled !== undefined) {
      updates.enabled = args.enabled;
    }

    await ctx.db.patch(subscription._id, updates);
  },
});

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const subscription = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    return subscription ?? null;
  },
});
