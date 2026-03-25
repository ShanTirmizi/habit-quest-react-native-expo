import { v } from 'convex/values';
import { mutation, query, MutationCtx, QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { verifyAuth } from './lib/auth';
import { HP_CONFIG, UNDERWORLD_CONFIG, MEDICINE_CONFIG, computeLevel } from './lib/constants';
import { getGamificationOverrides } from './lib/neurodivergence';
import { FEATURE_FLAGS } from './lib/featureFlags';

// Helper to get or create user progress
async function getOrCreateProgress(ctx: MutationCtx, userId: Id<'users'>) {
  const existing = await ctx.db
    .query('userProgress')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();

  if (existing) return existing;

  // Create initial progress record
  const progressId = await ctx.db.insert('userProgress', {
    userId,
    totalXp: 0,
    level: 0,
    achievements: [],
    streakFreezes: 0,
    currentHp: HP_CONFIG.DEFAULT_HP,
    maxHp: HP_CONFIG.MAX_HP,
    faintCount: 0,
  });

  return await ctx.db.get(progressId);
}

// Get user progress
export const getProgress = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    return await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();
  },
});

// Add XP and handle level ups
export const addXp = mutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    // Apply ND effort-weighting when feature is enabled (e.g. depression users get 1.3x XP)
    let adjustedAmount = args.amount;
    if (FEATURE_FLAGS.neurodivergenceSupport) {
      const user = await ctx.db.get(args.userId);
      const ndOverrides = getGamificationOverrides(user?.neurodivergenceProfile ?? undefined);
      adjustedAmount = Math.round(args.amount * ndOverrides.xpCompletionMultiplier);
    }

    const newTotalXp = progress.totalXp + adjustedAmount;
    const newLevel = computeLevel(newTotalXp);
    const leveledUp = newLevel > progress.level;

    await ctx.db.patch(progress._id, {
      totalXp: newTotalXp,
      level: newLevel,
    });

    return { leveledUp, newLevel, totalXp: newTotalXp };
  },
});

// Remove XP (e.g. when undoing a habit completion)
export const removeXp = mutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const newTotalXp = Math.max(progress.totalXp - args.amount, 0);
    const newLevel = computeLevel(newTotalXp);

    await ctx.db.patch(progress._id, {
      totalXp: newTotalXp,
      level: newLevel,
    });

    return { totalXp: newTotalXp, newLevel };
  },
});

// Unlock achievement
export const unlockAchievement = mutation({
  args: {
    userId: v.id('users'),
    achievementId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    if (progress.achievements.includes(args.achievementId)) {
      return false; // Already unlocked
    }

    await ctx.db.patch(progress._id, {
      achievements: [...progress.achievements, args.achievementId],
    });

    return true;
  },
});

// Award streak freeze
export const awardStreakFreeze = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const today = new Date().toISOString().split('T')[0];

    await ctx.db.patch(progress._id, {
      streakFreezes: progress.streakFreezes + 1,
      lastWeeklyFreezeEarned: today,
    });

    return true;
  },
});

// Use streak freeze
export const useStreakFreeze = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);

    if (!progress || progress.streakFreezes <= 0) {
      return false;
    }

    await ctx.db.patch(progress._id, {
      streakFreezes: progress.streakFreezes - 1,
    });

    return true;
  },
});

// Heal HP
export const healHp = mutation({
  args: {
    userId: v.id('users'),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const healAmount = args.amount ?? HP_CONFIG.COMPLETION_HEAL;
    const newHp = Math.min(progress.currentHp + healAmount, progress.maxHp);

    await ctx.db.patch(progress._id, {
      currentHp: newHp,
    });

    return newHp;
  },
});

