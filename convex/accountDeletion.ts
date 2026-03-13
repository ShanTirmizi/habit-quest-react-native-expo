import { v } from 'convex/values';
import { mutation, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';

// Helper to delete all documents from a table by the by_user index
async function deleteAllByUser(
  ctx: MutationCtx,
  tableName:
    | 'userProgress'
    | 'companions'
    | 'oracleChallenges'
    | 'timeCapsules'
    | 'goals'
    | 'habits'
    | 'habitCompletions'
    | 'sideQuests'
    | 'journalEntries'
    | 'chatMessages'
    | 'pushSubscriptions'
    | 'medicineGroups'
    | 'medicines'
    | 'medicineCompletions'
    | 'aiMemories'
    | 'microReflections',
  userId: Id<'users'>,
) {
  const docs = await ctx.db
    .query(tableName)
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
  return docs.length;
}

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized: Not authenticated');

    const typedUserId = userId as Id<'users'>;

    // 1. Delete all app data tables
    const tables = [
      'userProgress',
      'companions',
      'oracleChallenges',
      'timeCapsules',
      'goals',
      'habits',
      'habitCompletions',
      'sideQuests',
      'journalEntries',
      'chatMessages',
      'pushSubscriptions',
      'medicineGroups',
      'medicines',
      'medicineCompletions',
      'aiMemories',
      'microReflections',
    ] as const;

    let totalDeleted = 0;
    for (const table of tables) {
      totalDeleted += await deleteAllByUser(ctx, table, typedUserId);
    }

    // 2. Delete auth-related records
    // Query authAccounts by userId field
    const authAccounts = await ctx.db
      .query('authAccounts')
      .filter((q) => q.eq(q.field('userId'), typedUserId))
      .collect();

    // Query authSessions by userId field
    const authSessions = await ctx.db
      .query('authSessions')
      .filter((q) => q.eq(q.field('userId'), typedUserId))
      .collect();

    // Query authRefreshTokens by sessionId for each session
    for (const session of authSessions) {
      const refreshTokens = await ctx.db
        .query('authRefreshTokens')
        .filter((q) => q.eq(q.field('sessionId'), session._id))
        .collect();
      for (const token of refreshTokens) {
        await ctx.db.delete(token._id);
      }
    }

    // Delete authAccounts
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    // Delete authSessions
    for (const session of authSessions) {
      await ctx.db.delete(session._id);
    }

    // 3. Finally delete the user record itself
    await ctx.db.delete(typedUserId);

    return { success: true, totalDeleted };
  },
});
