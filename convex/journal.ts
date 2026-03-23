import { v } from 'convex/values';
import { mutation, query, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { verifyAuth } from './lib/auth';

const JOURNAL_XP = {
  BASE: 20,
  ACHIEVEMENTS_BONUS: 5,
  IMPROVEMENT_BONUS: 10,
  THOUGHTS_BONUS: 10,
  WEEKLY_BONUS: 25,
  MAX_DAILY: 65,
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function calculateWordCount(data: {
  gratitudes: string[];
  achievements?: string[];
  improvement?: string;
  content?: string;
}): number {
  const gratitudeWords = data.gratitudes.reduce((sum, g) => sum + countWords(g), 0);
  const achievementWords = data.achievements ? data.achievements.reduce((sum, a) => sum + countWords(a), 0) : 0;
  const improvementWords = data.improvement ? countWords(data.improvement) : 0;
  const contentWords = data.content ? countWords(data.content) : 0;
  return gratitudeWords + achievementWords + improvementWords + contentWords;
}

function calculateJournalXp(data: {
  gratitudes: string[];
  achievements?: string[];
  improvement?: string;
  content?: string;
}): number {
  let xp = 0;

  const allGratitudesFilled = data.gratitudes.every((g) => g.trim().length > 0);
  const hasContent = data.content && data.content.trim().length > 0;
  const hasSubstantialContent = data.content && data.content.trim().length >= 50;
  const hasAchievements = data.achievements && data.achievements.length > 0 && data.achievements.some((a) => a.trim().length > 0);

  // Base XP: Either all 3 gratitudes OR substantial content
  if (allGratitudesFilled) {
    xp += JOURNAL_XP.BASE;
  } else if (hasSubstantialContent) {
    xp += JOURNAL_XP.BASE;
  }

  // Bonus for achievements
  if (hasAchievements) {
    xp += JOURNAL_XP.ACHIEVEMENTS_BONUS;
  }

  // Bonus for improvement
  if (data.improvement && data.improvement.trim().length > 0) {
    xp += JOURNAL_XP.IMPROVEMENT_BONUS;
  }

  // Bonus for additional thoughts (only if gratitudes were main entry)
  if (allGratitudesFilled && hasContent) {
    xp += JOURNAL_XP.THOUGHTS_BONUS;
  }

  return xp;
}

// Get all journal entries for a user (legacy - use getEntriesPaginated for new code)
export const getEntries = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    return await ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();
  },
});

// Get paginated journal entries for a user
export const getEntriesPaginated = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // _creationTime of last item
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const limit = args.limit ?? 10;

    let query = ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc');

    // If cursor provided, filter to entries older than cursor
    if (args.cursor) {
      query = query.filter((q) => q.lt(q.field('_creationTime'), args.cursor!));
    }

    // Take limit + 1 to check if there are more
    const entries = await query.take(limit + 1);

    const hasMore = entries.length > limit;
    const results = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? results[results.length - 1]._creationTime : null;

    return {
      entries: results,
      hasMore,
      nextCursor,
    };
  },
});

// Add a new journal entry
export const addEntry = mutation({
  args: {
    userId: v.id('users'),
    gratitudes: v.array(v.string()),
    achievements: v.optional(v.array(v.string())),
    improvement: v.optional(v.string()),
    content: v.optional(v.string()),
    mood: v.optional(
      v.union(v.literal('great'), v.literal('good'), v.literal('okay'), v.literal('rough'))
    ),
    entryType: v.optional(v.union(v.literal('daily'), v.literal('weekly'))),
    weekHighlights: v.optional(v.string()),
    weekChallenges: v.optional(v.string()),
    nextWeekGoals: v.optional(v.string()),
    // Optional date for past entries (YYYY-MM-DD format)
    entryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const today = new Date().toISOString().split('T')[0];
    const entryDate = args.entryDate || today;
    const isPastEntry = entryDate < today;

    // Calculate how much XP can be earned
    // Past entries: 50% XP (still valuable to reflect, but less than doing it same day)
    // Today's entries: full XP up to daily cap
    let xpAwarded = 0;

    if (isPastEntry) {
      // Past entries get 50% XP, no daily cap check
      const potentialXp = calculateJournalXp({
        gratitudes: args.gratitudes,
        achievements: args.achievements,
        improvement: args.improvement,
        content: args.content,
      });
      xpAwarded = Math.floor(potentialXp * 0.5);
    } else {
      // Today's entries: respect daily cap
      const todayEntries = await ctx.db
        .query('journalEntries')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .filter((q) => q.gte(q.field('_creationTime'), new Date(today).getTime()))
        .collect();

      const earnedToday = todayEntries.reduce((sum, e) => sum + e.xpAwarded, 0);
      const xpRemaining = Math.max(0, JOURNAL_XP.MAX_DAILY - earnedToday);

      const potentialXp = calculateJournalXp({
        gratitudes: args.gratitudes,
        achievements: args.achievements,
        improvement: args.improvement,
        content: args.content,
      });

      xpAwarded = Math.min(potentialXp, xpRemaining);
    }

    const wordCount = calculateWordCount({
      gratitudes: args.gratitudes,
      achievements: args.achievements,
      improvement: args.improvement,
      content: args.content,
    });

    // Filter out empty achievement strings
    const cleanAchievements = args.achievements?.filter((a) => a.trim().length > 0);

    const entryId = await ctx.db.insert('journalEntries', {
      userId: args.userId,
      gratitudes: args.gratitudes,
      achievements: cleanAchievements && cleanAchievements.length > 0 ? cleanAchievements : undefined,
      improvement: args.improvement,
      content: args.content,
      mood: args.mood,
      entryType: args.entryType,
      weekHighlights: args.weekHighlights,
      weekChallenges: args.weekChallenges,
      nextWeekGoals: args.nextWeekGoals,
      wordCount,
      xpAwarded,
      entryDate: isPastEntry ? entryDate : undefined, // Only store if different from creation
    });

    const entry = await ctx.db.get(entryId);

    // Trigger memory extraction check
    await triggerMemoryExtractionCheck(ctx, args.userId, args.entryType === 'weekly');

    return { entry, xpAwarded, isPastEntry };
  },
});