// Deduct HP (returns whether user fainted)
export const deductHp = mutation({
  args: {
    userId: v.id('users'),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const baseDamage = args.amount ?? HP_CONFIG.MISSED_HABIT_DAMAGE;
    let damageAmount = baseDamage;
    if (FEATURE_FLAGS.neurodivergenceSupport) {
      const user = await ctx.db.get(args.userId);
      const ndOverrides = getGamificationOverrides(user?.neurodivergenceProfile ?? undefined);
      damageAmount = Math.round(baseDamage * ndOverrides.hpDamageMultiplier);
    }
    let newHp = Math.max(progress.currentHp - damageAmount, 0);
    let fainted = false;
    let newLevel = progress.level;
    let newFaintCount = progress.faintCount;

    // Check if user fainted
    if (newHp <= HP_CONFIG.FAINT_THRESHOLD) {
      fainted = true;
      newFaintCount += 1;
      newLevel = Math.max(progress.level - HP_CONFIG.FAINT_LEVEL_PENALTY, 0);
      newHp = HP_CONFIG.FAINT_HP_RESET;
    }

    await ctx.db.patch(progress._id, {
      currentHp: newHp,
      level: newLevel,
      faintCount: newFaintCount,
    });

    return { newHp, fainted, newLevel };
  },
});

// Check missed habits on login
export const checkMissedHabitsOnLogin = mutation({
  args: {
    userId: v.id('users'),
    clientDate: v.optional(v.string()), // YYYY-MM-DD from client timezone
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const today = args.clientDate ?? new Date().toISOString().split('T')[0];
    const lastLogin = progress.lastLoginDate;

    // Auto-end expired holiday mode
    if (progress.holidayMode?.active && progress.holidayMode.endDate && today > progress.holidayMode.endDate) {
      await ctx.db.patch(progress._id, { holidayMode: undefined });
    }

    // Update last login
    await ctx.db.patch(progress._id, { lastLoginDate: today });

    // Skip damage if holiday mode is active
    if (progress.holidayMode?.active) {
      // Check if endDate hasn't passed yet (we already cleared expired ones above)
      const endDate = progress.holidayMode.endDate;
      if (!endDate || today <= endDate) {
        return { missedCount: 0, hpLost: 0, fainted: false, newHp: progress.currentHp };
      }
    }

    // If no last login or same day, no damage
    if (!lastLogin || lastLogin === today) {
      return { missedCount: 0, hpLost: 0, fainted: false, newHp: progress.currentHp };
    }

    // Calculate yesterday based on client's "today"
    const yesterdayDate = new Date(today + 'T12:00:00Z'); // noon to avoid DST edge cases
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // Only check if last login was yesterday
    if (lastLogin !== yesterdayStr) {
      return { missedCount: 0, hpLost: 0, fainted: false, newHp: progress.currentHp };
    }

    // Get user's habits
    const habits = await ctx.db
      .query('habits')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Get yesterday's completions
    const yesterdayCompletions = await ctx.db
      .query('habitCompletions')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', args.userId).eq('completedDate', yesterdayStr)
      )
      .collect();

    const completedHabitIds = new Set(yesterdayCompletions.map((c) => c.habitId.toString()));

    // Count missed daily habits
    const yesterdayDayOfWeek = yesterdayDate.getDay();
    let missedCount = 0;

    for (const habit of habits) {
      const frequency = habit.frequency?.type ?? 'daily';
      let wasDueYesterday = false;

      switch (frequency) {
        case 'daily':
          wasDueYesterday = true;
          break;
        case 'weekdays':
          wasDueYesterday = yesterdayDayOfWeek >= 1 && yesterdayDayOfWeek <= 5;
          break;
        case 'weekends':
          wasDueYesterday = yesterdayDayOfWeek === 0 || yesterdayDayOfWeek === 6;
          break;
        case 'custom':
          wasDueYesterday = habit.frequency?.daysOfWeek?.includes(yesterdayDayOfWeek) ?? false;
          break;
        case 'timesPerWeek':
          wasDueYesterday = false; // Don't penalize flexible scheduling
          break;
      }

      if (wasDueYesterday && !completedHabitIds.has(habit._id.toString())) {
        missedCount++;
      }
    }

    if (missedCount === 0) {
      return { missedCount: 0, hpLost: 0, fainted: false, newHp: progress.currentHp };
    }

    // Apply damage (reduced for depression/anxiety users when ND feature is enabled)
    let damagePerHabit: number = HP_CONFIG.MISSED_HABIT_DAMAGE;
    if (FEATURE_FLAGS.neurodivergenceSupport) {
      const user = await ctx.db.get(args.userId);
      const ndOverrides = getGamificationOverrides(user?.neurodivergenceProfile ?? undefined);
      damagePerHabit = Math.round(HP_CONFIG.MISSED_HABIT_DAMAGE * ndOverrides.hpDamageMultiplier);
    }
    const totalDamage = missedCount * damagePerHabit;
    let newHp = Math.max(progress.currentHp - totalDamage, 0);
    let fainted = false;
    let newFaintCount = progress.faintCount;
    let newLevel = progress.level;

    if (newHp <= HP_CONFIG.FAINT_THRESHOLD) {
      fainted = true;
      newFaintCount += 1;
      newLevel = Math.max(progress.level - HP_CONFIG.FAINT_LEVEL_PENALTY, 0);
      newHp = HP_CONFIG.FAINT_HP_RESET;
    }

    await ctx.db.patch(progress._id, {
      currentHp: newHp,
      faintCount: newFaintCount,
      level: newLevel,
    });

    return { missedCount, hpLost: totalDamage, fainted, newHp };
  },
});

