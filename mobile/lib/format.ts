import { pb } from './pb';
import type { Item, Badge, Tier } from './types';

// Badge tier progression: current tier, next tier + bar progress toward it.
const TIER_NAMES: Record<Tier, string> = {
  none: '—',
  bronze: 'Bronze',
  silber: 'Silber',
  gold: 'Gold',
  platin: 'Platin',
};

export function badgeTierInfo(badge: Badge, progress: number) {
  const steps = ([
    { tier: 'bronze', at: badge.tier_bronze },
    { tier: 'silber', at: badge.tier_silber },
    { tier: 'gold', at: badge.tier_gold },
    { tier: 'platin', at: badge.tier_platin },
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

// Point tier thresholds (visual gold target on home ring).
export const TIERS = [
  { name: 'Bronze', at: 0 },
  { name: 'Silber', at: 750 },
  { name: 'Gold', at: 1500 },
];

export function nextTier(points: number) {
  // Current rank = highest tier whose threshold is already reached.
  const current = [...TIERS].reverse().find((t) => t.at <= points) ?? TIERS[0];
  // Next rank = first tier above the current points.
  const next = TIERS.find((t) => t.at > points);
  if (!next) {
    return { current: 'Gold', name: 'Gold', remaining: 0, progress: 1, target: TIERS[TIERS.length - 1].at };
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
