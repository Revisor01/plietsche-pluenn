import { pb } from './pb';
import { PP } from './theme';
import type { Item, Badge, Tier } from './types';

// ── Kategorien — eine einzige Quelle für die ganze App ──────────
// Eine Kategorie besteht aus Zielgruppe (group) und optionaler Art (type).
// Der gespeicherte category-Key ist "<group>-<type>" (z.B. "damen-hose") oder
// eine reine Gruppe ("kinder", "accessoires", "sonstiges").
export const CATEGORY_GROUPS: { key: string; label: string }[] = [
  { key: 'damen', label: 'Damen' },
  { key: 'herren', label: 'Herren' },
  { key: 'kinder', label: 'Kinder' },
  { key: 'accessoires', label: 'Accessoires' },
  { key: 'sonstiges', label: 'Sonstiges' },
];

export const CATEGORY_TYPES: { key: string; label: string }[] = [
  { key: 'oberteil', label: 'Oberteile' },
  { key: 'hose', label: 'Hosen' },
  { key: 'kleid', label: 'Kleider' },
  { key: 'schuhe', label: 'Schuhe' },
];

// Nur Damen/Herren haben eine Art-Unterteilung.
export const GROUPS_WITH_TYPE = ['damen', 'herren'];

export function categoryGroup(category?: string): string {
  const c = `${category || ''}`;
  if (c.startsWith('damen')) return 'damen';
  if (c.startsWith('herren')) return 'herren';
  if (c.startsWith('kinder')) return 'kinder';
  if (c.startsWith('accessoires')) return 'accessoires';
  return 'sonstiges';
}

export function categoryType(category?: string): string | null {
  const c = `${category || ''}`;
  const dash = c.indexOf('-');
  return dash >= 0 ? c.slice(dash + 1) : null;
}

// Klartext-Label für einen category-Key, z.B. "damen-hose" → "Damen · Hosen".
export function categoryLabel(category?: string): string {
  const g = CATEGORY_GROUPS.find((x) => x.key === categoryGroup(category));
  const t = CATEGORY_TYPES.find((x) => x.key === categoryType(category));
  if (!g) return '';
  return t ? `${g.label} · ${t.label}` : g.label;
}

// Nur die Zielgruppe als Label ("Damen" / "Kinder" …).
export function groupLabel(category?: string): string {
  return CATEGORY_GROUPS.find((x) => x.key === categoryGroup(category))?.label ?? '';
}

// Nur die Art als Label ("Hosen" …) oder '' wenn keine.
export function typeLabel(category?: string): string {
  return CATEGORY_TYPES.find((x) => x.key === categoryType(category))?.label ?? '';
}

const CONDITION_LABELS: Record<string, string> = {
  neu: 'Neu',
  'sehr-gut': 'Sehr gut',
  gut: 'Gut',
  gebraucht: 'Gebraucht',
};
export function conditionLabel(condition?: string): string {
  return CONDITION_LABELS[`${condition || ''}`] ?? '';
}

// Badge tier progression: current tier, next tier + bar progress toward it.
const TIER_NAMES: Record<Tier, string> = {
  none: '—',
  bronze: 'Bronze',
  silber: 'Silber',
  gold: 'Gold',
  platin: 'Platin',
  diamant: 'Diamant',
};

/**
 * Die fünf Abzeichen-Stufen in fester Reihenfolge. Namen und Anzahl kommen aus
 * den Rängen unter „Punkte & Ränge" (store.tiers_json): Wer dort vier Ränge
 * pflegt, sieht an jedem Abzeichen vier Stufen — mit den dort vergebenen Namen.
 *
 * Intern bleiben es die Spalten bronze…diamant: An ihnen hängen Vergabelogik,
 * current_tier bei jedem Nutzer und die Medaillon-Farben. Ränge ab dem sechsten
 * haben deshalb keine Entsprechung und bleiben für Abzeichen außen vor.
 */
