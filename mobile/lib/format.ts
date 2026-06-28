import { pb } from './pb';
import { PP } from './theme';
import type { Item, Badge, Tier } from './types';

// Badge tier progression: current tier, next tier + bar progress toward it.
const TIER_NAMES: Record<Tier, string> = {
  none: '—',
  bronze: 'Bronze',
  silber: 'Silber',
  gold: 'Gold',
  platin: 'Platin',
  diamant: 'Diamant',
};

export function badgeTierInfo(badge: Badge, progress: number) {
  const steps = ([
    { tier: 'bronze', at: badge.tier_bronze },
    { tier: 'silber', at: badge.tier_silber },
    { tier: 'gold', at: badge.tier_gold },
    { tier: 'platin', at: badge.tier_platin },
    { tier: 'diamant', at: badge.tier_diamant ?? 0 },
  ] as { tier: Tier; at: number }[]).filter((s) => s.at > 0);

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
      currentName: TIER_NAMES[current],
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
    currentName: TIER_NAMES[current],
    maxed: false,
    nextName: TIER_NAMES[next.tier],
    remaining: next.at - progress,
    barProgress: Math.max(0, Math.min(1, barProgress)),
    target: next.at,
  };
}

export type TierStep = { name: string; at: number };

// Default point ranks — used until store.tiers_json is loaded. The admin can
// override these (incl. Diamant) via the global tier editor.
export const DEFAULT_TIERS: TierStep[] = [
  { name: 'Bronze', at: 0 },
  { name: 'Silber', at: 750 },
  { name: 'Gold', at: 1500 },
  { name: 'Platin', at: 3000 },
  { name: 'Diamant', at: 6000 },
];

// Current rank + progress to the next, against a configurable tier ladder.
export function nextTier(points: number, tiers: TierStep[] = DEFAULT_TIERS) {
  const ladder = (tiers && tiers.length ? tiers : DEFAULT_TIERS).slice().sort((a, b) => a.at - b.at);
  const current = [...ladder].reverse().find((t) => t.at <= points) ?? ladder[0];
  const next = ladder.find((t) => t.at > points);
  if (!next) {
    const top = ladder[ladder.length - 1];
    return { current: top.name, name: top.name, remaining: 0, progress: 1, target: top.at };
  }
  const span = next.at - current.at;
  const progress = span > 0 ? (points - current.at) / span : 1;
  return {
    current: current.name,
    name: next.name,
    remaining: next.at - points,
    progress: Math.max(0, Math.min(1, progress)),
    target: next.at,
  };
}

export function formatPoints(n: number) {
  return n.toLocaleString('de-DE');
}

// Colour for a rank/tier name (case-insensitive). Falls back to bronze.
export function tierColor(name?: string) {
  switch ((name ?? '').toLowerCase()) {
    case 'diamant': return PP.diamant;
    case 'platin': return PP.platin;
    case 'gold': return PP.gold;
    case 'silber': return PP.silver;
    default: return PP.bronze;
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
