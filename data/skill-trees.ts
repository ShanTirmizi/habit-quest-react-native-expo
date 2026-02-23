import { Skill, SkillTreeCategory } from '@/types';

export const SKILL_TREE_CONFIG: Record<
  SkillTreeCategory,
  { name: string; icon: string; color: string; description: string }
> = {
  discipline: {
    name: 'Discipline',
    icon: '⚔️',
    color: 'text-red-400',
    description: 'Master consistency and routine',
  },
  wellness: {
    name: 'Wellness',
    icon: '💚',
    color: 'text-green-400',
    description: 'Boost health-related habits',
  },
  growth: {
    name: 'Growth',
    icon: '📚',
    color: 'text-blue-400',
    description: 'Enhance learning and career',
  },
  balance: {
    name: 'Balance',
    icon: '☯️',
    color: 'text-purple-400',
    description: 'Find harmony in daily life',
  },
};

export const SKILLS: Skill[] = [
  // ============================================
  // DISCIPLINE TREE
  // ============================================
  {
    id: 'iron-will',
    name: 'Iron Will',
    description: '+5% XP on all habit completions',
    icon: '🔥',
    category: 'discipline',
    xpCost: 500,
    effect: { type: 'xp_bonus', value: 5 },
  },
  {
    id: 'streak-guardian',
    name: 'Streak Guardian',
    description: 'Gain 1 extra streak freeze per week',
    icon: '🛡️',
    category: 'discipline',
    xpCost: 750,
    prerequisiteIds: ['iron-will'],
    effect: { type: 'streak_protection', value: 1 },
  },
  {
    id: 'momentum-master',
    name: 'Momentum Master',
    description: '+10% XP bonus when completing 3+ habits in a day',
    icon: '⚡',
    category: 'discipline',
    xpCost: 1000,
    prerequisiteIds: ['iron-will'],
    effect: { type: 'xp_bonus', value: 10 },
  },
  {
    id: 'relentless',
    name: 'Relentless',
    description: '+15% XP on habits with 7+ day streaks',
    icon: '💎',
    category: 'discipline',
    xpCost: 1500,
    prerequisiteIds: ['streak-guardian', 'momentum-master'],
    effect: { type: 'xp_bonus', value: 15 },
  },
  {
    id: 'unbreakable',
    name: 'Unbreakable',
    description: 'Streaks can survive 2 missed days instead of 1',
    icon: '🏆',
    category: 'discipline',
    xpCost: 2500,
    prerequisiteIds: ['relentless'],
    effect: { type: 'streak_protection', value: 2 },
  },

  // ============================================
  // WELLNESS TREE
  // ============================================
  {
    id: 'vitality',
    name: 'Vitality',
    description: '+10% XP on health category habits',
    icon: '❤️',
    category: 'wellness',
    xpCost: 500,
    effect: { type: 'category_bonus', value: 10, categoryTarget: 'health' },
  },
  {
    id: 'rest-mastery',
    name: 'Rest Mastery',
    description: '+1 allowed rest day per week without breaking streaks',
    icon: '😴',
    category: 'wellness',
    xpCost: 750,
    prerequisiteIds: ['vitality'],
    effect: { type: 'rest_day', value: 1 },
  },
  {
    id: 'body-harmony',
    name: 'Body Harmony',
    description: '+15% XP when completing all health habits in a day',
    icon: '🌟',
    category: 'wellness',
    xpCost: 1000,
    prerequisiteIds: ['vitality'],
    effect: { type: 'category_bonus', value: 15, categoryTarget: 'health' },
  },
  {
    id: 'peak-performance',
    name: 'Peak Performance',
    description: '+20% XP on health habits with 14+ day streaks',
    icon: '💪',
    category: 'wellness',
    xpCost: 1500,
    prerequisiteIds: ['rest-mastery', 'body-harmony'],
    effect: { type: 'category_bonus', value: 20, categoryTarget: 'health' },
  },
  {
    id: 'immortal-vitality',
    name: 'Immortal Vitality',
    description: 'Health habits give 2x XP on weekends',
    icon: '🌈',
    category: 'wellness',
    xpCost: 2500,
    prerequisiteIds: ['peak-performance'],
    effect: { type: 'category_bonus', value: 100, categoryTarget: 'health' },
  },

  // ============================================
  // GROWTH TREE
  // ============================================
  {
    id: 'scholar',
    name: 'Scholar',
    description: '+10% XP on career and mind category habits',
    icon: '📖',
    category: 'growth',
    xpCost: 500,
    effect: { type: 'category_bonus', value: 10, categoryTarget: 'career' },
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    description: '+10% XP on mind category habits',
    icon: '🧠',
    category: 'growth',
    xpCost: 750,
    prerequisiteIds: ['scholar'],
    effect: { type: 'category_bonus', value: 10, categoryTarget: 'mind' },
  },
  {
    id: 'knowledge-seeker',
    name: 'Knowledge Seeker',
    description: '+5% XP on all habits when journaling daily',
    icon: '📚',
    category: 'growth',
    xpCost: 1000,
    prerequisiteIds: ['scholar'],
    effect: { type: 'xp_bonus', value: 5 },
  },
  {
    id: 'enlightened',
    name: 'Enlightened',
    description: '+20% XP on career habits with 21+ day streaks',
    icon: '✨',
    category: 'growth',
    xpCost: 1500,
    prerequisiteIds: ['deep-focus', 'knowledge-seeker'],
    effect: { type: 'category_bonus', value: 20, categoryTarget: 'career' },
  },
  {
    id: 'master-sage',
    name: 'Master Sage',
    description: 'Career and mind habits give 2x XP when completed before noon',
    icon: '🔮',
    category: 'growth',
    xpCost: 2500,
    prerequisiteIds: ['enlightened'],
    effect: { type: 'category_bonus', value: 100, categoryTarget: 'mind' },
  },

  // ============================================
  // BALANCE TREE
  // ============================================
  {
    id: 'harmony',
    name: 'Harmony',
    description: '+10% XP on life category habits',
    icon: '🌸',
    category: 'balance',
    xpCost: 500,
    effect: { type: 'category_bonus', value: 10, categoryTarget: 'life' },
  },
  {
    id: 'versatile',
    name: 'Versatile',
    description: '+5% XP when completing habits from 3+ categories',
    icon: '🎯',
    category: 'balance',
    xpCost: 750,
    prerequisiteIds: ['harmony'],
    effect: { type: 'xp_bonus', value: 5 },
  },
  {
    id: 'mindful-living',
    name: 'Mindful Living',
    description: '+10% XP bonus from journal entries',
    icon: '🧘',
    category: 'balance',
    xpCost: 1000,
    prerequisiteIds: ['harmony'],
    effect: { type: 'xp_bonus', value: 10 },
  },
  {
    id: 'life-mastery',
    name: 'Life Mastery',
    description: '+15% XP when all daily habits are completed',
    icon: '👑',
    category: 'balance',
    xpCost: 1500,
    prerequisiteIds: ['versatile', 'mindful-living'],
    effect: { type: 'xp_bonus', value: 15 },
  },
  {
    id: 'zen-master',
    name: 'Zen Master',
    description: 'Perfect days (100% completion) give +50 bonus XP',
    icon: '🌟',
    category: 'balance',
    xpCost: 2500,
    prerequisiteIds: ['life-mastery'],
    effect: { type: 'xp_bonus', value: 50 },
  },
];