export function badgeTierSlots(ranks?: TierStep[] | null): { tier: Exclude<Tier, 'none'>; name: string }[] {
  const order: Exclude<Tier, 'none'>[] = ['bronze', 'silber', 'gold', 'platin', 'diamant'];
  const named = (ranks ?? []).slice().sort((a, b) => a.at - b.at);
  const count = named.length ? Math.min(named.length, order.length) : order.length;
  return order.slice(0, count).map((tier, i) => ({
    tier,
    name: named[i]?.name?.trim() || TIER_NAMES[tier],
  }));
}

export function badgeTierInfo(badge: Badge, progress: number, ranks?: TierStep[] | null) {
  const slots = badgeTierSlots(ranks);
  const names: Partial<Record<Tier, string>> = {};
  for (const s of slots) names[s.tier] = s.name;
  const label = (t: Tier) => names[t] ?? TIER_NAMES[t];

  const values: Record<string, number> = {
    bronze: badge.tier_bronze,
    silber: badge.tier_silber,
    gold: badge.tier_gold,
    platin: badge.tier_platin,
    diamant: badge.tier_diamant ?? 0,
  };
  // Nur Stufen, die es als Rang gibt UND für die ein Ziel eingetragen ist.
  const steps = slots
    .map((s) => ({ tier: s.tier as Tier, at: values[s.tier] ?? 0 }))
    .filter((s) => s.at > 0);

  let current: Tier = 'none';
  let currentAt = 0;
  for (const s of steps) {
    if (progress >= s.at) {
      current = s.tier;
      currentAt = s.at;
    }
  }
  const next = steps.find((s) => s.at > progress);

  if (!next) {
    return {
      current,
      currentName: label(current),
      maxed: true,
      nextName: null as string | null,
      remaining: 0,
      barProgress: 1,
      target: currentAt,
    };
  }
  const span = next.at - currentAt;
  const barProgress = span > 0 ? (progress - currentAt) / span : 0;
  return {
    current,
    currentName: label(current),
    maxed: false,
    nextName: label(next.tier),
    remaining: next.at - progress,
    barProgress: Math.max(0, Math.min(1, barProgress)),
    target: next.at,
  };
}

export type TierStep = { name: string; at: number };

// Default point ranks — used until store.tiers_json is loaded. The admin can
// override these (incl. Diamant) via the global tier editor. Even Bronze must
// be earned: below the first threshold the user has no rank yet ("—").
export const DEFAULT_TIERS: TierStep[] = [
  { name: 'Bronze', at: 150 },
  { name: 'Silber', at: 750 },
  { name: 'Gold', at: 1500 },
  { name: 'Platin', at: 3000 },
  { name: 'Diamant', at: 6000 },
];

// Current rank + progress to the next, against a configurable tier ladder.
// Below the lowest threshold there is no rank yet — current is '—' and progress
// counts up toward the first rank (Bronze).
export function nextTier(points: number, tiers: TierStep[] = DEFAULT_TIERS) {
  const ladder = (tiers && tiers.length ? tiers : DEFAULT_TIERS).slice().sort((a, b) => a.at - b.at);
  const current = [...ladder].reverse().find((t) => t.at <= points) ?? null;
  const next = ladder.find((t) => t.at > points);
  if (!next) {
    const top = ladder[ladder.length - 1];
    return { current: top.name, name: top.name, remaining: 0, progress: 1, target: top.at };
  }
  // Span starts at 0 (no rank yet) or at the current rank's threshold.
  const from = current ? current.at : 0;
  const span = next.at - from;
  const progress = span > 0 ? (points - from) / span : 1;
  return {
    current: current ? current.name : '—',
    name: next.name,
    remaining: next.at - points,
    progress: Math.max(0, Math.min(1, progress)),
    target: next.at,
  };
}

export function formatPoints(n: number) {
  return n.toLocaleString('de-DE');
}

// Reader-friendly label for a campaign's points multiplier, so users see what
// an action gets them. ×2 → "Doppelte Punkte", ×3 → "Dreifach-Punkte",
// everything else → "×N Punkte" (e.g. ×1,5).
export function campaignBonusLabel(multiplier?: number) {
  const m = multiplier ?? 1;
  if (m >= 3) return 'Dreifach-Punkte';
  if (m === 2) return 'Doppelte Punkte';
  if (m > 1) return `${m.toLocaleString('de-DE')}× Punkte`;
  return '';
}

