import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  // Auth tables from Convex Auth
  ...authTables,

  // User profiles (extends auth user)
  users: defineTable({
    // Convex auth user ID or external auth ID
    externalId: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // For anonymous users during migration
    isAnonymous: v.optional(v.boolean()),
    hasCompletedOnboarding: v.optional(v.boolean()),
    // GDPR consent
    privacyPolicyAccepted: v.optional(v.boolean()),
    privacyPolicyAcceptedAt: v.optional(v.string()),
    healthDataConsent: v.optional(v.boolean()),
    aiProcessingEnabled: v.optional(v.boolean()), // defaults to true, user can opt out
    consentVersion: v.optional(v.string()), // e.g. "1.0"
  })
    .index('by_external_id', ['externalId'])
    .index('email', ['email']),

  // User progress (XP, level, HP, achievements)
  userProgress: defineTable({
    userId: v.id('users'),
    totalXp: v.number(),
    level: v.number(),
    achievements: v.array(v.string()),
    streakFreezes: v.number(),
    lastWeeklyFreezeEarned: v.optional(v.string()),
    // HP System
    currentHp: v.number(),
    maxHp: v.number(),
    lastLoginDate: v.optional(v.string()),
    faintCount: v.number(),
    // Gamification
    activeTitle: v.optional(v.string()),
    unlockedTitles: v.optional(v.array(v.string())),
    badges: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          description: v.string(),
          icon: v.string(),
          category: v.string(),
          earnedAt: v.optional(v.string()),
        })
      )
    ),
    unlockedSkills: v.optional(
      v.array(
        v.object({
          skillId: v.string(),
          unlockedAt: v.string(),
        })
      )
    ),
    weeklyBossProgress: v.optional(
      v.object({
        bossId: v.string(),
        currentDamage: v.number(),
        defeated: v.boolean(),
        weekStart: v.string(),
      })
    ),
    completedChallenges: v.optional(v.array(v.string())),
    lastChallengeDate: v.optional(v.string()),
    totalCompletions: v.optional(v.number()),
    milestonesReached: v.optional(v.array(v.string())),
    // Journal tracking
    lastJournalXpDate: v.optional(v.string()),
    todayJournalXp: v.optional(v.number()),
    // Underworld System (failure recovery)
    inUnderworld: v.optional(v.boolean()),
    underworldStartDate: v.optional(v.string()),
    underworldDaysCompleted: v.optional(v.number()),
    underworldResurrections: v.optional(v.number()),
    // AI Coaching tracking
    lastCoachingDate: v.optional(v.string()), // "YYYY-MM-DD" - tracks when AI insights were last auto-fetched
    lastCoachingTimestamp: v.optional(v.number()), // Unix ms — exact time of last coaching API call (for rate limiting)
    lastCoachingFingerprint: v.optional(v.string()), // Hash of input data — skip Claude if unchanged
    // Memory extraction tracking
    lastMemoryExtractionDate: v.optional(v.string()), // "YYYY-MM-DD" - tracks last journal memory extraction
    memoryExtractionEntryCount: v.optional(v.number()), // Entries since last extraction
    lastPatternCheckDate: v.optional(v.string()), // "YYYY-MM-DD" - tracks last habit pattern detection
    // Holiday Mode (global pause — streaks frozen, no HP damage)
    holidayMode: v.optional(v.object({
      active: v.boolean(),
      startDate: v.string(),       // "YYYY-MM-DD"
      endDate: v.optional(v.string()), // Optional auto-end date
    })),
    // Medicine Gamification
    medicineStreak: v.optional(v.number()), // Consecutive days with 100% adherence
    lastMedicineStreakDate: v.optional(v.string()), // Last date counted for streak
    totalMedicinesTaken: v.optional(v.number()), // All-time medicine doses taken
    totalGroupTakeAllUsed: v.optional(v.number()), // Times "Take All" was used for groups
    todayMedicineXp: v.optional(v.number()), // XP earned from medicines today
    lastMedicineXpDate: v.optional(v.string()), // Date for todayMedicineXp tracking
  }).index('by_user', ['userId']),

  // Companion System
  companions: defineTable({
    userId: v.id('users'),
    name: v.string(),
    species: v.union(
      v.literal('treant'), // Health dominant
      v.literal('phoenix'), // Career dominant
      v.literal('owl'), // Mind dominant
      v.literal('keeper') // Life dominant
    ),
    evolutionStage: v.number(), // 1-4
    mood: v.union(
      v.literal('happy'),
      v.literal('content'),
      v.literal('sleepy'),
      v.literal('worried')
    ),
    totalXp: v.number(),
    lastGiftDate: v.optional(v.string()),
    gifts: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.union(v.literal('streak_freeze'), v.literal('xp_boost'), v.literal('hp_potion')),
          giftedAt: v.string(),
          claimed: v.boolean(),
        })
      )
    ),
    createdAt: v.string(),
  }).index('by_user', ['userId']),

  // Oracle Challenges
  oracleChallenges: defineTable({
    userId: v.id('users'),
    challengeText: v.string(),
    predictionBasis: v.optional(v.string()),
    xpReward: v.number(),
    expiresAt: v.string(),
    accepted: v.boolean(),
    completed: v.boolean(),
    completedAt: v.optional(v.string()),
    createdAt: v.string(),
  }).index('by_user', ['userId']),

  // Time Capsules
  timeCapsules: defineTable({
    userId: v.id('users'),
    message: v.string(),
    milestoneType: v.union(
      v.literal('30_days'),
      v.literal('90_days'),
      v.literal('365_days'),
      v.literal('custom')
    ),
    createdAt: v.string(),
    openDate: v.string(),
    opened: v.boolean(),
    openedAt: v.optional(v.string()),
  }).index('by_user', ['userId']),

  // Goals (for goal-based habit generation)
  goals: defineTable({
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal('fitness'),
      v.literal('learning'),
      v.literal('career'),
      v.literal('health'),
      v.literal('creative'),
      v.literal('financial')
    ),
    targetDate: v.string(), // ISO date
    status: v.union(
      v.literal('active'),
      v.literal('achieved'),
      v.literal('paused'),
      v.literal('abandoned')
    ),

    // Onboarding context (for AI)
    currentLevel: v.optional(
      v.union(v.literal('beginner'), v.literal('intermediate'), v.literal('advanced'))
    ),
    dailyTimeAvailable: v.optional(v.number()), // minutes
    constraints: v.optional(v.string()),
    preferences: v.optional(v.string()),

    // Progress tracking
    linkedHabitIds: v.optional(v.array(v.id('habits'))),

    // Milestones
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

    // Check-ins
    checkIns: v.optional(
      v.array(
        v.object({
          date: v.string(),
          status: v.union(
            v.literal('on_track'),
            v.literal('struggling'),
            v.literal('ahead'),
            v.literal('paused')
          ),
          note: v.optional(v.string()),
          aiAdjustments: v.optional(v.string()),
        })
      )
    ),

    // Progressive phases (for habit evolution)
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
    currentPhaseIndex: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status']),

  // Habits
  habits: defineTable({
    userId: v.id('users'),
    name: v.string(),
    category: v.union(
      v.literal('health'),
      v.literal('career'),
      v.literal('mind'),
      v.literal('life')
    ),
    xpReward: v.number(),
    streak: v.number(),
    // Goal linkage
    goalId: v.optional(v.id('goals')),
    // Scheduling
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
    restDaysUsed: v.optional(v.array(v.string())),
    // Implementation Intentions
    location: v.optional(v.string()),
    trigger: v.optional(v.string()),
    // Scientific rationale (from AI goal suggestions or manual entry)
    rationale: v.optional(v.string()),
    citation: v.optional(
      v.object({
        author: v.string(),
        year: v.number(),
        finding: v.string(),
      })
    ),
    // Notes stored inline for simplicity
    notes: v.optional(
      v.array(
        v.object({
          id: v.string(),
          date: v.string(),
          text: v.string(),
          createdAt: v.string(),
        })
      )
    ),
    // Adaptive scaling (temporary difficulty reduction)
    scaledDown: v.optional(
      v.object({
        originalName: v.string(),
        originalXp: v.number(),
        scaledAt: v.string(),
        expiresAt: v.string(), // 7 days later
      })
    ),
    sortOrder: v.optional(v.number()),
    // Temptation bundling (pair habit with a reward)
    rewardBundle: v.optional(v.string()),
    // Hibernation (pause without deleting)
    hibernatedAt: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_goal', ['goalId']),

  // Habit completions (normalized for efficient querying)
  habitCompletions: defineTable({
    userId: v.id('users'),
    habitId: v.id('habits'),
    completedDate: v.string(), // YYYY-MM-DD
  })
    .index('by_user', ['userId'])
    .index('by_habit', ['habitId'])
    .index('by_habit_date', ['habitId', 'completedDate'])
    .index('by_user_date', ['userId', 'completedDate']),

  // Side Quests
  sideQuests: defineTable({
    userId: v.id('users'),
    title: v.string(),
    description: v.optional(v.string()),
    xpReward: v.number(),
    priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    questType: v.optional(v.union(v.literal('daily'), v.literal('weekly'), v.literal('ongoing'))),
    completed: v.boolean(),
    completedAt: v.optional(v.string()),
  }).index('by_user', ['userId']),

  // Journal Entries
  journalEntries: defineTable({
    userId: v.id('users'),
    entryType: v.optional(v.union(v.literal('daily'), v.literal('weekly'))),
    gratitudes: v.array(v.string()),
    achievements: v.optional(v.array(v.string())),
    improvement: v.optional(v.string()),
    content: v.optional(v.string()),
    // Weekly reflection
    weekHighlights: v.optional(v.string()),
    weekChallenges: v.optional(v.string()),
    nextWeekGoals: v.optional(v.string()),
    // Metadata
    mood: v.optional(
      v.union(v.literal('great'), v.literal('good'), v.literal('okay'), v.literal('rough'))
    ),
    wordCount: v.number(),
    xpAwarded: v.number(),
    promptsUsed: v.optional(v.array(v.string())),
    // Entry date (for past entries) - if not set, uses _creationTime
    entryDate: v.optional(v.string()), // "YYYY-MM-DD" format
  }).index('by_user', ['userId']),

  // Chat Messages (Dr. Sage conversations)
  chatMessages: defineTable({
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    // For grouping messages into conversations
    sessionId: v.string(),
    // Tool calls executed during this message (e.g. habits/meds/quests created)
    toolCalls: v.optional(v.array(v.object({
      tool: v.string(),
      items: v.array(v.string()),
    }))),
  })
    .index('by_user', ['userId'])
    .index('by_session', ['sessionId']),

  // Push Notification Subscriptions
  pushSubscriptions: defineTable({
    userId: v.id('users'),
    // Expo push token (mobile)
    expoPushToken: v.optional(v.string()),
    // Web push subscription keys (optional, for future web support)
    endpoint: v.optional(v.string()),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
    // Notification preferences
    enabled: v.boolean(),
    morningReminder: v.boolean(), // 8-10am
    afternoonReminder: v.boolean(), // 12-2pm
    eveningReminder: v.boolean(), // 6-8pm
    // User's timezone for proper time-based delivery
    timezone: v.string(),
    // Tracking
    createdAt: v.string(),
    lastNotifiedAt: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_endpoint', ['endpoint']),

  // Medicine Groups (for grouping medications together)
  medicineGroups: defineTable({
    userId: v.id('users'),
    name: v.string(), // e.g., "Morning Stack", "Blood Pressure Meds"
    createdAt: v.string(),
  }).index('by_user', ['userId']),

  // Medicines (separate from habits - for medical adherence)
  medicines: defineTable({
    userId: v.id('users'),
    name: v.string(), // "Metformin"
    dosage: v.string(), // "500mg"
    instructions: v.optional(v.string()), // "Take with food"
    prescriber: v.optional(v.string()), // "Dr. Smith"
    groupId: v.optional(v.id('medicineGroups')), // Optional group membership

    // Schedule - multiple times per day supported
    scheduledTimes: v.array(
      v.object({
        label: v.string(), // "morning", "afternoon", "evening", "night", "custom"
        time: v.string(), // "08:00", "21:00"
        reminderEnabled: v.boolean(),
      })
    ),

    isActive: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_user_active', ['userId', 'isActive'])
    .index('by_group', ['groupId']),

  // Medicine completion/adherence tracking
  medicineCompletions: defineTable({
    userId: v.id('users'),
    medicineId: v.id('medicines'),
    date: v.string(), // "2024-02-06"
    scheduledTime: v.string(), // "08:00"
    status: v.union(v.literal('taken'), v.literal('skipped'), v.literal('pending')),
    takenAt: v.optional(v.string()), // Actual time taken (ISO string)
    notes: v.optional(v.string()),
    // Reminder tracking for escalating notifications
    reminderCount: v.optional(v.number()), // Times reminded for this dose today
    lastRemindedAt: v.optional(v.string()), // Prevent spam
    snoozedUntil: v.optional(v.string()), // Snooze expiry ISO timestamp
    // XP tracking for this dose
    xpAwarded: v.optional(v.number()), // XP given for this completion
  })
    .index('by_user', ['userId'])
    .index('by_user_date', ['userId', 'date'])
    .index('by_medicine_date', ['medicineId', 'date']),

  // Micro-Reflections (quick mood check after habit completion)
  microReflections: defineTable({
    userId: v.id('users'),
    habitId: v.id('habits'),
    mood: v.union(
      v.literal('energized'),
      v.literal('good'),
      v.literal('meh'),
      v.literal('tough')
    ),
    date: v.string(), // YYYY-MM-DD
  })
    .index('by_user', ['userId'])
    .index('by_habit', ['habitId'])
    .index('by_habit_date', ['habitId', 'date']),

  // AI Memories (learnings extracted from conversations)
  aiMemories: defineTable({
    userId: v.id('users'),
    // Type of memory
    category: v.union(
      v.literal('preference'), // User preferences (e.g., "prefers morning workouts")
      v.literal('goal'), // User goals mentioned in chat
      v.literal('blocker'), // Recurring blockers/challenges
      v.literal('motivation'), // What motivates them
      v.literal('context'), // Life context (job, family, etc.)
      v.literal('strategy'), // Strategies that work for them
      v.literal('insight') // Key insights about their patterns
    ),
    // The actual memory content
    content: v.string(),
    // Source of the memory
    source: v.union(v.literal('chat'), v.literal('journal'), v.literal('habit_pattern')),
    // Confidence level (how certain the AI is about this memory)
    confidence: v.number(), // 0-1
    // How many times this has been reinforced
    reinforcementCount: v.number(),
    // Last time this memory was relevant
    lastReferencedAt: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_category', ['userId', 'category']),
});
