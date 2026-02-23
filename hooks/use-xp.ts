import { useState, useCallback, useMemo } from 'react';
import type { UserProgress, Badge } from '@/types';
import { HP_CONFIG } from '@/types';

// XP calculation functions (mirrors lib/xp-calculator.ts)
function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100));
}

function xpForLevel(level: number): number {
  return level * level * 100;
}

function xpToNextLevel(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  return nextLevelXp - totalXp;
}

function levelProgress(totalXp: number): number {
  const currentLevel = calculateLevel(totalXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const progress = ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, progress));
}

const DEFAULT_PROGRESS: UserProgress = {
  totalXp: 0,
  level: 0,
  achievements: [],
  streakFreezes: 0,
  lastWeeklyFreezeEarned: null,
  currentHp: HP_CONFIG.DEFAULT_HP,
  maxHp: HP_CONFIG.MAX_HP,
  faintCount: 0,
};

interface UseXpReturn {
  progress: UserProgress;
  isLoaded: boolean;
  addXp: (amount: number) => { leveledUp: boolean; newLevel: number };
  getLevelInfo: () => {
    level: number;
    totalXp: number;
    progress: number;
    xpToNext: number;
  };
  unlockAchievement: (id: string) => void;
  unlockSkill: (skillId: string) => void;
  setActiveTitle: (titleId: string) => void;
  awardBadge: (badge: Badge) => void;
  healHp: (amount: number) => void;
  deductHp: (amount: number) => void;
  getHpInfo: () => {
    current: number;
    max: number;
    percentage: number;
    isCritical: boolean;
    faintCount: number;
  };
}

export function useXp(): UseXpReturn {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);

  const addXp = useCallback(
    (amount: number) => {
      let leveledUp = false;
      let newLevel = progress.level;

      setProgress((prev) => {
        const newTotalXp = prev.totalXp + amount;
        const newLev = calculateLevel(newTotalXp);
        if (newLev > prev.level) {
          leveledUp = true;
          newLevel = newLev;
        }
        return {
          ...prev,
          totalXp: newTotalXp,
          level: newLev,
          totalCompletions: (prev.totalCompletions || 0) + 1,
        };
      });

      return { leveledUp, newLevel };
    },
    [progress.level]
  );

  const getLevelInfo = useCallback(() => {
    return {
      level: progress.level,
      totalXp: progress.totalXp,
      progress: levelProgress(progress.totalXp),
      xpToNext: xpToNextLevel(progress.totalXp),
    };
  }, [progress.totalXp, progress.level]);

  const unlockAchievement = useCallback((id: string) => {
    setProgress((prev) => {
      if (prev.achievements.includes(id)) return prev;
      return { ...prev, achievements: [...prev.achievements, id] };
    });
  }, []);

  const unlockSkill = useCallback((skillId: string) => {
    setProgress((prev) => {
      const already = prev.unlockedSkills?.some((s) => s.skillId === skillId);
      if (already) return prev;
      return {
        ...prev,
        unlockedSkills: [
          ...(prev.unlockedSkills || []),
          { skillId, unlockedAt: new Date().toISOString() },
        ],
      };
    });
  }, []);

  const setActiveTitle = useCallback((titleId: string) => {
    setProgress((prev) => ({ ...prev, activeTitle: titleId }));
  }, []);

  const awardBadge = useCallback((badge: Badge) => {
    setProgress((prev) => {
      const already = prev.badges?.some((b) => b.id === badge.id);
      if (already) return prev;
      return {
        ...prev,
        badges: [...(prev.badges || []), { ...badge, earnedAt: new Date().toISOString() }],
      };
    });
  }, []);

  const healHp = useCallback((amount: number) => {
    setProgress((prev) => ({
      ...prev,
      currentHp: Math.min(prev.maxHp, prev.currentHp + amount),
    }));
  }, []);

  const deductHp = useCallback((amount: number) => {
    setProgress((prev) => {
      const newHp = Math.max(0, prev.currentHp - amount);
      // Check for faint
      if (newHp <= HP_CONFIG.FAINT_THRESHOLD) {
        return {
          ...prev,
          currentHp: HP_CONFIG.FAINT_HP_RESET,
          level: Math.max(0, prev.level - HP_CONFIG.FAINT_LEVEL_PENALTY),
          faintCount: (prev.faintCount || 0) + 1,
        };
      }
      return { ...prev, currentHp: newHp };
    });
  }, []);

  const getHpInfo = useCallback(() => {
    const percentage = (progress.currentHp / progress.maxHp) * 100;
    return {
      current: progress.currentHp,
      max: progress.maxHp,
      percentage,
      isCritical: percentage <= 20,
      faintCount: progress.faintCount || 0,
    };
  }, [progress.currentHp, progress.maxHp, progress.faintCount]);

  return {
    progress,
    isLoaded: true,
    addXp,
    getLevelInfo,
    unlockAchievement,
    unlockSkill,
    setActiveTitle,
    awardBadge,
    healHp,
    deductHp,
    getHpInfo,
  };
}
