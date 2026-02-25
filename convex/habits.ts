import { v } from 'convex/values';
import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { Id, Doc } from './_generated/dataModel';
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

// Get all habits for a user with their completions
export const getHabits = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Note: Queries can optionally verify auth for sensitive data
    // For now, we trust the userId passed from authenticated context
    const habits = await ctx.db
      .query('habits')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Limit completions to last 365 days for performance
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDate = oneYearAgo.toISOString().split('T')[0];

    // Get completions for this user from the last year
    const completions = await ctx.db
      .query('habitCompletions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.gte(q.field('completedDate'), cutoffDate))
      .collect();

    // Group completions by habit
    const completionsByHabit: Record<string, string[]> = {};
    for (const completion of completions) {
      const habitId = completion.habitId.toString();
      if (!completionsByHabit[habitId]) {
        completionsByHabit[habitId] = [];
      }
      completionsByHabit[habitId].push(completion.completedDate);
    }

    // Sort by sortOrder (habits without sortOrder go to the end, ordered by creation time)
    habits.sort((a, b) => {
      const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a._creationTime - b._creationTime;
    });

    // Attach completions to habits
    return habits.map((habit) => ({
      ...habit,
      completedDates: completionsByHabit[habit._id.toString()] ?? [],
    }));
  },
});

// Add a new habit
export const addHabit = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    category: v.union(
      v.literal('health'),
      v.literal('career'),
      v.literal('mind'),
      v.literal('life')
    ),
    xpReward: v.number(),
    frequency: v.optional(
      v.object({
        type: v.union(
          v.literal('daily'),
          v.literal('weekdays'),
          v.literal('weekends'),
          v.literal('custom'),
          v.literal('timesPerWeek')
        ),
        daysOfWeek: v.optional(v.array(v.number())),
        timesPerWeek: v.optional(v.number()),
      })
    ),
    timeOfDay: v.optional(
      v.union(
        v.literal('morning'),
        v.literal('afternoon'),
        v.literal('evening'),
        v.literal('anytime')
      )
    ),
    chainedToHabitId: v.optional(v.id('habits')),
    allowedRestDays: v.optional(v.number()),
    location: v.optional(v.string()),
    trigger: v.optional(v.string()),
    rationale: v.optional(v.string()),
    citation: v.optional(
      v.object({
        author: v.string(),
        year: v.number(),
        finding: v.string(),
      })
    ),
    rewardBundle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const habitId = await ctx.db.insert('habits', {
      userId: args.userId,
      name: args.name,
      category: args.category,
      xpReward: args.xpReward,
      streak: 0,
      frequency: args.frequency,
      timeOfDay: args.timeOfDay,
      chainedToHabitId: args.chainedToHabitId,
      allowedRestDays: args.allowedRestDays,
      location: args.location,
      trigger: args.trigger,
      rationale: args.rationale,
      citation: args.citation,
      rewardBundle: args.rewardBundle,
    });

    return habitId;
  },
});

// Delete a habit
export const deleteHabit = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }

    // Delete all completions for this habit
    const completions = await ctx.db
      .query('habitCompletions')
      .withIndex('by_habit', (q) => q.eq('habitId', args.habitId))
      .collect();

    for (const completion of completions) {
      await ctx.db.delete(completion._id);
    }

    // Delete the habit
    await ctx.db.delete(args.habitId);
  },
});