// Unlock skill
export const unlockSkill = mutation({
  args: {
    userId: v.id('users'),
    skillId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const existingSkills = progress.unlockedSkills ?? [];
    if (existingSkills.some((s) => s.skillId === args.skillId)) {
      return false;
    }

    await ctx.db.patch(progress._id, {
      unlockedSkills: [
        ...existingSkills,
        { skillId: args.skillId, unlockedAt: new Date().toISOString() },
      ],
    });

    return true;
  },
});

// Set active title
export const setActiveTitle = mutation({
  args: {
    userId: v.id('users'),
    titleId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const unlockedTitles = progress.unlockedTitles ?? [];
    const newUnlockedTitles = unlockedTitles.includes(args.titleId)
      ? unlockedTitles
      : [...unlockedTitles, args.titleId];

    await ctx.db.patch(progress._id, {
      activeTitle: args.titleId,
      unlockedTitles: newUnlockedTitles,
    });
  },
});

// Award badge
export const awardBadge = mutation({
  args: {
    userId: v.id('users'),
    badge: v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      icon: v.string(),
      category: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const existingBadges = progress.badges ?? [];
    if (existingBadges.some((b) => b.id === args.badge.id)) {
      return false;
    }

    await ctx.db.patch(progress._id, {
      badges: [...existingBadges, { ...args.badge, earnedAt: new Date().toISOString() }],
    });

    return true;
  },
});

// Track weekly boss defeat and grant XP (only once per week)
export const defeatWeeklyBoss = mutation({
  args: {
    userId: v.id('users'),
    bossId: v.string(),
    weekStart: v.string(),
    xpReward: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    // Check if boss was already defeated this week
    const existingProgress = progress.weeklyBossProgress;
    if (
      existingProgress &&
      existingProgress.bossId === args.bossId &&
      existingProgress.weekStart === args.weekStart &&
      existingProgress.defeated
    ) {
      // Already defeated this week, no additional XP
      return { alreadyDefeated: true, xpGranted: 0 };
    }

    // Mark boss as defeated and grant XP
    const newTotalXp = progress.totalXp + args.xpReward;
    const newLevel = computeLevel(newTotalXp);
    const leveledUp = newLevel > progress.level;

    await ctx.db.patch(progress._id, {
      totalXp: newTotalXp,
      level: newLevel,
      weeklyBossProgress: {
        bossId: args.bossId,
        currentDamage: 0, // Will be updated by frontend
        defeated: true,
        weekStart: args.weekStart,
      },
    });

    return { alreadyDefeated: false, xpGranted: args.xpReward, leveledUp, newLevel };
  },
});

// Get weekly boss progress
export const getWeeklyBossProgress = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    return progress?.weeklyBossProgress ?? null;
  },
});

// ============================================
// Underworld System (Failure Recovery)
// ============================================

