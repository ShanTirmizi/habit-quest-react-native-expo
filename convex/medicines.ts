import { v } from 'convex/values';
import { mutation, query, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { verifyAuth } from './lib/auth';
import { MEDICINE_CONFIG, computeLevel } from './lib/constants';

// Schedule time validator
const scheduleTimeValidator = v.object({
  label: v.string(),
  time: v.string(),
  reminderEnabled: v.boolean(),
});

// Get all medicines for a user
export const getMedicines = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicines = await ctx.db
      .query('medicines')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return medicines;
  },
});

// Get active medicines for a user
export const getActiveMedicines = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicines = await ctx.db
      .query('medicines')
      .withIndex('by_user_active', (q) => q.eq('userId', args.userId).eq('isActive', true))
      .collect();

    return medicines;
  },
});

// Get today's medicine schedule with completion status
export const getTodaySchedule = query({
  args: { userId: v.id('users'), date: v.string() },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    // Get active medicines
    const medicines = await ctx.db
      .query('medicines')
      .withIndex('by_user_active', (q) => q.eq('userId', args.userId).eq('isActive', true))
      .collect();

    // Get completions for today
    const completions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_user_date', (q) => q.eq('userId', args.userId).eq('date', args.date))
      .collect();

    // Create a map of completions by medicineId + scheduledTime
    const completionMap = new Map<string, (typeof completions)[0]>();
    for (const completion of completions) {
      const key = `${completion.medicineId}_${completion.scheduledTime}`;
      completionMap.set(key, completion);
    }

    // Build schedule with status
    const schedule: {
      medicineId: string;
      medicineName: string;
      dosage: string;
      instructions?: string;
      scheduledTime: string;
      label: string;
      status: 'taken' | 'skipped' | 'pending';
      takenAt?: string;
      notes?: string;
    }[] = [];

    for (const medicine of medicines) {
      for (const timeSlot of medicine.scheduledTimes) {
        const key = `${medicine._id}_${timeSlot.time}`;
        const completion = completionMap.get(key);

        schedule.push({
          medicineId: medicine._id,
          medicineName: medicine.name,
          dosage: medicine.dosage,
          instructions: medicine.instructions,
          scheduledTime: timeSlot.time,
          label: timeSlot.label,
          status: completion?.status ?? 'pending',
          takenAt: completion?.takenAt,
          notes: completion?.notes,
        });
      }
    }

    // Sort by scheduled time
    schedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    return schedule;
  },
});

// Get medicine history (for calendar view)
export const getMedicineHistory = query({
  args: {
    userId: v.id('users'),
    medicineId: v.optional(v.id('medicines')),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    let completions;

    if (args.medicineId) {
      completions = await ctx.db
        .query('medicineCompletions')
        .withIndex('by_medicine_date', (q) => q.eq('medicineId', args.medicineId!))
        .collect();
    } else {
      completions = await ctx.db
        .query('medicineCompletions')
        .withIndex('by_user_date', (q) => q.eq('userId', args.userId))
        .collect();
    }

    // Filter by date range
    return completions.filter((c) => c.date >= args.startDate && c.date <= args.endDate);
  },
});

// Add a new medicine
export const addMedicine = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    dosage: v.string(),
    instructions: v.optional(v.string()),
    prescriber: v.optional(v.string()),
    scheduledTimes: v.array(scheduleTimeValidator),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const now = new Date().toISOString();

    const medicineId = await ctx.db.insert('medicines', {
      userId: args.userId,
      name: args.name,
      dosage: args.dosage,
      instructions: args.instructions,
      prescriber: args.prescriber,
      scheduledTimes: args.scheduledTimes,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return medicineId;
  },
});

