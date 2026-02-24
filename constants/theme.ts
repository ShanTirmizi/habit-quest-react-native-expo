// HabitQuest — Radical Design System
// Dark midnight-blue base, electric accents, bento grid layout, oversized metrics

export const Colors = {
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

  // Secondary — neon cyan (for contrast emphasis)
  secondary: '#00E5CC',
  secondaryDim: '#00B8A3',
  secondaryGlow: 'rgba(0, 229, 204, 0.35)',
  secondaryBg: 'rgba(0, 229, 204, 0.10)',

  // Gold — XP, achievements, premium moments (more saturated)
  accent: '#FFB800',
  accentDim: '#D49A00',
  accentGlow: 'rgba(255, 184, 0, 0.40)',
  accentBg: 'rgba(255, 184, 0, 0.10)',

  // Text — cool off-whites
  foreground: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
  textDim: '#30363D',

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

// Category gradient pairs for gradient cards
export const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  health: ['#00E676', '#00C853'],
  career: ['#448AFF', '#2962FF'],
  mind: ['#B388FF', '#7C4DFF'],
  life: ['#FFD740', '#FFAB00'],
};

export const RARITY_COLORS: Record<string, string> = {
  common: Colors.rarityCommon,
  uncommon: Colors.rarityUncommon,
  rare: Colors.rarityRare,
  epic: Colors.rarityEpic,
  legendary: Colors.rarityLegendary,
};

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

// Shadow presets
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