// Enter the underworld (called when HP hits 0)
export const enterUnderworld = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to get progress');

    // Already in underworld
    if (progress.inUnderworld) {
      return { alreadyInUnderworld: true };
    }

    const today = new Date().toISOString().split('T')[0];

    await ctx.db.patch(progress._id, {
      inUnderworld: true,
      underworldStartDate: today,
      underworldDaysCompleted: 0,
      // Don't reset HP here - keep it at 0 until resurrection
      currentHp: 0,
    });

    return { entered: true, startDate: today };
  },
});

// Complete a day in the underworld
export const completeUnderworldDay = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to get progress');

    if (!progress.inUnderworld) {
      return { success: false, reason: 'not_in_underworld' };
    }

    const daysCompleted = (progress.underworldDaysCompleted ?? 0) + 1;

    // Check if ready to resurrect
    if (daysCompleted >= UNDERWORLD_CONFIG.DAYS_TO_RESURRECT) {
      // Ready for resurrection - don't auto-resurrect, let user trigger it
      await ctx.db.patch(progress._id, {
        underworldDaysCompleted: daysCompleted,
      });

      return {
        success: true,
        daysCompleted,
        readyToResurrect: true,
      };
    }

    await ctx.db.patch(progress._id, {
      underworldDaysCompleted: daysCompleted,
    });

    return {
      success: true,
      daysCompleted,
      daysRemaining: UNDERWORLD_CONFIG.DAYS_TO_RESURRECT - daysCompleted,
      readyToResurrect: false,
    };
  },
});

// Resurrect from the underworld
export const resurrect = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to get progress');

    if (!progress.inUnderworld) {
      return { success: false, reason: 'not_in_underworld' };
    }

    const daysCompleted = progress.underworldDaysCompleted ?? 0;
    if (daysCompleted < UNDERWORLD_CONFIG.DAYS_TO_RESURRECT) {
      return {
        success: false,
        reason: 'not_enough_days',
        daysCompleted,
        daysRequired: UNDERWORLD_CONFIG.DAYS_TO_RESURRECT,
      };
    }

    const resurrections = (progress.underworldResurrections ?? 0) + 1;

    // Calculate XP reward
    const xpBonus = UNDERWORLD_CONFIG.RESURRECTION_XP_BONUS;
    const newTotalXp = progress.totalXp + xpBonus;
    const newLevel = computeLevel(newTotalXp);

    await ctx.db.patch(progress._id, {
      inUnderworld: false,
      underworldStartDate: undefined,
      underworldDaysCompleted: 0,
      underworldResurrections: resurrections,
      currentHp: UNDERWORLD_CONFIG.RESURRECTION_HP,
      totalXp: newTotalXp,
      level: newLevel,
    });

    return {
      success: true,
      resurrectionCount: resurrections,
      hpRestored: UNDERWORLD_CONFIG.RESURRECTION_HP,
      xpBonus,
      newLevel,
      leveledUp: newLevel > progress.level,
    };
  },
});

// Get underworld status
export const getUnderworldStatus = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!progress || !progress.inUnderworld) {
      return { inUnderworld: false };
    }

    const daysCompleted = progress.underworldDaysCompleted ?? 0;

    return {
      inUnderworld: true,
      startDate: progress.underworldStartDate,
      daysCompleted,
      daysRemaining: Math.max(0, UNDERWORLD_CONFIG.DAYS_TO_RESURRECT - daysCompleted),
      readyToResurrect: daysCompleted >= UNDERWORLD_CONFIG.DAYS_TO_RESURRECT,
      totalResurrections: progress.underworldResurrections ?? 0,
    };
  },
});

// ============================================
// Holiday Mode (Global Pause)
// ============================================

// Start holiday mode
export const startHoliday = mutation({
  args: {
    userId: v.id('users'),
    endDate: v.optional(v.string()), // Optional auto-end date "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const today = new Date().toISOString().split('T')[0];

    await ctx.db.patch(progress._id, {
      holidayMode: {
        active: true,
        startDate: today,
        endDate: args.endDate,
      },
    });

    return { success: true, startDate: today, endDate: args.endDate };
  },
});

// End holiday mode
export const endHoliday = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    await ctx.db.patch(progress._id, {
      holidayMode: undefined,
    });

    return { success: true };
  },
});