// Update a medicine
export const updateMedicine = mutation({
  args: {
    medicineId: v.id('medicines'),
    userId: v.id('users'),
    name: v.optional(v.string()),
    dosage: v.optional(v.string()),
    instructions: v.optional(v.string()),
    prescriber: v.optional(v.string()),
    scheduledTimes: v.optional(v.array(scheduleTimeValidator)),
    isActive: v.optional(v.boolean()),
    groupId: v.optional(v.id('medicineGroups')),
    // Clear optional fields
    clearInstructions: v.optional(v.boolean()),
    clearPrescriber: v.optional(v.boolean()),
    clearGroupId: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine || medicine.userId !== args.userId) {
      throw new Error('Medicine not found or unauthorized');
    }

    // If assigning to a group, verify the group belongs to the user
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group || group.userId !== args.userId) {
        throw new Error('Group not found or unauthorized');
      }
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.dosage !== undefined) updates.dosage = args.dosage;
    if (args.instructions !== undefined) updates.instructions = args.instructions;
    if (args.prescriber !== undefined) updates.prescriber = args.prescriber;
    if (args.scheduledTimes !== undefined) updates.scheduledTimes = args.scheduledTimes;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.groupId !== undefined) updates.groupId = args.groupId;

    // Handle clearing optional fields
    if (args.clearInstructions) updates.instructions = undefined;
    if (args.clearPrescriber) updates.prescriber = undefined;
    if (args.clearGroupId) updates.groupId = undefined;

    await ctx.db.patch(args.medicineId, updates);
  },
});

// Delete a medicine
export const deleteMedicine = mutation({
  args: {
    medicineId: v.id('medicines'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine || medicine.userId !== args.userId) {
      throw new Error('Medicine not found or unauthorized');
    }

    // Delete all completions for this medicine
    const completions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_medicine_date', (q) => q.eq('medicineId', args.medicineId))
      .collect();

    for (const completion of completions) {
      await ctx.db.delete(completion._id);
    }

    // Delete the medicine
    await ctx.db.delete(args.medicineId);
  },
});

// Helper to calculate XP for a medicine dose
function calculateMedicineXp(
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

// Helper to get user's medicine streak
async function getMedicineStreak(ctx: MutationCtx, userId: Id<'users'>): Promise<number> {
  const progress = await ctx.db
    .query('userProgress')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first();
  return progress?.medicineStreak ?? 0;
}

// Mark medicine as taken
export const markMedicineTaken = mutation({
  args: {
    userId: v.id('users'),
    medicineId: v.id('medicines'),
    date: v.string(),
    scheduledTime: v.string(),
    notes: v.optional(v.string()),
    skipGamification: v.optional(v.boolean()), // For backfilling past dates
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine || medicine.userId !== args.userId) {
      throw new Error('Medicine not found or unauthorized');
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const isToday = args.date === today;

    // Check for existing completion
    const existingCompletions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_medicine_date', (q) =>
        q.eq('medicineId', args.medicineId).eq('date', args.date)
      )
      .collect();

    const existingCompletion = existingCompletions.find(
      (c) => c.scheduledTime === args.scheduledTime
    );

    // Calculate XP (only for today and if not skipping gamification)
    let xpAwarded = 0;
    if (isToday && !args.skipGamification) {
      const medicineStreak = await getMedicineStreak(ctx, args.userId);
      xpAwarded = calculateMedicineXp(args.scheduledTime, now, medicineStreak, false);
    }

    let completionId;
    if (existingCompletion) {
      // Don't double-award XP if already taken
      if (existingCompletion.status === 'taken') {
        return { completionId: existingCompletion._id, xpAwarded: 0, hpHealed: 0 };
      }
      // Update existing completion
      await ctx.db.patch(existingCompletion._id, {
        status: 'taken',
        takenAt: now,
        notes: args.notes,
        xpAwarded: xpAwarded > 0 ? xpAwarded : undefined,
      });
      completionId = existingCompletion._id;
    } else {
      // Create new completion
      completionId = await ctx.db.insert('medicineCompletions', {
        userId: args.userId,
        medicineId: args.medicineId,
        date: args.date,
        scheduledTime: args.scheduledTime,
        status: 'taken',
        takenAt: now,
        notes: args.notes,
        xpAwarded: xpAwarded > 0 ? xpAwarded : undefined,
      });
    }

    // Award XP and HP (only for today)
    let hpHealed = 0;
    if (isToday && xpAwarded > 0 && !args.skipGamification) {
      hpHealed = MEDICINE_CONFIG.HP_HEAL;

      // Update user progress
      const progress = await ctx.db
        .query('userProgress')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();

      if (progress) {
        const newTotalXp = progress.totalXp + xpAwarded;
        const newLevel = computeLevel(newTotalXp);
        const newHp = Math.min((progress.currentHp ?? 100) + hpHealed, progress.maxHp ?? 100);
        const totalMedicinesTaken = (progress.totalMedicinesTaken ?? 0) + 1;

        // Track today's medicine XP
        let todayMedicineXp = progress.todayMedicineXp ?? 0;
        if (progress.lastMedicineXpDate !== today) {
          todayMedicineXp = xpAwarded;
        } else {
          todayMedicineXp += xpAwarded;
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
          todayMedicineXp,
          lastMedicineXpDate: today,
          weeklyBossProgress,
        });
      }
    }

    return { completionId, xpAwarded, hpHealed };
  },
});

