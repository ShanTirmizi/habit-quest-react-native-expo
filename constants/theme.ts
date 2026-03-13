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

  // Bold category card fills (dark mode = subtle tints)
  categoryHealthCard: 'rgba(0, 230, 118, 0.15)',
  categoryCareerCard: 'rgba(68, 138, 255, 0.15)',
  categoryMindCard: 'rgba(179, 136, 255, 0.15)',
  categoryLifeCard: 'rgba(255, 215, 64, 0.15)',
  categoryCardText: '#E6EDF3',
  categoryCardTextSub: '#8B949E',

  // Button text on primary bg
  primaryButtonText: '#FFFFFF',
} as const;

// ──────────────────────────────────────────────
// Light Theme — "Warm & Fun"
// Bold, colorful, playful. White cards floating on
// warm cream with punchy orange primary, vivid
// category colors, and real shadow depth.
// ──────────────────────────────────────────────
export const LightColors = {
  // Backgrounds — bright warm peach (Design 4 inspired)
  background: '#F5D9C0',
  surface: '#FFFFFF',
  surfaceLight: '#F9E8D6',
  surfaceRaised: '#FFFFFF',
  surfaceHover: '#ECDAC8',

  // Primary — bold warm orange (the hero color)
  primary: '#EB6D3A',
  primaryDim: '#D45E30',
  primaryGlow: 'rgba(235, 109, 58, 0.25)',
  primaryBg: 'rgba(235, 109, 58, 0.12)',
  primaryBgHover: 'rgba(235, 109, 58, 0.20)',

  // Secondary — vivid emerald green
  secondary: '#2EAA6E',
  secondaryDim: '#25905C',
  secondaryGlow: 'rgba(46, 170, 110, 0.20)',
  secondaryBg: 'rgba(46, 170, 110, 0.12)',

  // Accent — rich golden amber
  accent: '#E5A832',
  accentDim: '#CC9428',
  accentGlow: 'rgba(229, 168, 50, 0.20)',
  accentBg: 'rgba(229, 168, 50, 0.12)',

  // Text — warm darks
  foreground: '#1C1816',
  textSecondary: '#6B6058',
  textMuted: '#A09890',

  // Categories — vivid and fun, each clearly distinct
  categoryHealth: '#2EAA6E',   // emerald green
  categoryCareer: '#E5A832',   // golden amber
  categoryMind: '#D95E8A',     // hot pink
  categoryLife: '#2AAAA0',     // bold teal

  // Category Backgrounds — clearly visible tints
  categoryHealthBg: 'rgba(46, 170, 110, 0.14)',
  categoryCareerBg: 'rgba(229, 168, 50, 0.14)',
  categoryMindBg: 'rgba(217, 94, 138, 0.14)',
  categoryLifeBg: 'rgba(42, 170, 160, 0.14)',

  // Rarity
  rarityCommon: '#A09890',
  rarityUncommon: '#2EAA6E',
  rarityRare: '#2AAAA0',
  rarityEpic: '#D95E8A',
  rarityLegendary: '#E5A832',

  // Status — bold and clear
  success: '#2EAA6E',
  warning: '#E5A832',
  danger: '#E05545',
  info: '#2AAAA0',

  // HP
  hpHigh: '#2EAA6E',
  hpMedium: '#E5A832',
  hpLow: '#E05545',
  hpCritical: '#C43A2E',

  // Mood
  moodGreat: '#E5A832',
  moodGood: '#2EAA6E',
  moodOkay: '#2AAAA0',
  moodRough: '#A09890',

  // Bold category card fills — PUNCHY Design 4 style (rich, saturated, deep)
  categoryHealthCard: '#2AB872',   // deep rich emerald (not pastel!)
  categoryCareerCard: '#E29628',   // deep warm golden amber
  categoryMindCard: '#D44E82',     // vivid hot pink / magenta
  categoryLifeCard: '#24A894',     // deep rich teal
  categoryCardText: '#FFFFFF',     // white text on saturated colored cards
  categoryCardTextSub: 'rgba(255, 255, 255, 0.80)',  // semi-transparent white

  // Borders — subtle, shadows do the heavy lifting
  border: 'rgba(0, 0, 0, 0.04)',
  borderStrong: 'rgba(0, 0, 0, 0.08)',
  glassBorder: 'rgba(0, 0, 0, 0.03)',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.30)',
  glass: 'rgba(255, 255, 255, 0.98)',

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
export function getCategoryCardColors(c: ThemeColors): Record<string, string> {
  return { health: c.categoryHealthCard, career: c.categoryCareerCard, mind: c.categoryMindCard, life: c.categoryLifeCard };
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

// Shadow presets — visible depth like Design 5 mood tracker
export const Shadows = {
  card: {
    shadowColor: '#8B8178',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  cardRaised: {
    shadowColor: '#8B8178',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: (color: string, intensity = 0.25) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: intensity,
    shadowRadius: 16,
    elevation: 5,
  }),
  neonGlow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 8,
  }),
} as const;