// Get holiday status (also auto-ends if past endDate)
export const getHolidayStatus = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!progress?.holidayMode?.active) {
      return { active: false };
    }

    const today = new Date().toISOString().split('T')[0];
    const { startDate, endDate } = progress.holidayMode;

    // Check if auto-end date has passed (queries can't mutate, so flag it)
    if (endDate && today > endDate) {
      return { active: false, expired: true, startDate, endDate };
    }

    return { active: true, startDate, endDate };
  },
});

// Auto-end expired holiday (called from client when expired flag is detected)
export const autoEndHoliday = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!progress?.holidayMode?.active) return { success: false };

    const today = new Date().toISOString().split('T')[0];
    const endDate = progress.holidayMode.endDate;

    if (endDate && today > endDate) {
      await ctx.db.patch(progress._id, { holidayMode: undefined });
      return { success: true };
    }

    return { success: false };
  },
});

// ============================================
// AI Coaching Tracking
// ============================================

// Update the last coaching date (for daily auto-fetch limit)
export const updateCoachingDate = mutation({
  args: {
    userId: v.id('users'),
    fingerprint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (progress) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(progress._id, {
        lastCoachingDate: today,
        lastCoachingTimestamp: Date.now(),
        ...(args.fingerprint ? { lastCoachingFingerprint: args.fingerprint } : {}),
      });
    }
  },
});

// Update the last pattern check date (for weekly pattern detection)
export const updatePatternCheckDate = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (progress) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(progress._id, { lastPatternCheckDate: today });
    }
  },
});

// ============================================
// Medicine Gamification System
// ============================================

// Add XP and HP from medicine completion
export const addMedicineReward = mutation({
  args: {
    userId: v.id('users'),
    xpAmount: v.number(),
    hpAmount: v.optional(v.number()),
    isGroupTakeAll: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const today = new Date().toISOString().split('T')[0];
    const hpHeal = args.hpAmount ?? MEDICINE_CONFIG.HP_HEAL;

    // Update XP
    const newTotalXp = progress.totalXp + args.xpAmount;
    const newLevel = computeLevel(newTotalXp);
    const leveledUp = newLevel > progress.level;

    // Update HP (cap at max)
    const newHp = Math.min((progress.currentHp ?? 100) + hpHeal, progress.maxHp ?? 100);

    // Update medicine stats
    const totalMedicinesTaken = (progress.totalMedicinesTaken ?? 0) + 1;
    const totalGroupTakeAllUsed = args.isGroupTakeAll
      ? (progress.totalGroupTakeAllUsed ?? 0) + 1
      : (progress.totalGroupTakeAllUsed ?? 0);

    // Track today's medicine XP
    let todayMedicineXp = progress.todayMedicineXp ?? 0;
    if (progress.lastMedicineXpDate !== today) {
      todayMedicineXp = args.xpAmount;
    } else {
      todayMedicineXp += args.xpAmount;
    }

    // Update weekly boss damage
    let weeklyBossProgress = progress.weeklyBossProgress;
    if (weeklyBossProgress && !weeklyBossProgress.defeated) {
      weeklyBossProgress = {
        ...weeklyBossProgress,
        currentDamage: weeklyBossProgress.currentDamage + 1,
      };
    }

    await ctx.db.patch(progress._id, {
      totalXp: newTotalXp,
      level: newLevel,
      currentHp: newHp,
      totalMedicinesTaken,
      totalGroupTakeAllUsed,
      todayMedicineXp,
      lastMedicineXpDate: today,
      weeklyBossProgress,
    });

    return {
      xpGained: args.xpAmount,
      hpGained: hpHeal,
      leveledUp,
      newLevel,
      newHp,
      totalMedicinesTaken,
    };
  },
});

