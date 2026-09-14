// Design tokens — die EINE Stelle für Farben, Abstände, Schriftgrößen, Radien,
// Icon-Größen und Schatten. In Screens und Komponenten nie hart kodieren:
// `PP.<token>` für Farben und Maße, `alpha(farbe, stufe)` für getönte Flächen.
//
// Grundlage: docs/audit/theme.md (Bestandsaufnahme 14.09.2026).

import { Platform, StyleSheet } from 'react-native';
import type { IconName } from './icons';

// ---------------------------------------------------------------------------
// Rohfarben — die einzige Stelle im Projekt mit Hex-Literalen.
// ---------------------------------------------------------------------------
const RAW = {
  // Markenverlauf (teal -> mint -> sky)
  teal: '#27b092',
  mint: '#79c4b0',
  sky: '#80b4e2',

  // Derselbe Verlauf, abgedunkelt — ausschließlich für Flächen, auf denen
  // weißer Text steht (Primärknopf, aktive Auswahl-Pille).
  //
  // Warum: Weiß auf dem hellen Markenverlauf erreicht 2,72:1 (teal), 2,03:1
  // (mint) und 2,20:1 (sky). Gefordert sind 4,5:1 für Fließtext; als „großer
  // Text" (3:1) zählt bei fontScale 1.15 erst `lg` ab 19,6 pt, also fast keine
  // Schrift der App. Mit Faktor 0,64 liegt der schlechteste Punkt des Verlaufs
  // bei 4,68:1 — die Marke bleibt erkennbar (rund zwei Drittel der bisherigen
  // Farbspannweite zwischen den Stufen), der Text wird lesbar.
  //
  // Der helle Verlauf oben bleibt unverändert und gilt weiter für alles, was
  // keine weiße Schrift trägt: Ringe, Karten, Verlaufsflächen.
  tealDeep: '#18705d',
  mintDeep: '#4d7d70',
  skyDeep: '#517390',

  // Flächen — wärmer als reines Weiß
  bg: '#F4F7F4',
  surface: '#FFFFFF',
  sand: '#F4EFE6',
  sandDeep: '#EBE3D2',
  sandInk: '#8a6d3a', // Schrift/Icon auf Sandfläche (Ladenkachel ohne Foto)
  inkDeep: '#0e1c1b', // Vollbild-Dunkelgrund (Scanner, Aushang-Vorschau)

  // Text
  ink: '#1A2E2C',
  ink2: '#5A6B6A',
  // Nebentext: Feld-Beschriftungen, Platzhalter, Zeitstempel, Meta-Zeilen.
  // War #9AA8A7 — 2,46:1 auf Weiß, 2,28:1 auf dem Seitengrund. Gefordert sind
  // 4,5:1, und diese Farbe steht fast immer in xs oder sm.
  //
  // Der Wert ist gegen beide tatsächlich vorkommenden Gründe gerechnet, nicht
  // nur gegen Weiß: 4,88:1 auf `surface`, 4,53:1 auf `bg`. (`sand` trägt nur
  // den Avatar, `sandDeep` wird nirgends als Hintergrund benutzt — dort steht
  // kein Nebentext.)
  //
  // Weiter abzudunkeln bringt nichts: Schon ink2 selbst erreicht auf sandDeep
  // nur 4,39:1; wer ink3 dort über 4,5 bringen wollte, müsste es mit ink2
  // zusammenfallen lassen und verlöre die Abstufung Haupt-/Zweit-/Nebentext.
  ink3: '#657473',
  hairline: '#E5EDEB',
  onBrand: '#FFFFFF', // Text/Icon auf gefärbtem Grund

  // Semantik
  warn: '#E8A93B',
  err: '#D9534F',
  errLight: '#ffb3b0', // Fehlertext auf dunklem Grund — `err` wäre dort unlesbar
  ok: '#27b092',

  // Ränge
  bronze: '#CD7F32',
  silver: '#B8B8B8',
  gold: '#E8B923',
  platin: '#7FB6C9',
  diamant: '#6FD3E8',

  // Druck: die gestrichelte Schnittlinie auf dem QR-Blatt. Bewusst dunkler als
  // `hairline` — Papier braucht mehr Kontrast als ein Display.
  printCut: '#B7C4C2',
} as const;