// Update a habit
export const updateHabit = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
    name: v.optional(v.string()),
    category: v.optional(
      v.union(v.literal('health'), v.literal('career'), v.literal('mind'), v.literal('life'))
    ),
    xpReward: v.optional(v.number()),
    streak: v.optional(v.number()),
    frequency: v.optional(
      v.object({
        type: v.union(
          v.literal('daily'),
          v.literal('weekdays'),
          v.literal('weekends'),
          v.literal('custom'),
          v.literal('timesPerWeek')
        ),
        daysOfWeek: v.optional(v.array(v.number())),
        timesPerWeek: v.optional(v.number()),
      })
    ),
    timeOfDay: v.optional(
      v.union(
        v.literal('morning'),
        v.literal('afternoon'),
        v.literal('evening'),
        v.literal('anytime')
      )
    ),
    location: v.optional(v.string()),
    trigger: v.optional(v.string()),
    allowedRestDays: v.optional(v.number()),
    chainedToHabitId: v.optional(v.id('habits')),
    rationale: v.optional(v.string()),
    citation: v.optional(
      v.object({
        author: v.string(),
        year: v.number(),
        finding: v.string(),
      })
    ),
    rewardBundle: v.optional(v.string()),
    // Allow explicitly clearing optional fields
    clearRewardBundle: v.optional(v.boolean()),
    clearFrequency: v.optional(v.boolean()),
    clearTimeOfDay: v.optional(v.boolean()),
    clearLocation: v.optional(v.boolean()),
    clearTrigger: v.optional(v.boolean()),
    clearAllowedRestDays: v.optional(v.boolean()),
    clearChainedToHabitId: v.optional(v.boolean()),
    clearRationale: v.optional(v.boolean()),
    clearCitation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.category !== undefined) updates.category = args.category;
    if (args.xpReward !== undefined) updates.xpReward = args.xpReward;
    if (args.streak !== undefined) updates.streak = args.streak;
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.timeOfDay !== undefined) updates.timeOfDay = args.timeOfDay;
    if (args.location !== undefined) updates.location = args.location;
    if (args.trigger !== undefined) updates.trigger = args.trigger;
    if (args.allowedRestDays !== undefined) updates.allowedRestDays = args.allowedRestDays;
    if (args.chainedToHabitId !== undefined) updates.chainedToHabitId = args.chainedToHabitId;
    if (args.rationale !== undefined) updates.rationale = args.rationale;
    if (args.citation !== undefined) updates.citation = args.citation;
    if (args.rewardBundle !== undefined) updates.rewardBundle = args.rewardBundle;

    // Handle explicit clearing of optional fields
    if (args.clearRewardBundle) updates.rewardBundle = undefined;
    if (args.clearFrequency) updates.frequency = undefined;
    if (args.clearTimeOfDay) updates.timeOfDay = undefined;
    if (args.clearLocation) updates.location = undefined;
    if (args.clearTrigger) updates.trigger = undefined;
    if (args.clearAllowedRestDays) updates.allowedRestDays = undefined;
    if (args.clearChainedToHabitId) updates.chainedToHabitId = undefined;
    if (args.clearRationale) updates.rationale = undefined;
    if (args.clearCitation) updates.citation = undefined;

    await ctx.db.patch(args.habitId, updates);
  },
});

// Toggle habit completion
export const toggleCompletion = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }

    // Check if already completed
    const existingCompletion = await ctx.db
      .query('habitCompletions')
      .withIndex('by_habit_date', (q) =>
        q.eq('habitId', args.habitId).eq('completedDate', args.date)
      )
      .first();

    if (existingCompletion) {
      // Uncomplete - delete the completion
      await ctx.db.delete(existingCompletion._id);

      // Recalculate streak
      const newStreak = await calculateStreak(ctx, args.habitId, args.date);
      await ctx.db.patch(args.habitId, { streak: newStreak });

      return { completed: false, streak: newStreak };
    } else {
      // Complete - add the completion
      await ctx.db.insert('habitCompletions', {
        userId: args.userId,
        habitId: args.habitId,
        completedDate: args.date,
      });

      // Recalculate streak
      const newStreak = await calculateStreak(ctx, args.habitId, args.date);
      await ctx.db.patch(args.habitId, { streak: newStreak });

      return { completed: true, streak: newStreak };
    }
  },
});

// Add note to habit
export const addNote = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }

    const today = new Date().toISOString().split('T')[0];
    const existingNotes = habit.notes ?? [];

    // Check if there's already a note for today
    const todayNoteIndex = existingNotes.findIndex((n) => n.date === today);
    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: today,
      text: args.text,
      createdAt: new Date().toISOString(),
    };

    let updatedNotes;
    if (todayNoteIndex >= 0) {
      updatedNotes = [...existingNotes];
      updatedNotes[todayNoteIndex] = newNote;
    } else {
      updatedNotes = [...existingNotes, newNote];
    }

    await ctx.db.patch(args.habitId, { notes: updatedNotes });
  },
});

// Delete note from habit
export const deleteNote = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }

    const updatedNotes = (habit.notes ?? []).filter((n) => n.id !== args.noteId);
    await ctx.db.patch(args.habitId, { notes: updatedNotes });
  },
});