// Helper to get skills by category
export function getSkillsByCategory(category: SkillTreeCategory): Skill[] {
  return SKILLS.filter((s) => s.category === category);
}

// Helper to check if a skill can be unlocked
export function canUnlockSkill(
  skillId: string,
  unlockedSkillIds: string[],
  totalXp: number
): { canUnlock: boolean; reason?: string } {
  const skill = SKILLS.find((s) => s.id === skillId);
  if (!skill) return { canUnlock: false, reason: 'Skill not found' };

  // Check if already unlocked
  if (unlockedSkillIds.includes(skillId)) {
    return { canUnlock: false, reason: 'Already unlocked' };
  }

  // Check XP cost
  if (totalXp < skill.xpCost) {
    return { canUnlock: false, reason: `Need ${skill.xpCost} total XP (you have ${totalXp})` };
  }

  // Check prerequisites
  if (skill.prerequisiteIds && skill.prerequisiteIds.length > 0) {
    const missingPrereqs = skill.prerequisiteIds.filter((id) => !unlockedSkillIds.includes(id));
    if (missingPrereqs.length > 0) {
      const missingNames = missingPrereqs
        .map((id) => SKILLS.find((s) => s.id === id)?.name || id)
        .join(', ');
      return { canUnlock: false, reason: `Requires: ${missingNames}` };
    }
  }

  return { canUnlock: true };
}

// Get total bonuses from unlocked skills
export function getSkillBonuses(unlockedSkillIds: string[]): {
  globalXpBonus: number;
  categoryBonuses: Record<string, number>;
  extraRestDays: number;
  extraStreakProtection: number;
} {
  const result = {
    globalXpBonus: 0,
    categoryBonuses: {} as Record<string, number>,
    extraRestDays: 0,
    extraStreakProtection: 0,
  };

  unlockedSkillIds.forEach((skillId) => {
    const skill = SKILLS.find((s) => s.id === skillId);
    if (!skill) return;

    switch (skill.effect.type) {
      case 'xp_bonus':
        result.globalXpBonus += skill.effect.value;
        break;
      case 'category_bonus':
        if (skill.effect.categoryTarget) {
          result.categoryBonuses[skill.effect.categoryTarget] =
            (result.categoryBonuses[skill.effect.categoryTarget] || 0) + skill.effect.value;
        }
        break;
      case 'rest_day':
        result.extraRestDays += skill.effect.value;
        break;
      case 'streak_protection':
        result.extraStreakProtection += skill.effect.value;
        break;
    }
  });

  return result;
}
