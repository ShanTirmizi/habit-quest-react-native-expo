import { v } from 'convex/values';
import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
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

// Goal category type
const goalCategoryValidator = v.union(
  v.literal('fitness'),
  v.literal('learning'),
  v.literal('career'),
  v.literal('health'),
  v.literal('creative'),
  v.literal('financial')
);

// Goal status type
const goalStatusValidator = v.union(
  v.literal('active'),
  v.literal('achieved'),
  v.literal('paused'),
  v.literal('abandoned')
);

// Check-in status type
const checkInStatusValidator = v.union(
  v.literal('on_track'),
  v.literal('struggling'),
  v.literal('ahead'),
  v.literal('paused')
);

// Goal level type
const goalLevelValidator = v.union(
  v.literal('beginner'),
  v.literal('intermediate'),
  v.literal('advanced')
);

// ============================================
// Queries
// ============================================

// Get all goals for a user
export const getGoals = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const goals = await ctx.db
      .query('goals')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return goals;
  },
});

// Get only active goals for a user
export const getActiveGoals = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const goals = await ctx.db
      .query('goals')
      .withIndex('by_user_status', (q) => q.eq('userId', args.userId).eq('status', 'active'))
      .collect();

    return goals;
  },
});

// Get a single goal by ID with linked habits
export const getGoalById = query({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      return null;
    }

    // Get linked habits if any
    let linkedHabits: Array<{
      _id: Id<'habits'>;
      name: string;
      category: string;
      xpReward: number;
      streak: number;
    }> = [];
    if (goal.linkedHabitIds && goal.linkedHabitIds.length > 0) {
      const habitPromises = goal.linkedHabitIds.map((id) => ctx.db.get(id));
      const habits = await Promise.all(habitPromises);
      linkedHabits = habits
        .filter((h) => h !== null)
        .map((h) => ({
          _id: h!._id,
          name: h!.name,
          category: h!.category,
          xpReward: h!.xpReward,
          streak: h!.streak,
        }));
    }

    return {
      ...goal,
      linkedHabits,
    };
  },
});

// ============================================
// Mutations
// ============================================

// Create a new goal
export const createGoal = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    category: goalCategoryValidator,
    targetDate: v.string(),
    currentLevel: v.optional(goalLevelValidator),
    dailyTimeAvailable: v.optional(v.number()),
    constraints: v.optional(v.string()),
    preferences: v.optional(v.string()),
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          targetDate: v.string(),
          completed: v.boolean(),
          completedAt: v.optional(v.string()),
        })
      )
    ),
    phases: v.optional(
      v.array(
        v.object({
          weekStart: v.number(),
          weekEnd: v.number(),
          description: v.string(),
          habitUpdates: v.array(
            v.object({
              habitId: v.id('habits'),
              newName: v.optional(v.string()),
              newXpReward: v.optional(v.number()),
            })
          ),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goalId = await ctx.db.insert('goals', {
      userId: args.userId,
      title: args.title,
      description: args.description,
      category: args.category,
      targetDate: args.targetDate,
      status: 'active',
      currentLevel: args.currentLevel,
      dailyTimeAvailable: args.dailyTimeAvailable,
      constraints: args.constraints,
      preferences: args.preferences,
      milestones: args.milestones,
      phases: args.phases,
      currentPhaseIndex: 0,
      linkedHabitIds: [],
      checkIns: [],
    });

    return goalId;
  },
});

// Update goal details
export const updateGoal = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(goalCategoryValidator),
    targetDate: v.optional(v.string()),
    currentLevel: v.optional(goalLevelValidator),
    dailyTimeAvailable: v.optional(v.number()),
    constraints: v.optional(v.string()),
    preferences: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.targetDate !== undefined) updates.targetDate = args.targetDate;
    if (args.currentLevel !== undefined) updates.currentLevel = args.currentLevel;
    if (args.dailyTimeAvailable !== undefined) updates.dailyTimeAvailable = args.dailyTimeAvailable;
    if (args.constraints !== undefined) updates.constraints = args.constraints;
    if (args.preferences !== undefined) updates.preferences = args.preferences;

    await ctx.db.patch(args.goalId, updates);
  },
});

// Update goal status
export const updateGoalStatus = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    status: goalStatusValidator,
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    await ctx.db.patch(args.goalId, { status: args.status });
  },
});

// Add a milestone to a goal
export const addMilestone = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    milestone: v.object({
      id: v.string(),
      title: v.string(),
      targetDate: v.string(),
      completed: v.boolean(),
      completedAt: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    const milestones = goal.milestones ?? [];
    milestones.push(args.milestone);

    await ctx.db.patch(args.goalId, { milestones });
  },
});

// Complete a milestone
export const completeMilestone = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    milestoneId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    const milestones = goal.milestones ?? [];
    const milestoneIndex = milestones.findIndex((m) => m.id === args.milestoneId);
    if (milestoneIndex === -1) {
      throw new Error('Milestone not found');
    }

    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      completed: true,
      completedAt: new Date().toISOString(),
    };

    await ctx.db.patch(args.goalId, { milestones });
  },
});