// Scale down a habit temporarily (for 7 days)
export const scaleDownHabit = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
    newName: v.string(),
    newXp: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }

    // Don't scale down if already scaled
    if (habit.scaledDown) {
      throw new Error('Habit is already scaled down');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.habitId, {
      name: args.newName,
      xpReward: args.newXp,
      scaledDown: {
        originalName: habit.name,
        originalXp: habit.xpReward,
        scaledAt: now.toISOString().split('T')[0],
        expiresAt: expiresAt.toISOString().split('T')[0],
      },
    });

    return { success: true };
  },
});

// Restore a scaled-down habit to its original settings
export const restoreHabit = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
    keepScaled: v.optional(v.boolean()), // If true, keep the scaled version permanently
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }

    if (!habit.scaledDown) {
      throw new Error('Habit is not scaled down');
    }

    if (args.keepScaled) {
      // Just remove the scaledDown marker, keep current name/xp
      await ctx.db.patch(args.habitId, {
        scaledDown: undefined,
      });
    } else {
      // Restore to original
      await ctx.db.patch(args.habitId, {
        name: habit.scaledDown.originalName,
        xpReward: habit.scaledDown.originalXp,
        scaledDown: undefined,
      });
    }

    return { success: true };
  },
});

// Hibernate a habit (pause without deleting)
export const hibernateHabit = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }
    await ctx.db.patch(args.habitId, {
      hibernatedAt: new Date().toISOString().split('T')[0],
    });
    return { success: true };
  },
});

// Wake a hibernated habit
export const wakeHabit = mutation({
  args: {
    habitId: v.id('habits'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);
    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }
    await ctx.db.patch(args.habitId, {
      hibernatedAt: undefined,
    });
    return { success: true };
  },
});

// Use a streak freeze to protect a habit's streak
export const useStreakFreeze = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);
    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();
    if (!progress) throw new Error('No progress found');
    if (progress.streakFreezes <= 0) throw new Error('No streak freezes available');
    await ctx.db.patch(progress._id, {
      streakFreezes: progress.streakFreezes - 1,
    });
    return { success: true, remaining: progress.streakFreezes - 1 };
  },
});

// Reorder habits (update sortOrder for a list of habit IDs)
export const reorderHabits = mutation({
  args: {
    userId: v.id('users'),
    habitIds: v.array(v.id('habits')),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    for (let i = 0; i < args.habitIds.length; i++) {
      const habit = await ctx.db.get(args.habitIds[i]);
      if (habit && habit.userId === args.userId) {
        await ctx.db.patch(args.habitIds[i], { sortOrder: i });
      }
    }
  },
});

// ── Micro-Reflections ──

export const addMicroReflection = mutation({
  args: {
    userId: v.id('users'),
    habitId: v.id('habits'),
    mood: v.union(
      v.literal('energized'),
      v.literal('good'),
      v.literal('meh'),
      v.literal('tough')
    ),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    // Upsert: replace if same habit+date already has a reflection
    const existing = await ctx.db
      .query('microReflections')
      .withIndex('by_habit_date', (q) =>
        q.eq('habitId', args.habitId).eq('date', args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { mood: args.mood });
      return existing._id;
    }

    return await ctx.db.insert('microReflections', {
      userId: args.userId,
      habitId: args.habitId,
      mood: args.mood,
      date: args.date,
    });
  },
});

export const getReflections = query({
  args: {
    habitId: v.id('habits'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('microReflections')
      .withIndex('by_habit', (q) => q.eq('habitId', args.habitId))
      .order('desc')
      .take(30);
  },
});

// Helper function to calculate streak
async function calculateStreak(
  ctx: MutationCtx | QueryCtx,
  habitId: Id<'habits'>,
  currentDate: string
): Promise<number> {
  const completions = await ctx.db
    .query('habitCompletions')
    .withIndex('by_habit', (q) => q.eq('habitId', habitId))
    .collect();

  const completedDates = new Set(completions.map((c: Doc<'habitCompletions'>) => c.completedDate));

  // Start from current date and count backwards
  let streak = 0;
  const checkDate = new Date(currentDate);

  // If today is not completed, start from yesterday
  if (!completedDates.has(currentDate)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (completedDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }

    // Safety limit
    if (streak > 1000) break;
  }

  return streak;
}