// Per-type factors of a campaign, listing every type that differs from ×1.
// A campaign can boost coming by ×3, taking by ×1,5 and bringing by ×2 — showing
// only the leading multiplier would hide two thirds of that.
// Falls back to the legacy single `multiplier` for campaigns created before the
// per-type fields existed.
export function campaignFactors(c?: {
  mult_visit?: number;
  mult_take?: number;
  mult_bring?: number;
  multiplier?: number;
}): { label: string; factor: number }[] {
  if (!c) return [];
  const { mult_visit: v, mult_take: t, mult_bring: b } = c;
  if (v == null && t == null && b == null) {
    const m = c.multiplier ?? 1;
    return m > 1 ? [{ label: 'Punkte', factor: m }] : [];
  }
  const out: { label: string; factor: number }[] = [];
  if ((v ?? 1) > 1) out.push({ label: 'Vorbeikommen', factor: v! });
  if ((t ?? 1) > 1) out.push({ label: 'Mitnehmen', factor: t! });
  if ((b ?? 1) > 1) out.push({ label: 'Bringen', factor: b! });
  return out;
}

// "Vorbeikommen ×3 · Mitnehmen ×1,5 · Bringen ×2" — empty when nothing is boosted.
export function campaignFactorsLabel(c?: {
  mult_visit?: number;
  mult_take?: number;
  mult_bring?: number;
  multiplier?: number;
}): string {
  return campaignFactors(c)
    .map((f) => `${f.label} ×${f.factor.toLocaleString('de-DE')}`)
    .join(' · ');
}

// Colour for a rank/tier name (case-insensitive). No rank yet ("—") is neutral.
export function tierColor(name?: string) {
  switch ((name ?? '').toLowerCase()) {
    case 'diamant': return PP.diamant;
    case 'platin': return PP.platin;
    case 'gold': return PP.gold;
    case 'silber': return PP.silver;
    case 'bronze': return PP.bronze;
    default: return PP.ink3; // "—" / kein Rang
  }
}

export function itemThumb(item: Item, size = '400x400') {
  if (!item.photo) return null;
  return pb.files.getURL(item as any, item.photo, { thumb: size });
}

export function relativeDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
}

export function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Motivation auf der Startseite ──────────────────────────────
// Statt zweier fester Sätze: die passendste Situation gewinnt. Reihenfolge =
// Priorität — je konkreter der Anlass, desto weiter oben.

export interface Motivation {
  /** Kurzer Chip über dem Text. */
  pill: string;
  /** Icon des Chips (Name aus lib/icons). */
  icon: string;
  /** Farbe des Chips. */
  tone: 'warn' | 'teal' | 'sky';
  /** Der Motivationssatz. */
  text: string;
}

export interface MotivationInput {
  streakWeeks: number;
  /** Punkte bis zum nächsten Rang; 0 = höchster Rang erreicht. */
  tierRemaining: number;
  tierName: string;
  /** Name einer gerade laufenden Aktion, falls es eine gibt. */
  campaignName?: string | null;
  /** Bonus-Text der Aktion, z.B. 'Doppelte Punkte'. */
  campaignBonus?: string | null;
  /** Tage seit dem letzten Besuch; null = noch nie da gewesen. */
  daysSinceVisit: number | null;
  /** Gesamtpunkte — unterscheidet "neu" von "war lange nicht da". */
  totalPoints: number;
}

