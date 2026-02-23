import { useState, useCallback, useMemo } from 'react';
import type { SideQuest, QuestPriority } from '@/types';
import { QUEST_PRIORITY_CONFIG } from '@/types';

interface UseSideQuestsReturn {
  quests: SideQuest[];
  isLoaded: boolean;
  addQuest: (params: {
    title: string;
    description?: string;
    priority: QuestPriority;
    questType?: 'daily' | 'weekly' | 'ongoing';
  }) => void;
  completeQuest: (id: string) => { xpAwarded: number };
  uncompleteQuest: (id: string) => void;
  deleteQuest: (id: string) => void;
  updateQuest: (id: string, updates: Partial<SideQuest>) => void;
  pendingQuests: SideQuest[];
  completedQuests: SideQuest[];
}

export function useSideQuests(): UseSideQuestsReturn {
  const [quests, setQuests] = useState<SideQuest[]>([]);

  const addQuest = useCallback(
    (params: {
      title: string;
      description?: string;
      priority: QuestPriority;
      questType?: 'daily' | 'weekly' | 'ongoing';
    }) => {
      const xp = QUEST_PRIORITY_CONFIG[params.priority].xp;
      const quest: SideQuest = {
        id: `quest_${Date.now()}`,
        title: params.title,
        description: params.description,
        xpReward: xp,
        priority: params.priority,
        questType: params.questType,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setQuests((prev) => [...prev, quest]);
    },
    []
  );

  const completeQuest = useCallback((id: string) => {
    let xpAwarded = 0;
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === id && !q.completed) {
          xpAwarded = q.xpReward;
          return { ...q, completed: true, completedAt: new Date().toISOString() };
        }
        return q;
      })
    );
    return { xpAwarded };
  }, []);

  const uncompleteQuest = useCallback((id: string) => {
    setQuests((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, completed: false, completedAt: undefined } : q
      )
    );
  }, []);

  const deleteQuest = useCallback((id: string) => {
    setQuests((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const updateQuest = useCallback((id: string, updates: Partial<SideQuest>) => {
    setQuests((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }, []);

  const pendingQuests = useMemo(
    () => quests.filter((q) => !q.completed),
    [quests]
  );

  const completedQuests = useMemo(
    () => quests.filter((q) => q.completed),
    [quests]
  );

  return {
    quests,
    isLoaded: true,
    addQuest,
    completeQuest,
    uncompleteQuest,
    deleteQuest,
    updateQuest,
    pendingQuests,
    completedQuests,
  };
}