// Mark medicine as skipped
export const markMedicineSkipped = mutation({
  args: {
    userId: v.id('users'),
    medicineId: v.id('medicines'),
    date: v.string(),
    scheduledTime: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine || medicine.userId !== args.userId) {
      throw new Error('Medicine not found or unauthorized');
    }

    // Check for existing completion
    const existingCompletions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_medicine_date', (q) =>
        q.eq('medicineId', args.medicineId).eq('date', args.date)
      )
      .collect();

    const existingCompletion = existingCompletions.find(
      (c) => c.scheduledTime === args.scheduledTime
    );

    if (existingCompletion) {
      // Update existing completion
      await ctx.db.patch(existingCompletion._id, {
        status: 'skipped',
        takenAt: undefined,
        notes: args.notes,
      });
      return existingCompletion._id;
    } else {
      // Create new completion
      const completionId = await ctx.db.insert('medicineCompletions', {
        userId: args.userId,
        medicineId: args.medicineId,
        date: args.date,
        scheduledTime: args.scheduledTime,
        status: 'skipped',
        notes: args.notes,
      });
      return completionId;
    }
  },
});

// Undo medicine completion (reset to pending)
export const undoMedicineCompletion = mutation({
  args: {
    userId: v.id('users'),
    medicineId: v.id('medicines'),
    date: v.string(),
    scheduledTime: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine || medicine.userId !== args.userId) {
      throw new Error('Medicine not found or unauthorized');
    }

    // Find and delete the completion
    const existingCompletions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_medicine_date', (q) =>
        q.eq('medicineId', args.medicineId).eq('date', args.date)
      )
      .collect();

    const existingCompletion = existingCompletions.find(
      (c) => c.scheduledTime === args.scheduledTime
    );

    if (existingCompletion) {
      await ctx.db.delete(existingCompletion._id);
    }
  },
});

// Get adherence statistics for a medicine
export const getMedicineAdherence = query({
  args: {
    userId: v.id('users'),
    medicineId: v.id('medicines'),
    days: v.number(), // Number of days to look back
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine || medicine.userId !== args.userId) {
      return null;
    }

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - args.days);

    const completions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_medicine_date', (q) => q.eq('medicineId', args.medicineId))
      .collect();

    const startDateStr = startDate.toISOString().split('T')[0];
    const filteredCompletions = completions.filter((c) => c.date >= startDateStr);

    const taken = filteredCompletions.filter((c) => c.status === 'taken').length;
    const skipped = filteredCompletions.filter((c) => c.status === 'skipped').length;
    const timesPerDay = medicine.scheduledTimes.length;
    const expectedTotal = args.days * timesPerDay;

    return {
      taken,
      skipped,
      missed: Math.max(0, expectedTotal - taken - skipped),
      total: expectedTotal,
      adherenceRate: expectedTotal > 0 ? (taken / expectedTotal) * 100 : 0,
    };
  },
});

// ============================================
// Medicine Groups
// ============================================

// Get all medicine groups for a user
export const getMedicineGroups = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const groups = await ctx.db
      .query('medicineGroups')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return groups;
  },
});

// Create a new medicine group
export const createMedicineGroup = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const groupId = await ctx.db.insert('medicineGroups', {
      userId: args.userId,
      name: args.name.trim(),
      createdAt: new Date().toISOString(),
    });

    return groupId;
  },
});

