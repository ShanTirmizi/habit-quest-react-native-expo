// Sanctuary Dark Theme - HabitQuest Design System
export const Colors = {
  // Core
  background: '#06060A',
  surface: '#0F0F14',
  surfaceLight: '#1A1A22',
  surfaceHover: '#22222E',
  border: '#2A2A36',
  borderLight: '#3A3A48',

  // Primary (Teal)
  primary: '#00E5CC',
  primaryDim: '#00B8A3',
  primaryGlow: 'rgba(0, 229, 204, 0.4)',
  primaryBg: 'rgba(0, 229, 204, 0.08)',
  primaryBgHover: 'rgba(0, 229, 204, 0.15)',

  // Accent (Amber)
  accent: '#FFB800',
  accentDim: '#CC9300',
  accentGlow: 'rgba(255, 184, 0, 0.4)',
  accentBg: 'rgba(255, 184, 0, 0.08)',

  // Text
  foreground: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textDim: '#52525B',

  // Category Colors
  categoryHealth: '#00FF88',
  categoryCareer: '#4D9FFF',
  categoryMind: '#B366FF',
  categoryLife: '#FFB800',

  // Category Backgrounds
  categoryHealthBg: 'rgba(0, 255, 136, 0.08)',
  categoryCareerBg: 'rgba(77, 159, 255, 0.08)',
  categoryMindBg: 'rgba(179, 102, 255, 0.08)',
  categoryLifeBg: 'rgba(255, 184, 0, 0.08)',

  // Rarity
  rarityCommon: '#9CA3AF',
  rarityUncommon: '#4ADE80',
  rarityRare: '#60A5FA',
  rarityEpic: '#A78BFA',
  rarityLegendary: '#FBBF24',

  // Status Colors
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // HP Colors
  hpHigh: '#22C55E',
  hpMedium: '#F59E0B',
  hpLow: '#EF4444',
  hpCritical: '#DC2626',

  // Mood Colors
  moodGreat: '#FBBF24',
  moodGood: '#4ADE80',
  moodOkay: '#60A5FA',
  moodRough: '#9CA3AF',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.6)',
  glass: 'rgba(15, 15, 20, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
} as const;

// Category color mapping
export const CATEGORY_COLORS: Record<string, string> = {
  health: Colors.categoryHealth,
  career: Colors.categoryCareer,
  mind: Colors.categoryMind,
  life: Colors.categoryLife,
};

export const CATEGORY_BG_COLORS: Record<string, string> = {
  health: Colors.categoryHealthBg,
  career: Colors.categoryCareerBg,
  mind: Colors.categoryMindBg,
  life: Colors.categoryLifeBg,
};

export const RARITY_COLORS: Record<string, string> = {
  common: Colors.rarityCommon,
  uncommon: Colors.rarityUncommon,
  rare: Colors.rarityRare,
  epic: Colors.rarityEpic,
  legendary: Colors.rarityLegendary,
};

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// Font sizes
export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

// Border radius
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;
