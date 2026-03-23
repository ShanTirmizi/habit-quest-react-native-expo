import {
  CoachingContext,
  HabitSummary,
  JournalAnalysis,
  RecurringBlocker,
  GratitudeTheme,
  MindsetIndicators,
  GoalSummary,
} from './types';

// ============================================
// Input Data Types (matching mobile app shapes)
// ============================================

interface Habit {
  id: string;
  name: string;
  category: string;
  streak: number;
  completedDates: string[];
  timeOfDay?: string;
  createdAt: string;
  chainedToHabitId?: string;
}

interface JournalEntry {
  _creationTime: number;
  entryDate?: string;
  mood?: string;
  gratitudes: string[];
  achievements?: string[];
  improvement?: string;
  content?: string;
  entryType?: string;
}

interface Progress {
  level: number;
  totalXp: number;
  currentHp: number;
  maxHp: number;
}

interface Goal {
  _id: string;
  title: string;
  status: string;
  targetDate: string;
  milestones?: Array<{ completed: boolean }>;
  currentPhaseIndex?: number;
  phases?: Array<{ description?: string; weekEnd?: number }>;
  linkedHabitIds?: string[];
}

// ============================================
// MAIN DATA PREPARATION FUNCTION
// ============================================

export function prepareCoachingContext(
  habits: Habit[],
  progress: Progress,
  entries: JournalEntry[],
  goals?: Goal[]
): CoachingContext {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calculate days since first habit
  const firstHabitDate =
    habits.length > 0
      ? new Date(
          Math.min(...habits.map((h) => new Date(h.createdAt).getTime()))
        )
      : today;
  const daysSinceFirstHabit = Math.floor(
    (today.getTime() - firstHabitDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Sort entries by creation time (most recent first)
  const sortedEntries = [...entries].sort(
    (a, b) => b._creationTime - a._creationTime
  );

  // Prepare habit summaries
  const habitSummaries = prepareHabitSummaries(habits, today);

  // Calculate category breakdown
  const categoryBreakdown = calculateCategoryBreakdown(habits);

  // Calculate day of week performance
  const dayOfWeekPerformance = calculateDayOfWeekPerformance(habits);

  // Calculate time of day performance
  const timeOfDayPerformance = calculateTimeOfDayPerformance(habits);

  // Find habit correlations
  const habitCorrelations = findHabitCorrelations(habits);

  // Analyze mood trends
  const moodAnalysis = analyzeMoodTrends(sortedEntries);

  // Find recent streak breaks
  const recentStreakBreaks = findRecentStreakBreaks(habits);

  // Deep journal analysis
  const journalAnalysis = analyzeJournals(sortedEntries, habits);

  // Calculate today's completion
  const todayCompletionRate = calculateDayCompletion(habits, todayStr);

  // Journaling streak
  const journalingStreak = calculateJournalingStreak(sortedEntries);

  // Prepare goal summaries if goals are provided
  const goalSummaries = goals
    ? prepareGoalSummaries(goals, habits, today)
    : [];

  return {
    daysSinceFirstHabit,
    totalCompletions: habits.reduce(
      (sum, h) => sum + h.completedDates.length,
      0
    ),
    currentLevel: progress.level,
    totalXp: progress.totalXp,
    currentHp: progress.currentHp,
    maxHp: progress.maxHp,

    habits: habitSummaries,

    categoryBreakdown,
    dayOfWeekPerformance,
    timeOfDayPerformance,
    habitCorrelations,

    moodTrend: moodAnalysis.trend,
    averageMood: moodAnalysis.average,
    daysWithMoodTracked: moodAnalysis.daysTracked,

    recentStreakBreaks,

    journalAnalysis,

    todayCompletionRate,
    journalingStreak,

    goals: goalSummaries,
  };
}

// ============================================
// HABIT ANALYSIS
// ============================================

function prepareHabitSummaries(habits: Habit[], today: Date): HabitSummary[] {
  const todayStr = today.toISOString().split('T')[0];

  return habits.map((habit) => {
    const createdDate = new Date(habit.createdAt);
    const createdDaysAgo = Math.floor(
      (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 30-day completion rate
    const last30Days = getLast30Days(today);
    const completions30 = last30Days.filter((d) =>
      habit.completedDates.includes(d)
    ).length;
    const completionRate30Days = Math.round((completions30 / 30) * 100);

    // 7-day completion rate
    const last7Days = last30Days.slice(0, 7);
    const completions7 = last7Days.filter((d) =>
      habit.completedDates.includes(d)
    ).length;
    const completionRate7Days = Math.round((completions7 / 7) * 100);

    // Last completed
    const sortedDates = [...habit.completedDates].sort().reverse();
    const lastCompleted = sortedDates[0];
    const lastCompletedDaysAgo = lastCompleted
      ? Math.floor(
          (today.getTime() - new Date(lastCompleted).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    // Find chained habit name
    const chainedToHabit = habit.chainedToHabitId
      ? habits.find((h) => h.id === habit.chainedToHabitId)
      : null;

    return {
      id: habit.id,
      name: habit.name,
      category: habit.category,
      streak: habit.streak,
      lifetimeCompletions: habit.completedDates.length,
      completionRate30Days,
      completionRate7Days,
      timeOfDay: habit.timeOfDay,
      isChained: !!habit.chainedToHabitId,
      chainedToName: chainedToHabit?.name,
      createdDaysAgo,
      lastCompletedDaysAgo,
      completedToday: habit.completedDates.includes(todayStr),
    };
  });
}

function calculateCategoryBreakdown(
  habits: Habit[]
): Record<string, { count: number; avgCompletion: number }> {
  const categories = ['health', 'career', 'mind', 'life'] as const;
  const breakdown: Record<string, { count: number; avgCompletion: number }> =
    {};

  for (const cat of categories) {
    const categoryHabits = habits.filter((h) => h.category === cat);
    const count = categoryHabits.length;
    const avgCompletion =
      count > 0
        ? Math.round(
            (categoryHabits.reduce((sum, h) => {
              const rate =
                h.completedDates.length /
                Math.max(1, getDaysSinceCreation(h));
              return sum + rate;
            }, 0) /
              count) *
              100
          )
        : 0;

    breakdown[cat] = { count, avgCompletion };
  }

  return breakdown;
}

function calculateDayOfWeekPerformance(
  habits: Habit[]
): Record<string, number> {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const dayCounts: number[] = Array(7).fill(0);
  const dayTotals: number[] = Array(7).fill(0);

  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayOfWeek = checkDate.getDay();

    const completed = habits.filter((h) =>
      h.completedDates.includes(dateStr)
    ).length;
    dayCounts[dayOfWeek] += completed;
    dayTotals[dayOfWeek] += habits.length;
  }

  const performance: Record<string, number> = {};
  days.forEach((day, i) => {
    performance[day] =
      dayTotals[i] > 0
        ? Math.round((dayCounts[i] / dayTotals[i]) * 100)
        : 0;
  });

  return performance;
}

function calculateTimeOfDayPerformance(
  habits: Habit[]
): Record<string, number> {
  const times = ['morning', 'afternoon', 'evening', 'anytime'];
  const performance: Record<string, number> = {};

  for (const time of times) {
    const timeHabits = habits.filter(
      (h) => (h.timeOfDay || 'anytime') === time
    );
    if (timeHabits.length === 0) {
      performance[time] = 0;
      continue;
    }

    const avgRate =
      timeHabits.reduce((sum, h) => {
        const days = getDaysSinceCreation(h);
        return sum + h.completedDates.length / Math.max(1, days);
      }, 0) / timeHabits.length;

    performance[time] = Math.round(avgRate * 100);
  }

  return performance;
}

function findHabitCorrelations(
  habits: Habit[]
): Array<{ habitA: string; habitB: string; rate: number }> {
  const correlations: Array<{
    habitA: string;
    habitB: string;
    rate: number;
  }> = [];

  for (let i = 0; i < habits.length; i++) {
    for (let j = i + 1; j < habits.length; j++) {
      const habitA = habits[i];
      const habitB = habits[j];

      const commonDates = habitA.completedDates.filter((d) =>
        habitB.completedDates.includes(d)
      );
      const totalDates = new Set([
        ...habitA.completedDates,
        ...habitB.completedDates,
      ]).size;

      if (totalDates >= 7) {
        const rate = Math.round((commonDates.length / totalDates) * 100);
        if (rate >= 50) {
          correlations.push({
            habitA: habitA.name,
            habitB: habitB.name,
            rate,
          });
        }
      }
    }
  }

  return correlations.sort((a, b) => b.rate - a.rate).slice(0, 5);
}

function findRecentStreakBreaks(
  habits: Habit[]
): Array<{
  habitName: string;
  daysAgo: number;
  previousStreak: number;
  dayOfWeek: string;
}> {
  const breaks: Array<{
    habitName: string;
    daysAgo: number;
    previousStreak: number;
    dayOfWeek: string;
  }> = [];
  const today = new Date();
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  for (const habit of habits) {
    if (habit.completedDates.length < 3) continue;

    const sortedDates = [...habit.completedDates].sort();

    // Look for gaps in the last 30 days
    for (let i = 1; i < sortedDates.length && i < 30; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const gap = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (gap > 1) {
        // Found a break
        const breakDate = new Date(prevDate);
        breakDate.setDate(breakDate.getDate() + 1);
        const daysAgo = Math.floor(
          (today.getTime() - breakDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysAgo <= 14) {
          // Count streak before break
          let streakBeforeBreak = 1;
          for (let j = i - 2; j >= 0; j--) {
            const d1 = new Date(sortedDates[j]);
            const d2 = new Date(sortedDates[j + 1]);
            if (
              Math.floor(
                (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
              ) === 1
            ) {
              streakBeforeBreak++;
            } else {
              break;
            }
          }

          breaks.push({
            habitName: habit.name,
            daysAgo,
            previousStreak: streakBeforeBreak,
            dayOfWeek: days[breakDate.getDay()],
          });
        }
      }
    }
  }

  return breaks.sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 5);
}

// ============================================
// MOOD ANALYSIS
// ============================================

function analyzeMoodTrends(entries: JournalEntry[]): {
  trend: 'improving' | 'stable' | 'declining';
  average: number;
  daysTracked: number;
} {
  const moodValues: Record<string, number> = {
    great: 4,
    good: 3,
    okay: 2,
    rough: 1,
  };

  const entriesWithMood = entries.filter((e) => e.mood).slice(0, 30);
  const daysTracked = entriesWithMood.length;

  if (daysTracked < 5) {
    return { trend: 'stable', average: 0, daysTracked };
  }

  const values = entriesWithMood.map((e) => moodValues[e.mood!]);
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  // Calculate trend (first half vs second half)
  // Entries are sorted most-recent-first, so secondHalf = more recent
  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(half); // older entries
  const secondHalf = values.slice(0, half); // newer entries
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const diff = secondAvg - firstAvg;

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (diff > 0.3) trend = 'improving';
  else if (diff < -0.3) trend = 'declining';

  return {
    trend,
    average: Math.round(average * 100) / 100,
    daysTracked,
  };
}

// ============================================
// DEEP JOURNAL ANALYSIS
// ============================================

function analyzeJournals(
  entries: JournalEntry[],
  habits: Habit[]
): JournalAnalysis {
  const recentEntries = entries.slice(0, 14).map((entry) => {
    const entryDate =
      entry.entryDate ||
      new Date(entry._creationTime).toISOString().split('T')[0];
    const habitsCompletedThatDay = habits.filter((h) =>
      h.completedDates.includes(entryDate)
    ).length;
    const completionRate =
      habits.length > 0
        ? Math.round((habitsCompletedThatDay / habits.length) * 100)
        : 0;

    return {
      date: entryDate,
      mood: entry.mood || null,
      gratitudes: entry.gratitudes || [],
      achievements: entry.achievements || [],
      improvement: entry.improvement,
      habitCompletionThatDay: completionRate,
    };
  });

  const recurringBlockers = extractBlockers(entries, habits);
  const gratitudeThemes = extractGratitudeThemes(entries);
  const mindsetIndicators = analyzeMindset(entries);
  const unmetDesires = extractUnmetDesires(entries);
  const { roughDayThemes, greatDayThemes } = extractMoodThemes(entries);

  return {
    recentEntries,
    recurringBlockers,
    gratitudeThemes,
    mindsetIndicators,
    unmetDesires,
    roughDayThemes,
    greatDayThemes,
    totalEntriesAnalyzed: entries.length,
  };
}

function extractBlockers(
  entries: JournalEntry[],
  habits: Habit[]
): RecurringBlocker[] {
  const blockerKeywords: Record<string, string[]> = {
    tired: [
      'tired',
      'exhausted',
      'fatigue',
      'sleep',
      'rest',
      'drained',
      'low energy',
    ],
    stressed: [
      'stress',
      'anxious',
      'overwhelm',
      'pressure',
      'deadline',
      'worried',
    ],
    busy: ['busy', 'time', 'schedule', 'hectic', 'rush', 'packed', 'no time'],
    distracted: [
      'distract',
      'focus',
      'phone',
      'social media',
      'procrastinat',
    ],
    unmotivated: [
      'motivat',
      'lazy',
      'dont feel like',
      "don't feel like",
      'cant be bothered',
    ],
    sick: ['sick', 'ill', 'unwell', 'headache', 'pain', 'doctor'],
    work: ['work', 'job', 'office', 'boss', 'meeting', 'project'],
  };

  const blockerCounts: Record<
    string,
    { count: number; examples: string[]; completionDrops: number[] }
  > = {};

  for (const entry of entries.slice(0, 30)) {
    const textToSearch = [
      entry.improvement || '',
      entry.content || '',
      ...(entry.achievements || []),
    ]
      .join(' ')
      .toLowerCase();

    const entryDate =
      entry.entryDate ||
      new Date(entry._creationTime).toISOString().split('T')[0];
    const completionRate =
      habits.length > 0
        ? habits.filter((h) => h.completedDates.includes(entryDate)).length /
          habits.length
        : 1;

    for (const [blocker, keywords] of Object.entries(blockerKeywords)) {
      if (keywords.some((kw) => textToSearch.includes(kw))) {
        if (!blockerCounts[blocker]) {
          blockerCounts[blocker] = {
            count: 0,
            examples: [],
            completionDrops: [],
          };
        }
        blockerCounts[blocker].count++;
        blockerCounts[blocker].completionDrops.push(completionRate);
        if (
          blockerCounts[blocker].examples.length < 2 &&
          entry.improvement
        ) {
          blockerCounts[blocker].examples.push(
            entry.improvement.slice(0, 100)
          );
        }
      }
    }
  }

  // Calculate average completion when blocker appears vs overall
  const overallCompletion =
    habits.length > 0
      ? habits.reduce((sum, h) => sum + h.completedDates.length, 0) /
        (habits.length *
          Math.max(1, getDaysSinceCreation(habits[0])))
      : 0.5;

  return Object.entries(blockerCounts)
    .filter(([, data]) => data.count >= 2)
    .map(([theme, data]) => {
      const avgWhenPresent =
        data.completionDrops.reduce((a, b) => a + b, 0) /
        data.completionDrops.length;
      const drop = Math.round((overallCompletion - avgWhenPresent) * 100);

      return {
        theme,
        frequency: data.count,
        correlatedHabitDrop: Math.max(0, drop),
        examples: data.examples,
      };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
}

function extractGratitudeThemes(entries: JournalEntry[]): GratitudeTheme[] {
  const themeKeywords: Record<string, string[]> = {
    family: [
      'family',
      'kid',
      'child',
      'spouse',
      'wife',
      'husband',
      'parent',
      'mom',
      'dad',
      'son',
      'daughter',
    ],
    health: [
      'health',
      'gym',
      'exercise',
      'workout',
      'body',
      'energy',
      'sleep',
      'rest',
    ],
    work: [
      'work',
      'job',
      'career',
      'project',
      'colleague',
      'achievement',
      'success',
      'promotion',
    ],
    relationships: [
      'friend',
      'love',
      'partner',
      'relationship',
      'connection',
      'support',
    ],
    nature: [
      'nature',
      'weather',
      'sun',
      'walk',
      'outside',
      'beautiful',
      'park',
    ],
    growth: [
      'learn',
      'grow',
      'improve',
      'progress',
      'skill',
      'knowledge',
      'book',
      'read',
    ],
    simple_pleasures: [
      'coffee',
      'meal',
      'food',
      'music',
      'movie',
      'relax',
      'quiet',
      'moment',
    ],
  };

  const themeCounts: Record<string, { total: number; onGoodDays: number }> =
    {};

  for (const entry of entries.slice(0, 30)) {
    const gratitudeText = [...(entry.gratitudes || []), ...(entry.achievements || [])].join(' ').toLowerCase();
    const isGoodDay = entry.mood === 'great' || entry.mood === 'good';

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some((kw) => gratitudeText.includes(kw))) {
        if (!themeCounts[theme]) {
          themeCounts[theme] = { total: 0, onGoodDays: 0 };
        }
        themeCounts[theme].total++;
        if (isGoodDay) themeCounts[theme].onGoodDays++;
      }
    }
  }

  return Object.entries(themeCounts)
    .filter(([, data]) => data.total >= 2)
    .map(([theme, data]) => ({
      theme,
      frequency: data.total,
      appearsOnGoodMoodDays: Math.round(
        (data.onGoodDays / data.total) * 100
      ),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
}

function analyzeMindset(entries: JournalEntry[]): MindsetIndicators {
  const growthPhrases = [
    'learning',
    'improving',
    'getting better',
    'progress',
    'try again',
    'next time',
    'opportunity',
    'challenge myself',
    'grow',
    'develop',
  ];
  const fixedPhrases = [
    "can't",
    'always fail',
    'never good at',
    'not capable',
    'impossible',
    "i'm bad at",
    'give up',
    "what's the point",
    'hopeless',
  ];

  let growthCount = 0;
  let fixedCount = 0;

  for (const entry of entries.slice(0, 30)) {
    const text = [entry.content || '', entry.improvement || '', ...(entry.achievements || [])]
      .join(' ')
      .toLowerCase();

    for (const phrase of growthPhrases) {
      if (text.includes(phrase)) {
        growthCount++;
        break;
      }
    }

    for (const phrase of fixedPhrases) {
      if (text.includes(phrase)) {
        fixedCount++;
        break;
      }
    }
  }

  let selfCompassionLevel: 'high' | 'medium' | 'low' = 'medium';
  if (growthCount > fixedCount * 2) selfCompassionLevel = 'high';
  else if (fixedCount > growthCount * 2) selfCompassionLevel = 'low';

  return {
    growthMindsetPhrases: growthCount,
    fixedMindsetPhrases: fixedCount,
    selfCompassionLevel,
  };
}

function extractUnmetDesires(entries: JournalEntry[]): string[] {
  const wishPatterns = [
    /i wish (?:i |I )?(could |had |was |were )?(.+?)(?:\.|,|$)/gi,
    /i want to (.+?)(?:\.|,|$)/gi,
    /if only (?:i |I )?(.+?)(?:\.|,|$)/gi,
    /i need more (.+?)(?:\.|,|$)/gi,
  ];

  const desires: string[] = [];

  for (const entry of entries.slice(0, 30)) {
    const text = [entry.content || '', entry.improvement || '', ...(entry.achievements || [])].join(' ');

    for (const pattern of wishPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const desire = (match[2] || match[1]).trim();
        if (
          desire.length > 5 &&
          desire.length < 100 &&
          !desires.includes(desire)
        ) {
          desires.push(desire);
        }
      }
    }
  }

  return desires.slice(0, 5);
}

function extractMoodThemes(entries: JournalEntry[]): {
  roughDayThemes: string[];
  greatDayThemes: string[];
} {
  const roughDayTexts: string[] = [];
  const greatDayTexts: string[] = [];

  for (const entry of entries.slice(0, 30)) {
    const text = [
      ...(entry.gratitudes || []),
      ...(entry.achievements || []),
      entry.improvement || '',
      entry.content || '',
    ].join(' ');

    if (entry.mood === 'rough') {
      roughDayTexts.push(text);
    } else if (entry.mood === 'great') {
      greatDayTexts.push(text);
    }
  }

  // Simple keyword extraction
  const extractTopWords = (texts: string[]): string[] => {
    const combined = texts.join(' ').toLowerCase();
    const words = combined.split(/\W+/).filter((w) => w.length > 4);
    const counts: Record<string, number> = {};
    for (const word of words) {
      counts[word] = (counts[word] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };

  return {
    roughDayThemes: extractTopWords(roughDayTexts),
    greatDayThemes: extractTopWords(greatDayTexts),
  };
}

// ============================================
// GOAL ANALYSIS
// ============================================

function prepareGoalSummaries(
  goals: Goal[],
  habits: Habit[],
  today: Date
): GoalSummary[] {
  return goals.map((goal) => {
    // Calculate days remaining
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate milestone progress
    const milestones = goal.milestones || [];
    const completedMilestones = milestones.filter((m) => m.completed).length;
    const progress =
      milestones.length > 0
        ? Math.round((completedMilestones / milestones.length) * 100)
        : 0;

    // Get linked habits
    const linkedHabitIds = goal.linkedHabitIds || [];
    const linkedHabits = habits.filter((h) => linkedHabitIds.includes(h.id));
    const linkedHabitNames = linkedHabits.map((h) => h.name);

    // Phase information
    const phases = goal.phases || [];
    const currentPhaseIndex =
      goal.currentPhaseIndex ?? (phases.length > 0 ? 0 : null);
    const totalPhases = phases.length;

    return {
      id: goal._id,
      title: goal.title,
      status: goal.status,
      daysRemaining,
      progress,
      currentPhaseIndex,
      totalPhases,
      linkedHabitNames,
    };
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getLast30Days(today: Date): string[] {
  const days: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getDaysSinceCreation(habit: Habit): number {
  const created = new Date(habit.createdAt);
  const now = new Date();
  return Math.max(
    1,
    Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function calculateDayCompletion(habits: Habit[], dateStr: string): number {
  if (habits.length === 0) return 0;
  const completed = habits.filter((h) =>
    h.completedDates.includes(dateStr)
  ).length;
  return Math.round((completed / habits.length) * 100);
}

function calculateJournalingStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    const hasEntry = entries.some((e) => {
      const entryDate =
        e.entryDate ||
        new Date(e._creationTime).toISOString().split('T')[0];
      return entryDate === dateStr;
    });

    if (hasEntry) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}
