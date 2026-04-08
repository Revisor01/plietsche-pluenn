import { db } from '../../db/client';
import { userAchievements } from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import * as repo from './achievements.repository';
import type { Achievement, AchievementEvent, Season } from './badges.types';

// Gibt Array neu freigeschalteter Achievements zurueck
export async function evaluateAchievements(
  userId: string,
  storeId: string,
  event: AchievementEvent,
): Promise<Achievement[]> {
  const allAchievements = await repo.getAchievements(storeId);
  const currentSeason = repo.getCurrentSeason();
  const newlyCompleted: Achievement[] = [];

  // Vor dem Loop: bereits abgeschlossene Achievements laden
  const existingCompletedRows = await db.select({ achievementId: userAchievements.achievementId })
    .from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.completed, true)));
  const existingCompleted = new Set(existingCompletedRows.map((r) => r.achievementId));

  // Bei Check-In: weekly_visits aktualisieren
  if (event === 'checkin') {
    await repo.recordWeeklyVisit(userId, storeId);
  }

  // Lazy-Cache fuer Zaehler
  const counts: Partial<Record<string, number>> = {};

  async function getCount(key: string, fn: () => Promise<number>): Promise<number> {
    if (counts[key] === undefined) counts[key] = await fn();
    return counts[key]!;
  }

  for (const achievement of allAchievements) {
    let currentValue = 0;

    switch (achievement.triggerType) {
      case 'items_brought':
        currentValue = await getCount('items_brought', () => repo.countItemsBrought(userId, storeId));
        break;
      case 'items_taken':
        currentValue = await getCount('items_taken', () => repo.countItemsTaken(userId, storeId));
        break;
      case 'visits':
        currentValue = await getCount('visits', () => repo.countVisits(userId, storeId));
        break;
      case 'streak_weeks':
        currentValue = await getCount('streak_weeks', () => repo.calculateStreak(userId, storeId));
        break;
      case 'season_items_brought':
        if (!achievement.season || achievement.season === currentSeason) {
          const key = `season_brought_${achievement.season ?? currentSeason}`;
          currentValue = await getCount(key, () =>
            repo.countSeasonItemsBrought(userId, storeId, (achievement.season ?? currentSeason) as Season),
          );
        }
        break;
      case 'season_items_taken':
        if (!achievement.season || achievement.season === currentSeason) {
          const key = `season_taken_${achievement.season ?? currentSeason}`;
          currentValue = await getCount(key, () =>
            repo.countSeasonItemsTaken(userId, storeId, (achievement.season ?? currentSeason) as Season),
          );
        }
        break;
      case 'milestone': {
        const nameLower = achievement.name.toLowerCase();
        if (nameLower.includes('besuch')) {
          currentValue = event === 'checkin'
            ? await getCount('visits', () => repo.countVisits(userId, storeId))
            : 0;
        } else if (nameLower.includes('teil gebracht') || nameLower.includes('erstes teil')) {
          currentValue = await getCount('items_brought', () => repo.countItemsBrought(userId, storeId));
        } else if (nameLower.includes('100') || nameLower.includes('insgesamt')) {
          const brought = await getCount('items_brought', () => repo.countItemsBrought(userId, storeId));
          const taken = await getCount('items_taken', () => repo.countItemsTaken(userId, storeId));
          currentValue = brought + taken;
        }
        break;
      }
    }

    const completed = currentValue >= achievement.triggerValue;
    await repo.upsertProgress(userId, achievement.id, Math.min(currentValue, achievement.triggerValue), completed);

    if (completed && !existingCompleted.has(achievement.id)) {
      newlyCompleted.push(achievement);
    }
  }

  return newlyCompleted;
}
