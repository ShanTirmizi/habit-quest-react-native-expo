// HabitQuest — Radical Design System with Light/Dark Mode

// ──────────────────────────────────────────────
// Dark Theme — "Midnight"
// Electric orange on deep midnight-blue
// ──────────────────────────────────────────────
export const DarkColors = {
  // Backgrounds — midnight blue undertone
  background: '#060810',
  surface: '#0D1117',
  surfaceLight: '#161B22',
  surfaceRaised: '#1C2333',
  surfaceHover: '#242D3D',

  // Primary — electric orange
  primary: '#FF6B2C',
  primaryDim: '#CC5520',
  primaryGlow: 'rgba(255, 107, 44, 0.40)',
  primaryBg: 'rgba(255, 107, 44, 0.12)',
  primaryBgHover: 'rgba(255, 107, 44, 0.20)',

  // Secondary — neon cyan
  secondary: '#00E5CC',
  secondaryDim: '#00B8A3',
  secondaryGlow: 'rgba(0, 229, 204, 0.35)',
  secondaryBg: 'rgba(0, 229, 204, 0.10)',

  // Gold — XP, achievements
  accent: '#FFB800',
  accentDim: '#D49A00',
  accentGlow: 'rgba(255, 184, 0, 0.40)',
  accentBg: 'rgba(255, 184, 0, 0.10)',

  // Text — cool off-whites
  foreground: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#6B7280',

  // Categories — vivid
  categoryHealth: '#00E676',
  categoryCareer: '#448AFF',
  categoryMind: '#B388FF',
  categoryLife: '#FFD740',

  // Category Backgrounds
  categoryHealthBg: 'rgba(0, 230, 118, 0.10)',
  categoryCareerBg: 'rgba(68, 138, 255, 0.10)',
  categoryMindBg: 'rgba(179, 136, 255, 0.10)',
  categoryLifeBg: 'rgba(255, 215, 64, 0.10)',

  // Rarity
  rarityCommon: '#8B949E',
  rarityUncommon: '#00E676',
  rarityRare: '#448AFF',
  rarityEpic: '#B388FF',
  rarityLegendary: '#FFB800',

  // Status
  success: '#00E676',
  warning: '#FFB800',
  danger: '#FF6B6B',
  info: '#448AFF',

  // HP
  hpHigh: '#00E676',
  hpMedium: '#FFB800',
  hpLow: '#FF6B6B',
  hpCritical: '#FF4444',

  // Mood
  moodGreat: '#FFB800',
  moodGood: '#00E676',
  moodOkay: '#448AFF',
  moodRough: '#8B949E',

  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.75)',
  glass: 'rgba(13, 17, 23, 0.92)',

  // Button text on primary bg
  primaryButtonText: '#FFFFFF',
} as const;

