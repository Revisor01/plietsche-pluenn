// Design tokens (1:1 from design/HANDOFF.md §3 + design/theme.jsx).
// Use `PP` for all colors, radii, font sizes — never hard-code these in screens.

export const PP = {
  // brand gradient (teal -> mint -> sky)
  teal: '#27b092',
  mint: '#79c4b0',
  sky: '#80b4e2',
  gradient: ['#27b092', '#79c4b0', '#80b4e2'] as const,
  gradientSoft: ['rgba(39,176,146,0.12)', 'rgba(121,196,176,0.10)', 'rgba(128,180,226,0.12)'] as const,
  gradientAngle: 135,

  // surfaces — warmer than pure white for community feel
  bg: '#F4F7F4',
  surface: '#FFFFFF',
  sand: '#F4EFE6',
  sandDeep: '#EBE3D2',
  glass: 'rgba(255,255,255,0.65)',
  glassDark: 'rgba(26,46,44,0.55)',

  // text
  ink: '#1A2E2C',
  ink2: '#5A6B6A',
  ink3: '#9AA8A7',
  hairline: '#E5EDEB',

  // semantic
  warn: '#E8A93B',
  err: '#D9534F',
  ok: '#27b092',

  // achievement tiers
  bronze: '#CD7F32',
  silver: '#B8B8B8',
  gold: '#E8B923',
  platin: '#7FB6C9',
  diamant: '#6FD3E8',

  // radii
  rCard: 22,
  rTile: 18,
  rPill: 999,
  rField: 14,
  rBtn: 16,

  // type
  // Global font scale — multiplies EVERY size rendered through PPText, including
  // hard-coded size={n} values across screens. Bump this to enlarge the whole
  // app's typography in one place.
  fontScale: 1.15,
  font: {
    regular: 'WorkSans_400Regular',
    medium: 'WorkSans_500Medium',
    semibold: 'WorkSans_600SemiBold',
    bold: 'WorkSans_700Bold',
  },
  // Base sizes — the global fontScale is applied on top in PPText, so these stay
  // at their design values. Adjust fontScale (above) to grow everything at once.
  fontSizes: {
    xs: 10.5,
    sm: 11.5,
    base: 13.5,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    hero: 32,
  },

  // shadows (iOS) — Android uses `elevation`
  shadowCard: {
    shadowColor: '#1A2E2C',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  shadowTabBar: {
    shadowColor: '#1A2E2C',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  // spacing rhythm (vertical default 14/22)
  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    xxl: 32,
  },
} as const;

export type PPTheme = typeof PP;