/** Deckkraft-Leiter: sechs Stufen statt 30 gestreuter Einzelwerte. */
export const ALPHA = {
  ghost: 0.05,
  subtle: 0.08,
  soft: 0.12,
  medium: 0.18,
  strong: 0.35,
  veil: 0.5,
} as const;

export type AlphaStep = keyof typeof ALPHA;

/**
 * Hex-Farbe + Deckkraft → `rgba(...)`. Die Deckkraft ist entweder eine Stufe
 * der Leiter (`alpha(PP.ink, 'soft')`) oder — nur wo die Leiter nicht passt,
 * etwa bei Text auf gefärbtem Grund — eine Zahl.
 */
export function alpha(hex: string, step: AlphaStep | number): string {
  const a = typeof step === 'number' ? step : ALPHA[step];
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const PP = {
  ...RAW,

  // ── Verlauf und Schleier ─────────────────────────────────────────────────
  gradient: [RAW.teal, RAW.mint, RAW.sky] as const,
  /**
   * Der Markenverlauf für Flächen mit weißem Text — Primärknopf, aktive
   * Auswahl-Pille. Schlechtester Punkt 4,68:1 statt 2,03:1 beim hellen
   * Verlauf. Überall sonst gilt `gradient`.
   */
  gradientOnDark: [RAW.tealDeep, RAW.mintDeep, RAW.skyDeep] as const,
  gradientSoft: [
    alpha(RAW.teal, 'soft'),
    alpha(RAW.mint, 'soft'),
    alpha(RAW.sky, 'soft'),
  ] as const,
  gradientAngle: 135,
  glass: alpha(RAW.surface, 0.65),
  glassDark: alpha(RAW.ink, 0.55),
  /** Abdunklung hinter Overlays und Modalen. */
  scrim: alpha(RAW.inkDeep, 'veil'),

  /** Text auf gefärbtem Grund, zwei Abstufungen unter `onBrand`. */
  onBrandMuted: alpha(RAW.surface, 0.85),
  onBrandFaint: alpha(RAW.surface, 0.7),

  // ── Ränge ────────────────────────────────────────────────────────────────
  /** Rangfarben mit ihrem hellen Gegenstück (Verlauf auf der Medaille). */
  tier: {
    bronze: { base: RAW.bronze, light: '#E89E58' },
    silber: { base: RAW.silver, light: '#E0E0E0' },
    gold: { base: RAW.gold, light: '#FFD658' },
    platin: { base: RAW.platin, light: '#B9DCE8' },
    diamant: { base: RAW.diamant, light: '#B6ECF6' },
  },

  /**
   * Auswahlpalette für Aushänge. Das sind Daten — die Menge der Farben, die
   * das Team einem Aushang geben darf —, keine UI-Rollen.
   */
  accents: [
    { name: 'Teal', hex: RAW.teal },
    { name: 'Sky', hex: RAW.sky },
    { name: 'Beere', hex: '#b0478a' },
    { name: 'Koralle', hex: '#e2664f' },
    { name: 'Bernstein', hex: '#d99320' },
    { name: 'Wald', hex: '#4a8c56' },
    { name: 'Pflaume', hex: '#7a5aa8' },
    { name: 'Nordsee', hex: '#2d6e8e' },
  ] as const,

  // ── Abstände: 4er-Raster, sieben Stufen ──────────────────────────────────
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    huge: 32,
  },

  // ── Radien ───────────────────────────────────────────────────────────────
  rMicro: 6, // QR-Rahmen, Sheet-Griff, Fortschrittsbalken
  rTile2: 12, // Icon-Kachel — der häufigste Radius der App
  rField: 14, // Eingabefeld, Hinweisblock
  rBtn: 16, // Knopf, groß
  rTile: 18, // Kachel, Bildfläche
  rCard: 22, // Karte
  rSheet: 28, // Oberkante Bottom Sheet
  rPill: 999,

  // ── Typografie ───────────────────────────────────────────────────────────
  // Globaler Faktor über ALLE Schriftgrößen. Einzelne Stufen ändert man
  // dagegen direkt in `fontSizes`.
  fontScale: 1.15,
  font: {
    regular: 'WorkSans_400Regular',
    medium: 'WorkSans_500Medium',
    semibold: 'WorkSans_600SemiBold',
    bold: 'WorkSans_700Bold',
  },
  /** Entwurfsgrößen; `fontScale` kommt in PPText obendrauf. */
  fontSizes: {
    xs: 10.5,
    sm: 11.5,
    base: 13.5,
    md: 15,
    lg: 17,
    xl: 22,
    xl2: 24, // Kennzahlen auf Karten
    xxl: 28,
    hero: 32,
  },
  /** Zeilenhöhe als Verhältnis zur Schriftgröße. */
  leading: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.45,
    loose: 1.6,
  },
  /** Laufweite: große Überschriften verdichtet, Kleinschrift gesperrt. */
  tracking: {
    hero: -0.8,
    title: -0.4,
    body: 0,
    label: 0.3,
    caps: 0.4,
  },

  // ── Icons ────────────────────────────────────────────────────────────────
  iconSizes: {
    xs: 12,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 28,
    hero: 48,
  },
  /** Was ein Symbol BEDEUTET — die Zuordnung ist eine Design-Entscheidung. */
  icon: {
    back: 'chevron-left',
    forward: 'chevron-right',
    close: 'x',
    itemPlaceholder: 'shirt',
    external: 'map-pin',
  } as Record<string, IconName>,

  // ── Maße wiederkehrender Elemente ────────────────────────────────────────
  /** Kantenlänge der quadratischen Icon-Kachel (siehe IconTile). */
  tile: { s: 40, m: 44, l: 48 },
  /** Mindestmaß einer Antippfläche. */
  touchTarget: 44,
  border: { hair: StyleSheet.hairlineWidth, thin: 1 },

  // ── Schatten ─────────────────────────────────────────────────────────────
  shadowCard: {
    shadowColor: RAW.ink,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  shadowTabBar: {
    shadowColor: RAW.ink,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  // ── Bewegung ─────────────────────────────────────────────────────────────
  motion: {
    fast: 150, // Schalter
    base: 220, // Ein- und Ausblenden
    spring: { damping: 16, stiffness: 160 },
  },
} as const;

// `PPTheme = typeof PP` stand hier ohne einen einzigen Verwender. Wer die Form
// der Palette als Typ braucht, schreibt `typeof PP` — das ist kürzer als der
// Import und läuft nicht Gefahr, veraltet neben `PP` stehen zu bleiben.

/**
 * Farbiger Glanz unter einem Markenelement — drei Stufen statt vier von Hand
 * gesetzter Schattenblöcke, die alle dasselbe meinten.
 */
const GLOW = {
  s: { opacity: 0.32, radius: 18, y: 6, elevation: 4 },
  m: { opacity: 0.3, radius: 30, y: 14, elevation: 8 },
  l: { opacity: 0.3, radius: 50, y: 20, elevation: 8 },
} as const;

export function glow(color: string, level: keyof typeof GLOW = 'm') {
  const g = GLOW[level];
  return {
    shadowColor: color,
    shadowOpacity: g.opacity,
    shadowRadius: g.radius,
    shadowOffset: { width: 0, height: g.y },
    elevation: g.elevation,
  };
}

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

/**
 * MD3 shape scale. Material bevorzugt durchgängig kleinere Radien als das
 * iOS-Design dieser App — Buttons sind dort vollrund (full), Karten medium.
 */
const MD3_SHAPE = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  full: 999,
} as const;

/**
 * Ein Radius-Wert je Plattform: iOS behält die bestehende, weichere
 * Formsprache, Android bekommt die MD3-Shape-Skala.
 */
export function radius(ios: number, android: keyof typeof MD3_SHAPE): number {
  return isAndroid ? MD3_SHAPE[android] : ios;
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
  // MD3 state layer „pressed": 10 % Deckkraft über der Fläche.
  return { color: alpha(color, 0.1), borderless };
}

/**
 * Plattform-Erhebung: auf Android eine MD3-Elevation-Stufe, auf iOS der
 * bestehende weiche Schatten.
 */
const MD3_ELEVATION = [0, 1, 3, 6, 8, 12] as const;

export function surfaceElevation(level: 0 | 1 | 2 | 3 | 4 | 5) {
  if (isAndroid) return { elevation: MD3_ELEVATION[level] };
  if (level === 0) return {};
  return PP.shadowCard;
}
