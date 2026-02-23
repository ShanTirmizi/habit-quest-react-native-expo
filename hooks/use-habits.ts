import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { Habit, HabitCategory, HabitFrequency, TimeOfDay } from '@/types';

// For now, this hook manages local state with demo data.
// When connected to Convex, it will use useQuery/useMutation from convex/react.

interface UseHabitsReturn {
  habits: Habit[];
  isLoaded: boolean;
  addHabit: (params: {
    name: string;
    category: HabitCategory;
    xpReward: number;
    frequency?: HabitFrequency;
    timeOfDay?: TimeOfDay;
    location?: string;
    trigger?: string;
    rationale?: string;
    chainedToHabitId?: string;
    goalId?: string;
  }) => void;
  deleteHabit: (id: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  toggleHabitCompletion: (id: string) => void;
  getHabitById: (id: string) => Habit | undefined;
  getTodayProgress: () => { completed: number; total: number; percentage: number };
  getHabitsByCategory: (category: HabitCategory) => Habit[];
  addNote: (habitId: string, text: string) => void;
  deleteNote: (habitId: string, noteId: string) => void;
  isCompletedToday: (habitId: string) => boolean;
}

export function useHabits(): UseHabitsReturn {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const today = format(new Date(), 'yyyy-MM-dd');

  const addHabit = useCallback(
    (params: {
      name: string;
      category: HabitCategory;
      xpReward: number;
      frequency?: HabitFrequency;
      timeOfDay?: TimeOfDay;
      location?: string;
      trigger?: string;
      rationale?: string;
      chainedToHabitId?: string;
      goalId?: string;
    }) => {
      const newHabit: Habit = {
        id: `habit_${Date.now()}`,
        name: params.name,
        category: params.category,
        xpReward: params.xpReward,
        streak: 0,
        completedDates: [],
        createdAt: new Date().toISOString(),
        frequency: params.frequency,
        timeOfDay: params.timeOfDay,
        location: params.location,
        trigger: params.trigger,
        rationale: params.rationale,
        chainedToHabitId: params.chainedToHabitId,
        goalId: params.goalId,
      };
      setHabits((prev) => [...prev, newHabit]);
    },
    []
  );

  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setCompletedToday((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
  }, []);

  const toggleHabitCompletion = useCallback(
    (id: string) => {
      setCompletedToday((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          // Remove today from completedDates
          setHabits((prevHabits) =>
            prevHabits.map((h) =>
              h.id === id
                ? { ...h, completedDates: h.completedDates.filter((d) => d !== today) }
                : h
            )
          );
        } else {
          next.add(id);
          // Add today to completedDates
          setHabits((prevHabits) =>
            prevHabits.map((h) =>
              h.id === id
                ? { ...h, completedDates: [...h.completedDates, today], streak: h.streak + 1 }
                : h
            )
          );
        }
        return next;
      });
    },
    [today]
  );

  const getHabitById = useCallback(
    (id: string) => habits.find((h) => h.id === id),
    [habits]
  );

  const getTodayProgress = useCallback(() => {
    const total = habits.length;
    const completed = completedToday.size;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [habits, completedToday]);

  const getHabitsByCategory = useCallback(
    (category: HabitCategory) => habits.filter((h) => h.category === category),
    [habits]
  );

  const addNote = useCallback((habitId: string, text: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const note = {
          id: `note_${Date.now()}`,
          date: format(new Date(), 'yyyy-MM-dd'),
          text,
          createdAt: new Date().toISOString(),
        };
        return { ...h, notes: [...(h.notes || []), note] };
      })
    );
  }, []);

  const deleteNote = useCallback((habitId: string, noteId: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        return { ...h, notes: (h.notes || []).filter((n) => n.id !== noteId) };
      })
    );
  }, []);

  const isCompletedToday = useCallback(
    (habitId: string) => completedToday.has(habitId),
    [completedToday]
  );

  return {
    habits,
    isLoaded: true,
    addHabit,
    deleteHabit,
    updateHabit,
    toggleHabitCompletion,
    getHabitById,
    getTodayProgress,
    getHabitsByCategory,
    addNote,
    deleteNote,
    isCompletedToday,
  };
}
