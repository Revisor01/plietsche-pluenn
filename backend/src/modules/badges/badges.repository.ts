import { db } from '../../db/client';
import { badgeLevels } from '../../db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { getBalance } from '../points/points.repository';
import type { BadgeProgress } from './badges.types';

export async function getLevels(storeId: string) {
  return db.select().from(badgeLevels)
    .where(eq(badgeLevels.storeId, storeId))
    .orderBy(asc(badgeLevels.sortOrder), asc(badgeLevels.minPoints));
}

export async function addLevel(storeId: string, data: { name: string; emoji: string; minPoints: number; sortOrder: number }) {
  const result = await db.insert(badgeLevels).values({ storeId, ...data }).returning();
  return result[0];
}

export async function deleteLevel(id: string, storeId: string) {
  await db.delete(badgeLevels)
    .where(and(eq(badgeLevels.id, id), eq(badgeLevels.storeId, storeId)));
}

export async function getBadgeProgress(userId: string, storeId: string): Promise<BadgeProgress> {
  const currentPoints = await getBalance(userId);
  const levels = await getLevels(storeId);

  if (levels.length === 0) {
    return { currentLevel: null, nextLevel: null, progressPercent: 0, pointsToNext: null, currentPoints };
  }

  // Aktuelles Level: letztes Level dessen minPoints <= currentPoints
  const eligible = levels.filter((l) => l.minPoints <= currentPoints);
  const currentLevel = eligible.length > 0 ? eligible[eligible.length - 1] : null;

  // Nächstes Level: erstes Level dessen minPoints > currentPoints
  const above = levels.filter((l) => l.minPoints > currentPoints);
  const nextLevel = above.length > 0 ? above[0] : null;

  let progressPercent = 0;
  let pointsToNext: number | null = null;

  if (currentLevel && nextLevel) {
    const range = nextLevel.minPoints - currentLevel.minPoints;
    const progress = currentPoints - currentLevel.minPoints;
    progressPercent = Math.min(100, Math.round((progress / range) * 100));
    pointsToNext = nextLevel.minPoints - currentPoints;
  } else if (currentLevel && !nextLevel) {
    progressPercent = 100; // Max Level erreicht
    pointsToNext = null;
  } else if (!currentLevel && nextLevel) {
    // Unter dem ersten Level (sollte nicht passieren wenn Neuling bei 0)
    progressPercent = 0;
    pointsToNext = nextLevel.minPoints - currentPoints;
  }

  return {
    currentLevel: currentLevel ? { name: currentLevel.name, emoji: currentLevel.emoji, minPoints: currentLevel.minPoints } : null,
    nextLevel: nextLevel ? { name: nextLevel.name, emoji: nextLevel.emoji, minPoints: nextLevel.minPoints } : null,
    progressPercent,
    pointsToNext,
    currentPoints,
  };
}