// Helper to check if memory extraction should run
async function triggerMemoryExtractionCheck(
  ctx: MutationCtx,
  userId: Id<'users'>,
  isWeeklyEntry: boolean
) {
  // Check if user has opted out of AI processing
  const user = await ctx.db.get(userId);
  if (user?.aiProcessingEnabled === false) return;

  const progress = await ctx.db
    .query('userProgress')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();

  if (!progress) {
    return;
  }

  const currentCount = (progress.memoryExtractionEntryCount ?? 0) + 1;
  const EXTRACTION_THRESHOLD = 5;

  // Trigger extraction every 5 entries OR on weekly entries (more reflection content)
  if (currentCount >= EXTRACTION_THRESHOLD || isWeeklyEntry) {
    // Get recent entries for extraction
    const recentEntries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(EXTRACTION_THRESHOLD);

    // Schedule the extraction action asynchronously
    await ctx.scheduler.runAfter(
      0,
      internal.memoryExtraction.extractMemoriesFromJournal,
      {
        userId,
        entries: recentEntries,
      }
    );

    // Reset the counter
    await ctx.db.patch(progress._id, {
      memoryExtractionEntryCount: 0,
      lastMemoryExtractionDate: new Date().toISOString().split('T')[0],
    });
  } else {
    // Just increment the counter
    await ctx.db.patch(progress._id, {
      memoryExtractionEntryCount: currentCount,
    });
  }
}

// Update a journal entry
export const updateEntry = mutation({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
    gratitudes: v.optional(v.array(v.string())),
    achievements: v.optional(v.array(v.string())),
    improvement: v.optional(v.string()),
    content: v.optional(v.string()),
    mood: v.optional(
      v.union(v.literal('great'), v.literal('good'), v.literal('okay'), v.literal('rough'))
    ),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== args.userId) {
      throw new Error('Entry not found or unauthorized');
    }

    const updates: Record<string, unknown> = {};
    if (args.gratitudes !== undefined) updates.gratitudes = args.gratitudes;
    if (args.achievements !== undefined) {
      const cleanAchievements = args.achievements.filter((a) => a.trim().length > 0);
      updates.achievements = cleanAchievements.length > 0 ? cleanAchievements : undefined;
    }
    if (args.improvement !== undefined) updates.improvement = args.improvement;
    if (args.content !== undefined) updates.content = args.content;
    if (args.mood !== undefined) updates.mood = args.mood;

    // Recalculate word count
    const newGratitudes = args.gratitudes ?? entry.gratitudes;
    const newAchievements = args.achievements ?? (entry as any).achievements;
    const newImprovement = args.improvement ?? entry.improvement;
    const newContent = args.content ?? entry.content;

    updates.wordCount = calculateWordCount({
      gratitudes: newGratitudes,
      achievements: newAchievements,
      improvement: newImprovement,
      content: newContent,
    });

    await ctx.db.patch(args.entryId, updates);
  },
});

// Delete a journal entry
export const deleteEntry = mutation({
  args: {
    entryId: v.id('journalEntries'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== args.userId) {
      throw new Error('Entry not found or unauthorized');
    }

    await ctx.db.delete(args.entryId);
  },
});

// Get journal stats
export const getStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const entries = await ctx.db
      .query('journalEntries')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today).getTime();

    const todayEntries = entries.filter((e) => e._creationTime >= todayStart);

    // Calculate streak
    let streak = 0;
    const checkDate = new Date();
    const entryDates = new Set(
      entries.map((e) => new Date(e._creationTime).toISOString().split('T')[0])
    );

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasEntry = entryDates.has(dateStr);
      if (!hasEntry && dateStr !== today) break;
      if (hasEntry) streak++;
      checkDate.setDate(checkDate.getDate() - 1);
      if (streak > 365) break;
    }

    const todayXpEarned = todayEntries.reduce((sum, e) => sum + e.xpAwarded, 0);

    return {
      totalEntries: entries.length,
      todayEntries: todayEntries.length,
      todayXpEarned,
      todayXpRemaining: Math.max(0, JOURNAL_XP.MAX_DAILY - todayXpEarned),
      writingStreak: streak,
      totalWords: entries.reduce((sum, e) => sum + e.wordCount, 0),
    };
  },
});