export function motivationFor(input: MotivationInput): Motivation {
  const { streakWeeks, tierRemaining, tierName, campaignName, campaignBonus, daysSinceVisit, totalPoints } = input;

  // 1. Ganz neu — noch nie da gewesen.
  if (daysSinceVisit === null && totalPoints === 0) {
    return {
      pill: 'Leg los',
      icon: 'sparkles',
      tone: 'teal',
      text: 'Check beim nächsten Besuch ein und sammle deine ersten Punkte.',
    };
  }

  // 2. Kurz vor dem nächsten Rang — der stärkste Anreiz, wenn er greifbar ist.
  if (tierRemaining > 0 && tierRemaining <= 50) {
    return {
      pill: `Fast ${tierName}`,
      icon: 'medal',
      tone: 'warn',
      text: `Nur noch ${formatPoints(tierRemaining)} Punkte — dann bist du ${tierName}.`,
    };
  }

  // 3. Läuft gerade eine Aktion? Dann lohnt sich der Besuch doppelt.
  if (campaignName) {
    return {
      pill: campaignBonus || 'Aktion läuft',
      icon: 'flame',
      tone: 'warn',
      text: `„${campaignName}" läuft gerade — jetzt vorbeikommen lohnt sich besonders.`,
    };
  }

  // 4. Streak in Gefahr (über eine Woche nicht da).
  if (streakWeeks > 0 && daysSinceVisit !== null && daysSinceVisit >= 7) {
    return {
      pill: `${streakWeeks} ${streakWeeks === 1 ? 'Woche' : 'Wochen'} Streak`,
      icon: 'flame',
      tone: 'warn',
      text: 'Dein Streak wackelt! Komm diese Woche vorbei, dann bleibt er dir erhalten.',
    };
  }

  // 5. Streak läuft.
  if (streakWeeks > 0) {
    return {
      pill: `${streakWeeks} ${streakWeeks === 1 ? 'Woche' : 'Wochen'} Streak`,
      icon: 'flame',
      tone: 'warn',
      text: "Watt'n Lauf! Komm diese Woche vorbei, dann hältst du dein Streak.",
    };
  }

  // 6. War schon da, aber länger nicht mehr.
  if (daysSinceVisit !== null && daysSinceVisit >= 21) {
    return {
      pill: 'Lang nicht gesehen',
      icon: 'sparkles',
      tone: 'sky',
      text: 'Schön, dass du wieder da bist — im Laden wartet neue Ware auf dich.',
    };
  }

  // 7. Standard: dran bleiben.
  if (tierRemaining > 0) {
    return {
      pill: 'Dabei',
      icon: 'sparkles',
      tone: 'teal',
      text: `Weiter so — mit jedem Besuch kommst du ${tierName} näher.`,
    };
  }

  // 8. Höchster Rang erreicht.
  return {
    pill: 'Spitzenreiter',
    icon: 'medal',
    tone: 'warn',
    text: 'Du hast den höchsten Rang erreicht. Schön, dass du dabei bist!',
  };
}

// ── Aushang-Farben ─────────────────────────────────────────────
// Aktionen und Ankündigungen können im Admin eine eigene Akzentfarbe bekommen.
// Leer/ungültig → null, dann greift die Standardoptik.

/** '#27b092' oder '27b092' → '#27b092'. Ungültiges → null. */
export function normalizeHex(value?: string | null): string | null {
  const v = `${value ?? ''}`.trim();
  if (!v) return null;
  const hex = v.startsWith('#') ? v.slice(1) : v;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toLowerCase()}`;
}

/** Hex + Deckkraft → rgba(). Für dezente Icon-Hintergründe. */
export function withAlpha(hex: string, alpha: number): string {
  const h = normalizeHex(hex);
  if (!h) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Hex um `amount` aufhellen (0..1) — erzeugt das helle Ende des Verlaufs. */
function lighten(hex: string, amount: number): string {
  const h = normalizeHex(hex) ?? '#000000';
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix(parseInt(h.slice(1, 3), 16));
  const g = mix(parseInt(h.slice(3, 5), 16));
  const b = mix(parseInt(h.slice(5, 7), 16));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Verlauf für eine Aktions-Karte. Ohne eigene Farbe bleibt es beim
 * Marken-Verlauf; mit Farbe wird ein Verlauf aus ihr gezogen (satt → hell),
 * damit der Aushang bunter werden kann, ohne dass Text darauf untergeht.
 */
export function accentGradient(color?: string | null): readonly [string, string, string] | undefined {
  const base = normalizeHex(color);
  if (!base) return undefined; // → GradientCard nutzt PP.gradient
  return [base, lighten(base, 0.22), lighten(base, 0.42)] as const;
}
