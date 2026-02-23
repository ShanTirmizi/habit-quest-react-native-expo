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

export type MilestoneType = '30_days' | '90_days' | '365_days' | 'custom';

// Milestone configuration
const MILESTONE_CONFIG: Record<MilestoneType, { daysToOpen: number; label: string }> = {
  '30_days': { daysToOpen: 30, label: '30 Days' },
  '90_days': { daysToOpen: 90, label: '90 Days' },
  '365_days': { daysToOpen: 365, label: '1 Year' },
  custom: { daysToOpen: 0, label: 'Custom' },
};

// Helper to calculate open date
function calculateOpenDate(milestoneType: MilestoneType, customDays?: number): string {
  const now = new Date();
  const daysToAdd =
    milestoneType === 'custom' ? (customDays ?? 30) : MILESTONE_CONFIG[milestoneType].daysToOpen;

  now.setDate(now.getDate() + daysToAdd);
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Create a new time capsule
export const create = mutation({
  args: {
    userId: v.id('users'),
    message: v.string(),
    milestoneType: v.union(
      v.literal('30_days'),
      v.literal('90_days'),
      v.literal('365_days'),
      v.literal('custom')
    ),
    customDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    if (!args.message.trim()) {
      throw new Error('Message cannot be empty');
    }

    if (args.message.length > 2000) {
      throw new Error('Message must be 2000 characters or less');
    }

    const openDate = calculateOpenDate(args.milestoneType, args.customDays);

    const capsuleId = await ctx.db.insert('timeCapsules', {
      userId: args.userId,
      message: args.message.trim(),
      milestoneType: args.milestoneType,
      createdAt: new Date().toISOString(),
      openDate,
      opened: false,
    });

    return await ctx.db.get(capsuleId);
  },
});

// Get all capsules for user
export const getCapsules = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const capsules = await ctx.db
      .query('timeCapsules')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const today = new Date().toISOString().split('T')[0];

    // Add computed fields
    return capsules.map((capsule) => ({
      ...capsule,
      canOpen: !capsule.opened && capsule.openDate <= today,
      daysUntilOpen: Math.max(
        0,
        Math.ceil(
          (new Date(capsule.openDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
        )
      ),
    }));
  },
});

// Get capsules ready to open
export const getReadyToOpen = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const capsules = await ctx.db
      .query('timeCapsules')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const today = new Date().toISOString().split('T')[0];

    return capsules.filter((c) => !c.opened && c.openDate <= today);
  },
});

// Open a time capsule
export const open = mutation({
  args: {
    userId: v.id('users'),
    capsuleId: v.id('timeCapsules'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const capsule = await ctx.db.get(args.capsuleId);

    if (!capsule || capsule.userId !== args.userId) {
      throw new Error('Capsule not found');
    }

    if (capsule.opened) {
      return { success: false, reason: 'already_opened' };
    }

    const today = new Date().toISOString().split('T')[0];
    if (capsule.openDate > today) {
      return { success: false, reason: 'not_yet_ready' };
    }

    await ctx.db.patch(args.capsuleId, {
      opened: true,
      openedAt: new Date().toISOString(),
    });

    return { success: true, message: capsule.message };
  },
});

// Get "On This Day" data - historical comparison
export const getOnThisDay = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const today = new Date();
    const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Get all habit completions
    const completions = await ctx.db
      .query('habitCompletions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Get all journal entries
    const journalEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Filter for this day in previous years
    const thisYearStr = today.getFullYear().toString();

    const historicalCompletions = completions.filter((c) => {
      const date = c.completedDate;
      return date.endsWith(monthDay) && !date.startsWith(thisYearStr);
    });

    const historicalJournals = journalEntries.filter((j) => {
      const date = j._creationTime ? new Date(j._creationTime).toISOString().split('T')[0] : '';
      return date.endsWith(monthDay) && !date.startsWith(thisYearStr);
    });

    // Group by year
    const yearlyData: Record<
      string,
      { completions: number; journalEntry?: { mood?: string; gratitudes: string[] } }
    > = {};

    historicalCompletions.forEach((c) => {
      const year = c.completedDate.split('-')[0];
      if (!yearlyData[year]) {
        yearlyData[year] = { completions: 0 };
      }
      yearlyData[year].completions++;
    });

    historicalJournals.forEach((j) => {
      const date = j._creationTime ? new Date(j._creationTime).toISOString().split('T')[0] : '';
      const year = date.split('-')[0];
      if (!yearlyData[year]) {
        yearlyData[year] = { completions: 0 };
      }
      yearlyData[year].journalEntry = {
        mood: j.mood,
        gratitudes: j.gratitudes,
      };
    });

    return {
      date: monthDay,
      years: Object.entries(yearlyData)
        .map(([year, data]) => ({
          year: parseInt(year),
          ...data,
        }))
        .sort((a, b) => b.year - a.year),
    };
  },
});

// Get capsule count by status
export const getCapsuleStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const capsules = await ctx.db
      .query('timeCapsules')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const today = new Date().toISOString().split('T')[0];

    const sealed = capsules.filter((c) => !c.opened && c.openDate > today).length;
    const ready = capsules.filter((c) => !c.opened && c.openDate <= today).length;
    const opened = capsules.filter((c) => c.opened).length;

    return { sealed, ready, opened, total: capsules.length };
  },
});

// Delete a capsule (only if not yet opened)
export const deleteCapsule = mutation({
  args: {
    userId: v.id('users'),
    capsuleId: v.id('timeCapsules'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const capsule = await ctx.db.get(args.capsuleId);

    if (!capsule || capsule.userId !== args.userId) {
      throw new Error('Capsule not found');
    }

    if (capsule.opened) {
      throw new Error('Cannot delete an opened capsule');
    }

    await ctx.db.delete(args.capsuleId);

    return { success: true };
  },
});
