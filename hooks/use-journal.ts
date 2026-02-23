import { useState, useCallback, useMemo } from 'react';
import { format, parseISO, isToday, startOfDay } from 'date-fns';
import type { JournalEntry, JournalMood } from '@/types';
import { JOURNAL_XP } from '@/types';

interface UseJournalReturn {
  entries: JournalEntry[];
  isLoaded: boolean;
  addEntry: (params: {
    gratitudes: [string, string, string];
    improvement?: string;
    content?: string;
    mood?: JournalMood;
    entryType?: 'daily' | 'weekly';
    weekHighlights?: string;
    weekChallenges?: string;
    nextWeekGoals?: string;
    entryDate?: string;
  }) => { xpAwarded: number };
  hasEntryToday: boolean;
  getStats: () => {
    totalEntries: number;
    totalWords: number;
    totalXp: number;
    currentStreak: number;
  };
}

export function useJournal(): UseJournalReturn {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const hasEntryToday = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return entries.some(
      (e) => e.entryDate === today || isToday(parseISO(e.createdAt))
    );
  }, [entries]);

  const addEntry = useCallback(
    (params: {
      gratitudes: [string, string, string];
      improvement?: string;
      content?: string;
      mood?: JournalMood;
      entryType?: 'daily' | 'weekly';
      weekHighlights?: string;
      weekChallenges?: string;
      nextWeekGoals?: string;
      entryDate?: string;
    }) => {
      // Calculate XP
      let xp = JOURNAL_XP.BASE; // Always get base for gratitudes
      if (params.improvement) xp += JOURNAL_XP.IMPROVEMENT_BONUS;
      if (params.content) xp += JOURNAL_XP.THOUGHTS_BONUS;
      if (params.entryType === 'weekly') xp += JOURNAL_XP.WEEKLY_BONUS;
      xp = Math.min(xp, JOURNAL_XP.MAX_DAILY);

      const wordCount = [
        ...params.gratitudes,
        params.improvement || '',
        params.content || '',
        params.weekHighlights || '',
        params.weekChallenges || '',
        params.nextWeekGoals || '',
      ]
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length;

      const entry: JournalEntry = {
        id: `journal_${Date.now()}`,
        entryType: params.entryType || 'daily',
        gratitudes: params.gratitudes,
        improvement: params.improvement,
        content: params.content,
        mood: params.mood,
        weekHighlights: params.weekHighlights,
        weekChallenges: params.weekChallenges,
        nextWeekGoals: params.nextWeekGoals,
        createdAt: new Date().toISOString(),
        wordCount,
        xpAwarded: xp,
        entryDate: params.entryDate || format(new Date(), 'yyyy-MM-dd'),
      };

      setEntries((prev) => [entry, ...prev]);
      return { xpAwarded: xp };
    },
    []
  );

  const getStats = useCallback(() => {
    const totalEntries = entries.length;
    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);
    const totalXp = entries.reduce((sum, e) => sum + e.xpAwarded, 0);

    // Calculate streak (consecutive days)
    let streak = 0;
    const sortedDates = entries
      .map((e) => e.entryDate || format(parseISO(e.createdAt), 'yyyy-MM-dd'))
      .sort()
      .reverse();
    const uniqueDates = [...new Set(sortedDates)];

    for (let i = 0; i < uniqueDates.length; i++) {
      const expectedDate = format(
        new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        'yyyy-MM-dd'
      );
      if (uniqueDates[i] === expectedDate) {
        streak++;
      } else {
        break;
      }
    }

    return { totalEntries, totalWords, totalXp, currentStreak: streak };
  }, [entries]);

  return {
    entries,
    isLoaded: true,
    addEntry,
    hasEntryToday,
    getStats,
  };
}