// Update medicine streak (called after checking today's completion rate)
export const updateMedicineStreak = mutation({
  args: {
    userId: v.id('users'),
    isPerfectDay: v.boolean(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = progress.medicineStreak ?? 0;

    if (args.isPerfectDay) {
      // Check if streak is continuing or starting fresh
      if (progress.lastMedicineStreakDate === yesterdayStr) {
        // Continue streak
        newStreak += 1;
      } else if (progress.lastMedicineStreakDate !== today) {
        // Start new streak (first day or gap)
        newStreak = 1;
      }
      // If lastMedicineStreakDate === today, don't double-count

      await ctx.db.patch(progress._id, {
        medicineStreak: newStreak,
        lastMedicineStreakDate: today,
      });
    } else {
      // Break streak if it was active
      if (newStreak > 0 && progress.lastMedicineStreakDate !== today) {
        await ctx.db.patch(progress._id, {
          medicineStreak: 0,
        });
        newStreak = 0;
      }
    }

    return { streak: newStreak };
  },
});

// Check and unlock medicine achievements
export const checkMedicineAchievements = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await getOrCreateProgress(ctx, args.userId);
    if (!progress) throw new Error('Failed to create progress');

    const unlockedAchievements: string[] = [];
    const currentAchievements = progress.achievements || [];

    // med-starter: First medicine taken
    if (!currentAchievements.includes('med-starter') && (progress.totalMedicinesTaken ?? 0) >= 1) {
      unlockedAchievements.push('med-starter');
    }

    // med-consistent-7: 7-day streak
    if (!currentAchievements.includes('med-consistent-7') && (progress.medicineStreak ?? 0) >= 7) {
      unlockedAchievements.push('med-consistent-7');
    }

    // med-consistent-30: 30-day streak
    if (
      !currentAchievements.includes('med-consistent-30') &&
      (progress.medicineStreak ?? 0) >= 30
    ) {
      unlockedAchievements.push('med-consistent-30');
    }

    // med-century: 100 doses
    if (
      !currentAchievements.includes('med-century') &&
      (progress.totalMedicinesTaken ?? 0) >= 100
    ) {
      unlockedAchievements.push('med-century');
    }

    // med-group-master: 50 "Take All" uses
    if (
      !currentAchievements.includes('med-group-master') &&
      (progress.totalGroupTakeAllUsed ?? 0) >= 50
    ) {
      unlockedAchievements.push('med-group-master');
    }

    // Update achievements if any were unlocked
    if (unlockedAchievements.length > 0) {
      await ctx.db.patch(progress._id, {
        achievements: [...currentAchievements, ...unlockedAchievements],
      });
    }

    return { unlockedAchievements };
  },
});

// Get medicine stats for display
export const getMedicineStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!progress) {
      return {
        medicineStreak: 0,
        totalMedicinesTaken: 0,
        todayMedicineXp: 0,
        totalGroupTakeAllUsed: 0,
      };
    }

    const today = new Date().toISOString().split('T')[0];

    return {
      medicineStreak: progress.medicineStreak ?? 0,
      totalMedicinesTaken: progress.totalMedicinesTaken ?? 0,
      todayMedicineXp: progress.lastMedicineXpDate === today ? (progress.todayMedicineXp ?? 0) : 0,
      totalGroupTakeAllUsed: progress.totalGroupTakeAllUsed ?? 0,
    };
  },
});

// Calculate XP for a medicine dose
export function calculateMedicineXp(
  scheduledTime: string,
  takenAt: string,
  medicineStreak: number,
  isGroupTakeAll: boolean
): number {
  let xp = MEDICINE_CONFIG.BASE_XP;

  // On-time bonus: within 30 min of scheduled time
  const [scheduledHour, scheduledMin] = scheduledTime.split(':').map(Number);
  const takenDate = new Date(takenAt);
  const scheduledMinutes = scheduledHour * 60 + scheduledMin;
  const takenMinutes = takenDate.getHours() * 60 + takenDate.getMinutes();

  if (Math.abs(takenMinutes - scheduledMinutes) <= 30) {
    xp += MEDICINE_CONFIG.ON_TIME_BONUS_XP;
  }

  // Streak bonus: +1 per day, max 5
  const streakBonus = Math.min(medicineStreak, MEDICINE_CONFIG.STREAK_BONUS_MAX);
  xp += streakBonus;

  // Group bonus
  if (isGroupTakeAll) {
    xp += MEDICINE_CONFIG.GROUP_BONUS_XP;
  }

  return xp;
}