// Uncomplete a milestone
export const uncompleteMilestone = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    milestoneId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    const milestones = goal.milestones ?? [];
    const milestoneIndex = milestones.findIndex((m) => m.id === args.milestoneId);
    if (milestoneIndex === -1) {
      throw new Error('Milestone not found');
    }

    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      completed: false,
      completedAt: undefined,
    };

    await ctx.db.patch(args.goalId, { milestones });
  },
});

// Add a check-in to a goal
export const addCheckIn = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    checkIn: v.object({
      date: v.string(),
      status: checkInStatusValidator,
      note: v.optional(v.string()),
      aiAdjustments: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    const checkIns = goal.checkIns ?? [];
    // Replace if same date exists
    const existingIndex = checkIns.findIndex((c) => c.date === args.checkIn.date);
    if (existingIndex >= 0) {
      checkIns[existingIndex] = args.checkIn;
    } else {
      checkIns.push(args.checkIn);
    }

    await ctx.db.patch(args.goalId, { checkIns });
  },
});

// Link a habit to a goal
export const linkHabitToGoal = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    habitId: v.id('habits'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    const habit = await ctx.db.get(args.habitId);
    if (!habit || habit.userId !== args.userId) {
      throw new Error('Habit not found or unauthorized');
    }

    // Add to goal's linkedHabitIds
    const linkedHabitIds = goal.linkedHabitIds ?? [];
    if (!linkedHabitIds.includes(args.habitId)) {
      linkedHabitIds.push(args.habitId);
      await ctx.db.patch(args.goalId, { linkedHabitIds });
    }

    // Update habit's goalId
    await ctx.db.patch(args.habitId, { goalId: args.goalId });
  },
});

// Unlink a habit from a goal
export const unlinkHabitFromGoal = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    habitId: v.id('habits'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    // Remove from goal's linkedHabitIds
    const linkedHabitIds = (goal.linkedHabitIds ?? []).filter((id) => id !== args.habitId);
    await ctx.db.patch(args.goalId, { linkedHabitIds });

    // Clear habit's goalId
    const habit = await ctx.db.get(args.habitId);
    if (habit && habit.userId === args.userId) {
      await ctx.db.patch(args.habitId, { goalId: undefined });
    }
  },
});

// XP bonus for advancing to next phase
const PHASE_ADVANCE_XP_BONUS = 25;

// Advance to next phase
export const advancePhase = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    const phases = goal.phases ?? [];
    const currentIndex = goal.currentPhaseIndex ?? 0;

    if (currentIndex >= phases.length - 1) {
      throw new Error('Already at the last phase');
    }

    const nextPhaseIndex = currentIndex + 1;
    const nextPhase = phases[nextPhaseIndex];

    // Apply habit updates from the next phase
    for (const update of nextPhase.habitUpdates) {
      const habit = await ctx.db.get(update.habitId);
      if (habit && habit.userId === args.userId) {
        const habitUpdates: Record<string, unknown> = {};
        if (update.newName) habitUpdates.name = update.newName;
        if (update.newXpReward) habitUpdates.xpReward = update.newXpReward;
        if (Object.keys(habitUpdates).length > 0) {
          await ctx.db.patch(update.habitId, habitUpdates);
        }
      }
    }

    // Award XP bonus for advancing phase
    const userProgress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (userProgress) {
      await ctx.db.patch(userProgress._id, {
        totalXp: (userProgress.totalXp || 0) + PHASE_ADVANCE_XP_BONUS,
      });
    }

    await ctx.db.patch(args.goalId, { currentPhaseIndex: nextPhaseIndex });

    return { xpAwarded: PHASE_ADVANCE_XP_BONUS, newPhaseIndex: nextPhaseIndex };
  },
});

// Update goal phases (used after habits are created to add phase data with habit IDs)
export const updateGoalPhases = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    phases: v.array(
      v.object({
        weekStart: v.number(),
        weekEnd: v.number(),
        description: v.string(),
        habitUpdates: v.array(
          v.object({
            habitId: v.id('habits'),
            newName: v.optional(v.string()),
            newXpReward: v.optional(v.number()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    await ctx.db.patch(args.goalId, { phases: args.phases });
  },
});

// Delete a goal
export const deleteGoal = mutation({
  args: {
    goalId: v.id('goals'),
    userId: v.id('users'),
    deleteLinkedHabits: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.userId) {
      throw new Error('Goal not found or unauthorized');
    }

    // Optionally delete linked habits
    if (args.deleteLinkedHabits && goal.linkedHabitIds) {
      for (const habitId of goal.linkedHabitIds) {
        const habit = await ctx.db.get(habitId);
        if (habit && habit.userId === args.userId) {
          // Delete habit completions first
          const completions = await ctx.db
            .query('habitCompletions')
            .withIndex('by_habit', (q) => q.eq('habitId', habitId))
            .collect();
          for (const completion of completions) {
            await ctx.db.delete(completion._id);
          }
          await ctx.db.delete(habitId);
        }
      }
    } else if (goal.linkedHabitIds) {
      // Just unlink habits
      for (const habitId of goal.linkedHabitIds) {
        const habit = await ctx.db.get(habitId);
        if (habit && habit.userId === args.userId) {
          await ctx.db.patch(habitId, { goalId: undefined });
        }
      }
    }

    await ctx.db.delete(args.goalId);
  },
});
