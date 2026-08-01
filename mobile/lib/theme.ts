// Design tokens (1:1 from design/HANDOFF.md §3 + design/theme.jsx).
// Use `PP` for all colors, radii, font sizes — never hard-code these in screens.

import { Platform } from 'react-native';

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

// ---------------------------------------------------------------------------
// Platform design language
//
// Ziel: iOS sieht nach iOS aus (Liquid Glass), Android nach Android (Material 3).
// Die Marke (PP-Farben, Work Sans) bleibt auf beiden Plattformen gleich — es
// ändern sich Form, Elevation und Feedback-Verhalten, nicht die Identität.
//
// Screens nutzen weiterhin nur die UI-Komponenten; diese Tokens sind für die
// Komponenten selbst gedacht, nicht für den direkten Gebrauch in Screens.
// ---------------------------------------------------------------------------

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

/**
 * MD3 state layers: Material legt bei Interaktion eine Farbschicht mit fester
 * Opazität über die Fläche, statt wie iOS die ganze View abzudunkeln.
 * Werte aus der MD3-Spec (State layers).
 */
export const MD3_STATE = {
  hover: 0.08,
  focus: 0.1,
  pressed: 0.1,
  dragged: 0.16,
} as const;

/**
 * MD3 shape scale. Material bevorzugt durchgängig kleinere Radien als das
 * iOS-Design dieser App — Buttons sind dort vollrund (full), Karten medium.
 */
export const MD3_SHAPE = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  full: 999,
} as const;

/**
 * MD3 elevation levels 0–5 als React-Native-Elevation. iOS nutzt stattdessen
 * die weichen Schatten aus PP.shadowCard / PP.shadowTabBar.
 */
export const MD3_ELEVATION = [0, 1, 3, 6, 8, 12] as const;

/**
 * Ein Radius-Wert je Plattform: iOS behält die bestehende, weichere Formsprache,
 * Android bekommt die MD3-Shape-Skala.
 */
export function radius(ios: number, android: number): number {
  return isAndroid ? android : ios;
}

/**
 * Overlay-Farbe für einen MD3 state layer. Auf iOS gibt es keine state layers —
 * dort wird stattdessen mit Opazität gearbeitet (siehe `pressedOpacity`).
 */
export function stateLayer(color: string, opacity: number): string {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/**
 * Press-Feedback: iOS dimmt die gesamte View, Android nutzt den state layer und
 * lässt die View selbst unverändert (dort kommt zusätzlich der Ripple dazu).
 */
export function pressedOpacity(pressed: boolean): number {
  if (!pressed) return 1;
  return isAndroid ? 1 : 0.7;
}

/**
 * android_ripple-Konfiguration für Pressable. Auf iOS bewusst `undefined`,
 * damit dort nichts passiert.
 */
export function ripple(color: string = PP.teal, borderless = false) {
  if (!isAndroid) return undefined;
  return { color: stateLayer(color, MD3_STATE.pressed), borderless };
}

/**
 * Plattform-Erhebung: auf Android eine MD3-Elevation-Stufe, auf iOS der
 * bestehende weiche Schatten.
 */
export function surfaceElevation(level: 0 | 1 | 2 | 3 | 4 | 5) {
  if (isAndroid) return { elevation: MD3_ELEVATION[level] };
  if (level === 0) return {};
  return PP.shadowCard;
}