// Delete a medicine group (unlinks medicines but doesn't delete them)
export const deleteMedicineGroup = mutation({
  args: {
    groupId: v.id('medicineGroups'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const group = await ctx.db.get(args.groupId);
    if (!group || group.userId !== args.userId) {
      throw new Error('Group not found or unauthorized');
    }

    // Unlink all medicines from this group
    // Using by_user index and filtering because groupId is optional
    const allMedicines = await ctx.db
      .query('medicines')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const medicinesInGroup = allMedicines.filter((m) => m.groupId === args.groupId);

    for (const medicine of medicinesInGroup) {
      await ctx.db.patch(medicine._id, { groupId: undefined });
    }

    // Delete the group
    await ctx.db.delete(args.groupId);
  },
});

// Update medicine's group assignment
export const assignMedicineToGroup = mutation({
  args: {
    medicineId: v.id('medicines'),
    groupId: v.optional(v.id('medicineGroups')),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine || medicine.userId !== args.userId) {
      throw new Error('Medicine not found or unauthorized');
    }

    // If assigning to a group, verify the group belongs to the user
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group || group.userId !== args.userId) {
        throw new Error('Group not found or unauthorized');
      }
    }

    await ctx.db.patch(args.medicineId, {
      groupId: args.groupId,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Mark all medicines in a group as taken (for all their scheduled times)
export const markGroupTaken = mutation({
  args: {
    groupId: v.id('medicineGroups'),
    date: v.string(),
    scheduledTime: v.string(), // Kept for API compatibility but not used for filtering
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const group = await ctx.db.get(args.groupId);
    if (!group || group.userId !== args.userId) {
      throw new Error('Group not found or unauthorized');
    }

    // Get all medicines for this user and filter by group
    const allMedicines = await ctx.db
      .query('medicines')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Filter to all active medicines in this group
    const medicinesInGroup = allMedicines.filter((m) => m.groupId === args.groupId && m.isActive);

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const isToday = args.date === today;
    let markedCount = 0;
    let totalXpAwarded = 0;

    // Get current medicine streak for XP calculation
    const medicineStreak = await getMedicineStreak(ctx, args.userId);

    // Mark each medicine as taken for ALL its scheduled times
    for (const medicine of medicinesInGroup) {
      for (const timeSlot of medicine.scheduledTimes) {
        // Check for existing completion for this specific time
        const existingCompletions = await ctx.db
          .query('medicineCompletions')
          .withIndex('by_medicine_date', (q) =>
            q.eq('medicineId', medicine._id).eq('date', args.date)
          )
          .collect();

        const existingCompletion = existingCompletions.find(
          (c) => c.scheduledTime === timeSlot.time
        );

        // Skip if already taken (don't double count)
        if (existingCompletion?.status === 'taken') {
          continue;
        }

        // Calculate XP with group bonus (only for today)
        let xpAwarded = 0;
        if (isToday) {
          xpAwarded = calculateMedicineXp(timeSlot.time, now, medicineStreak, true);
          totalXpAwarded += xpAwarded;
        }

        if (existingCompletion) {
          // Update existing completion
          await ctx.db.patch(existingCompletion._id, {
            status: 'taken',
            takenAt: now,
            xpAwarded: xpAwarded > 0 ? xpAwarded : undefined,
          });
        } else {
          // Create new completion
          await ctx.db.insert('medicineCompletions', {
            userId: args.userId,
            medicineId: medicine._id,
            date: args.date,
            scheduledTime: timeSlot.time,
            status: 'taken',
            takenAt: now,
            xpAwarded: xpAwarded > 0 ? xpAwarded : undefined,
          });
        }
        markedCount++;
      }
    }

    // Award XP and HP for all medicines (only for today)
    let totalHpHealed = 0;
    if (isToday && markedCount > 0) {
      totalHpHealed = markedCount * MEDICINE_CONFIG.HP_HEAL;

      const progress = await ctx.db
        .query('userProgress')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .first();

      if (progress) {
        const newTotalXp = progress.totalXp + totalXpAwarded;
        const newLevel = computeLevel(newTotalXp);
        const newHp = Math.min((progress.currentHp ?? 100) + totalHpHealed, progress.maxHp ?? 100);
        const totalMedicinesTaken = (progress.totalMedicinesTaken ?? 0) + markedCount;
        const totalGroupTakeAllUsed = (progress.totalGroupTakeAllUsed ?? 0) + 1;

        // Track today's medicine XP
        let todayMedicineXp = progress.todayMedicineXp ?? 0;
        if (progress.lastMedicineXpDate !== today) {
          todayMedicineXp = totalXpAwarded;
        } else {
          todayMedicineXp += totalXpAwarded;
        }

        // Update weekly boss damage (1 per medicine)
        let weeklyBossProgress = progress.weeklyBossProgress;
        if (weeklyBossProgress && !weeklyBossProgress.defeated) {
          weeklyBossProgress = {
            ...weeklyBossProgress,
            currentDamage: weeklyBossProgress.currentDamage + markedCount,
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
      }
    }

    return { markedCount, totalXpAwarded, totalHpHealed };
  },
});

// Mark all medicines in a group as skipped (for all their scheduled times)
export const markGroupSkipped = mutation({
  args: {
    groupId: v.id('medicineGroups'),
    date: v.string(),
    scheduledTime: v.string(), // Kept for API compatibility but not used for filtering
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const group = await ctx.db.get(args.groupId);
    if (!group || group.userId !== args.userId) {
      throw new Error('Group not found or unauthorized');
    }

    // Get all medicines for this user and filter by group
    const allMedicines = await ctx.db
      .query('medicines')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Filter to all active medicines in this group
    const medicinesInGroup = allMedicines.filter((m) => m.groupId === args.groupId && m.isActive);

    let markedCount = 0;

    // Mark each medicine as skipped for ALL its scheduled times
    for (const medicine of medicinesInGroup) {
      for (const timeSlot of medicine.scheduledTimes) {
        // Check for existing completion for this specific time
        const existingCompletions = await ctx.db
          .query('medicineCompletions')
          .withIndex('by_medicine_date', (q) =>
            q.eq('medicineId', medicine._id).eq('date', args.date)
          )
          .collect();

        const existingCompletion = existingCompletions.find(
          (c) => c.scheduledTime === timeSlot.time
        );

        if (existingCompletion) {
          // Update existing completion
          await ctx.db.patch(existingCompletion._id, {
            status: 'skipped',
            takenAt: undefined,
          });
        } else {
          // Create new completion
          await ctx.db.insert('medicineCompletions', {
            userId: args.userId,
            medicineId: medicine._id,
            date: args.date,
            scheduledTime: timeSlot.time,
            status: 'skipped',
          });
        }
        markedCount++;
      }
    }

    return { markedCount };
  },
});

// Snooze a medicine reminder
export const snoozeMedicineReminder = mutation({
  args: {
    userId: v.id('users'),
    medicineId: v.id('medicines'),
    date: v.string(),
    scheduledTime: v.string(),
    snoozeMinutes: v.optional(v.number()), // Default 15 minutes
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const medicine = await ctx.db.get(args.medicineId);
    if (!medicine || medicine.userId !== args.userId) {
      throw new Error('Medicine not found or unauthorized');
    }

    const snoozeMinutes = args.snoozeMinutes ?? 15;
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();

    // Find or create the completion record
    const existingCompletions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_medicine_date', (q) =>
        q.eq('medicineId', args.medicineId).eq('date', args.date)
      )
      .collect();

    const existingCompletion = existingCompletions.find(
      (c) => c.scheduledTime === args.scheduledTime
    );

    if (existingCompletion) {
      await ctx.db.patch(existingCompletion._id, {
        snoozedUntil,
      });
    } else {
      // Create a pending completion with snooze
      await ctx.db.insert('medicineCompletions', {
        userId: args.userId,
        medicineId: args.medicineId,
        date: args.date,
        scheduledTime: args.scheduledTime,
        status: 'pending',
        snoozedUntil,
      });
    }

    return { snoozedUntil, snoozeMinutes };
  },
});

// Check and update medicine streak at end of day
export const checkDailyMedicineAdherence = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const today = new Date().toISOString().split('T')[0];

    // Get all active medicines
    const medicines = await ctx.db
      .query('medicines')
      .withIndex('by_user_active', (q) => q.eq('userId', args.userId).eq('isActive', true))
      .collect();

    if (medicines.length === 0) {
      return { isPerfectDay: true, streak: 0 };
    }

    // Get today's completions
    const completions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_user_date', (q) => q.eq('userId', args.userId).eq('date', today))
      .collect();

    // Count expected doses and taken doses
    let expectedDoses = 0;
    let takenDoses = 0;

    for (const medicine of medicines) {
      for (const schedule of medicine.scheduledTimes) {
        expectedDoses++;
        const completion = completions.find(
          (c) => c.medicineId === medicine._id && c.scheduledTime === schedule.time
        );
        if (completion?.status === 'taken') {
          takenDoses++;
        }
      }
    }

    const isPerfectDay = takenDoses === expectedDoses && expectedDoses > 0;

    // Update streak
    const progress = await ctx.db
      .query('userProgress')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();

    if (!progress) {
      return { isPerfectDay, streak: 0 };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = progress.medicineStreak ?? 0;

    if (isPerfectDay) {
      if (progress.lastMedicineStreakDate === yesterdayStr) {
        newStreak += 1;
      } else if (progress.lastMedicineStreakDate !== today) {
        newStreak = 1;
      }

      // Award perfect day HP bonus
      const newHp = Math.min(
        (progress.currentHp ?? 100) + MEDICINE_CONFIG.PERFECT_DAY_HP,
        progress.maxHp ?? 100
      );

      await ctx.db.patch(progress._id, {
        medicineStreak: newStreak,
        lastMedicineStreakDate: today,
        currentHp: newHp,
      });

      // Check achievements
      const currentAchievements = progress.achievements || [];
      const unlockedAchievements: string[] = [];

      if (!currentAchievements.includes('med-consistent-7') && newStreak >= 7) {
        unlockedAchievements.push('med-consistent-7');
      }
      if (!currentAchievements.includes('med-consistent-30') && newStreak >= 30) {
        unlockedAchievements.push('med-consistent-30');
      }
      if (!currentAchievements.includes('med-perfect-week') && newStreak >= 7) {
        unlockedAchievements.push('med-perfect-week');
      }

      if (unlockedAchievements.length > 0) {
        await ctx.db.patch(progress._id, {
          achievements: [...currentAchievements, ...unlockedAchievements],
        });
      }
    } else if (progress.lastMedicineStreakDate !== today) {
      // Break streak
      await ctx.db.patch(progress._id, {
        medicineStreak: 0,
      });
      newStreak = 0;
    }

    return { isPerfectDay, streak: newStreak, takenDoses, expectedDoses };
  },
});

// Get today's schedule with group information
export const getTodayScheduleWithGroups = query({
  args: { userId: v.id('users'), date: v.string() },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    // Get active medicines
    const medicines = await ctx.db
      .query('medicines')
      .withIndex('by_user_active', (q) => q.eq('userId', args.userId).eq('isActive', true))
      .collect();

    // Get all groups for this user
    const groups = await ctx.db
      .query('medicineGroups')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Create a map of group names by ID
    const groupMap = new Map<string, string>();
    for (const group of groups) {
      groupMap.set(group._id, group.name);
    }

    // Get completions for today
    const completions = await ctx.db
      .query('medicineCompletions')
      .withIndex('by_user_date', (q) => q.eq('userId', args.userId).eq('date', args.date))
      .collect();

    // Create a map of completions by medicineId + scheduledTime
    const completionMap = new Map<string, (typeof completions)[0]>();
    for (const completion of completions) {
      const key = `${completion.medicineId}_${completion.scheduledTime}`;
      completionMap.set(key, completion);
    }

    // Build schedule with status and group info
    const schedule: {
      medicineId: string;
      medicineName: string;
      dosage: string;
      instructions?: string;
      scheduledTime: string;
      label: string;
      status: 'taken' | 'skipped' | 'pending';
      takenAt?: string;
      notes?: string;
      groupId?: string;
      groupName?: string;
    }[] = [];

    for (const medicine of medicines) {
      for (const timeSlot of medicine.scheduledTimes) {
        const key = `${medicine._id}_${timeSlot.time}`;
        const completion = completionMap.get(key);

        schedule.push({
          medicineId: medicine._id,
          medicineName: medicine.name,
          dosage: medicine.dosage,
          instructions: medicine.instructions,
          scheduledTime: timeSlot.time,
          label: timeSlot.label,
          status: completion?.status ?? 'pending',
          takenAt: completion?.takenAt,
          notes: completion?.notes,
          groupId: medicine.groupId,
          groupName: medicine.groupId ? groupMap.get(medicine.groupId) : undefined,
        });
      }
    }

    // Sort by scheduled time
    schedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    return schedule;
  },
});