// ──────────────────────────────────────────────
// Light Theme — "Daybreak"
// Warm sand surfaces, deeper accents for
// readability, real shadows for depth.
// NOT a cheap inversion — a distinct personality.
// ──────────────────────────────────────────────
export const LightColors = {
  // Backgrounds — warm sand
  background: '#F5F2ED',
  surface: '#FFFFFF',
  surfaceLight: '#EDE9E3',
  surfaceRaised: '#F8F5F0',
  surfaceHover: '#E5E0D8',

  // Primary — deeper orange for readability
  primary: '#E85A1E',
  primaryDim: '#C44D18',
  primaryGlow: 'rgba(232, 90, 30, 0.15)',
  primaryBg: 'rgba(232, 90, 30, 0.08)',
  primaryBgHover: 'rgba(232, 90, 30, 0.14)',

  // Secondary — deeper cyan
  secondary: '#0AA89A',
  secondaryDim: '#089187',
  secondaryGlow: 'rgba(10, 168, 154, 0.15)',
  secondaryBg: 'rgba(10, 168, 154, 0.08)',

  // Gold — deeper
  accent: '#D49A00',
  accentDim: '#B58200',
  accentGlow: 'rgba(212, 154, 0, 0.15)',
  accentBg: 'rgba(212, 154, 0, 0.06)',

  // Text — warm darks
  foreground: '#1A1614',
  textSecondary: '#5C5650',
  textMuted: '#8A8480',

  // Categories — deeper for light-bg readability
  categoryHealth: '#00B862',
  categoryCareer: '#3370E0',
  categoryMind: '#8F68E5',
  categoryLife: '#D4A600',

  // Category Backgrounds
  categoryHealthBg: 'rgba(0, 184, 98, 0.08)',
  categoryCareerBg: 'rgba(51, 112, 224, 0.08)',
  categoryMindBg: 'rgba(143, 104, 229, 0.08)',
  categoryLifeBg: 'rgba(212, 166, 0, 0.08)',

  // Rarity
  rarityCommon: '#A8A19A',
  rarityUncommon: '#00B862',
  rarityRare: '#3370E0',
  rarityEpic: '#8F68E5',
  rarityLegendary: '#D49A00',

  // Status
  success: '#00B862',
  warning: '#D49A00',
  danger: '#E04545',
  info: '#3370E0',

  // HP
  hpHigh: '#00B862',
  hpMedium: '#D49A00',
  hpLow: '#E04545',
  hpCritical: '#C23232',

  // Mood
  moodGreat: '#D49A00',
  moodGood: '#00B862',
  moodOkay: '#3370E0',
  moodRough: '#A8A19A',

  // Borders — real opacity borders
  border: 'rgba(0, 0, 0, 0.07)',
  borderStrong: 'rgba(0, 0, 0, 0.14)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.3)',
  glass: 'rgba(255, 255, 255, 0.95)',

  // Button text on primary bg
  primaryButtonText: '#FFFFFF',
} as const;

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
/** Widened so both palettes satisfy the same shape */
export type ThemeColors = { [K in keyof typeof DarkColors]: string };
export type ThemeMode = 'light' | 'dark';

// Default/legacy export (dark) for backward compat
export const Colors = DarkColors;

// Category color helpers
export function getCategoryColors(c: ThemeColors): Record<string, string> {
  return { health: c.categoryHealth, career: c.categoryCareer, mind: c.categoryMind, life: c.categoryLife };
}
export function getCategoryBgColors(c: ThemeColors): Record<string, string> {
  return { health: c.categoryHealthBg, career: c.categoryCareerBg, mind: c.categoryMindBg, life: c.categoryLifeBg };
}
export function getCategoryGradients(c: ThemeColors): Record<string, [string, string]> {
  return {
    health: [c.categoryHealth, c.success],
    career: [c.categoryCareer, c.info],
    mind: [c.categoryMind, c.rarityEpic],
    life: [c.categoryLife, c.accent],
  };
}
export function getRarityColors(c: ThemeColors): Record<string, string> {
  return { common: c.rarityCommon, uncommon: c.rarityUncommon, rare: c.rarityRare, epic: c.rarityEpic, legendary: c.rarityLegendary };
}

// Legacy static maps (point to dark palette)
export const CATEGORY_COLORS: Record<string, string> = getCategoryColors(DarkColors);
export const CATEGORY_BG_COLORS: Record<string, string> = getCategoryBgColors(DarkColors);
export const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  health: ['#00E676', '#00C853'],
  career: ['#448AFF', '#2962FF'],
  mind: ['#B388FF', '#7C4DFF'],
  life: ['#FFD740', '#FFAB00'],
};
export const RARITY_COLORS: Record<string, string> = getRarityColors(DarkColors);

// Font Family — Sora (geometric, modern)
export const FontFamily = {
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extrabold: 'Sora_800ExtraBold',
} as const;

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 36,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
} as const;

// Font sizes — with oversized metric sizes
export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
} as const;

// Border radius
export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

// Bento grid constants
export const BentoGap = 14;
export const BentoRadius = 20;

// Shadow presets (theme-independent — shadows look good on both)
export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cardRaised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: (color: string, intensity = 0.35) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: intensity,
    shadowRadius: 20,
    elevation: 8,
  }),
  neonGlow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  }),
} as const;
