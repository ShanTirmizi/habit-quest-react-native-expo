// ============================================
// AI Coaching Types
// ============================================

export interface HabitSummary {
  id: string;
  name: string;
  category: string;
  streak: number;
  lifetimeCompletions: number;
  completionRate30Days: number;
  completionRate7Days: number;
  timeOfDay?: string;
  isChained: boolean;
  chainedToName?: string;
  createdDaysAgo: number;
  lastCompletedDaysAgo: number | null;
  completedToday: boolean;
}

export interface CategoryBreakdown {
  count: number;
  avgCompletion: number;
}

export interface RecurringBlocker {
  theme: string;
  frequency: number;
  correlatedHabitDrop: number;
  examples: string[];
}

export interface GratitudeTheme {
  theme: string;
  frequency: number;
  appearsOnGoodMoodDays: number;
}

export interface MindsetIndicators {
  growthMindsetPhrases: number;
  fixedMindsetPhrases: number;
  selfCompassionLevel: 'high' | 'medium' | 'low';
}

export interface JournalAnalysis {
  recentEntries: Array<{
    date: string;
    mood: string | null;
    gratitudes: string[];
    improvement?: string;
    habitCompletionThatDay: number;
  }>;
  recurringBlockers: RecurringBlocker[];
  gratitudeThemes: GratitudeTheme[];
  mindsetIndicators: MindsetIndicators;
  unmetDesires: string[];
  roughDayThemes: string[];
  greatDayThemes: string[];
  totalEntriesAnalyzed: number;
}

export interface GoalSummary {
  id: string;
  title: string;
  status: string;
  daysRemaining: number;
  progress: number;
  currentPhaseIndex: number | null;
  totalPhases: number;
  linkedHabitNames: string[];
}

export interface CoachingContext {
  daysSinceFirstHabit: number;
  totalCompletions: number;
  currentLevel: number;
  totalXp: number;
  currentHp: number;
  maxHp: number;
  habits: HabitSummary[];
  categoryBreakdown: Record<string, CategoryBreakdown>;
  dayOfWeekPerformance: Record<string, number>;
  timeOfDayPerformance: Record<string, number>;
  habitCorrelations: Array<{ habitA: string; habitB: string; rate: number }>;
  moodTrend: 'improving' | 'stable' | 'declining';
  averageMood: number;
  daysWithMoodTracked: number;
  recentStreakBreaks: Array<{
    habitName: string;
    daysAgo: number;
    previousStreak: number;
    dayOfWeek: string;
  }>;
  journalAnalysis: JournalAnalysis;
  goals: GoalSummary[];
  todayCompletionRate: number;
  journalingStreak: number;
}

export interface DetectedPattern {
  type:
    | 'weak_day'
    | 'peak_time'
    | 'keystone_habit'
    | 'vulnerable_habit'
    | 'category_imbalance';
  description: string;
  severity: 'info' | 'warning' | 'critical';
  data: Record<string, any>;
}

export interface Citation {
  id: string;
  author: string;
  year: number;
  title: string;
  source: string;
  type: 'journal' | 'book' | 'meta-analysis';
  keyFindings: string[];
  doi?: string;
}
