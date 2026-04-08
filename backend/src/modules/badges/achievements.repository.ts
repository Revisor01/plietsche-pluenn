import { db } from '../../db/client';
import { achievements, userAchievements, weeklyVisits, items, checkins, pointTransactions } from '../../db/schema';
import { eq, and, count, gte, lte } from 'drizzle-orm';
import type { Achievement, AchievementWithProgress, Season } from './badges.types';

// Saison aus aktuellem Monat ermitteln
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'fruehling';
  if (month >= 6 && month <= 8) return 'sommer';
  if (month >= 9 && month <= 11) return 'herbst';
  return 'winter';
}

// ISO-Woche ermitteln: 'YYYY-WNN'
export function getISOWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Saison-Datumsbereich
function getSeasonDateRange(season: Season, year = new Date().getFullYear()) {
  const ranges: Record<Season, [number, number]> = {
    fruehling: [3, 5],
    sommer: [6, 8],
    herbst: [9, 11],
    winter: [12, 2],
  };
  const [startMonth, endMonth] = ranges[season];
  if (season === 'winter') {
    return {
      from: new Date(year - 1, 11, 1),
      to: new Date(year, 1, 28),
    };
  }
  return {
    from: new Date(year, startMonth - 1, 1),
    to: new Date(year, endMonth, 0, 23, 59, 59),
  };
}

export async function getAchievements(storeId: string): Promise<Achievement[]> {
  const rows = await db.select().from(achievements).where(eq(achievements.storeId, storeId));
  return rows as Achievement[];
}

export async function createAchievement(storeId: string, data: Omit<Achievement, 'id' | 'storeId'>) {
  const result = await db.insert(achievements).values({ storeId, ...data }).returning();
  return result[0] as Achievement;
}

export async function updateAchievement(id: string, storeId: string, data: Partial<Omit<Achievement, 'id' | 'storeId'>>) {
  const result = await db.update(achievements)
    .set(data)
    .where(and(eq(achievements.id, id), eq(achievements.storeId, storeId)))
    .returning();
  return result[0] as Achievement;
}

export async function deleteAchievement(id: string, storeId: string) {
  await db.delete(achievements).where(and(eq(achievements.id, id), eq(achievements.storeId, storeId)));
}

export async function getUserAchievements(userId: string, storeId: string): Promise<AchievementWithProgress[]> {
  const allAchievements = await getAchievements(storeId);
  const userRows = await db.select().from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const userMap = new Map(userRows.map((r) => [r.achievementId, r]));
  return allAchievements.map((a) => {
    const ua = userMap.get(a.id);
    return {
      ...a,
      progress: ua?.progress ?? 0,
      completed: ua?.completed ?? false,
      completedAt: ua?.completedAt ?? null,
    };
  });
}

export async function upsertProgress(userId: string, achievementId: string, progress: number, completed: boolean) {
  const existing = await db.select().from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)));
  if (existing.length > 0) {
    if (existing[0].completed) return existing[0]; // Bereits abgeschlossen, nicht ueberschreiben
    await db.update(userAchievements)
      .set({ progress, completed, completedAt: completed ? new Date() : null })
      .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)));
  } else {
    await db.insert(userAchievements).values({
      userId, achievementId, progress, completed,
      completedAt: completed ? new Date() : null,
    });
  }
}

// Zaehlt items_brought: Items die vom User eingestellt wurden
export async function countItemsBrought(userId: string, storeId: string): Promise<number> {
  const result = await db.select({ count: count() }).from(items)
    .where(and(eq(items.createdBy, userId), eq(items.storeId, storeId)));
  return result[0]?.count ?? 0;
}

// Zaehlt items_taken: point_transactions mit source=item_scan
export async function countItemsTaken(userId: string, storeId: string): Promise<number> {
  const result = await db.select({ count: count() }).from(pointTransactions)
    .where(and(
      eq(pointTransactions.userId, userId),
      eq(pointTransactions.storeId, storeId),
      eq(pointTransactions.source, 'item_scan'),
    ));
  return result[0]?.count ?? 0;
}

// Zaehlt Check-Ins
export async function countVisits(userId: string, storeId: string): Promise<number> {
  const result = await db.select({ count: count() }).from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.storeId, storeId)));
  return result[0]?.count ?? 0;
}

// Saison-Items-gebracht
export async function countSeasonItemsBrought(userId: string, storeId: string, season: Season): Promise<number> {
  const { from, to } = getSeasonDateRange(season);
  const result = await db.select({ count: count() }).from(items)
    .where(and(
      eq(items.createdBy, userId),
      eq(items.storeId, storeId),
      gte(items.createdAt, from),
      lte(items.createdAt, to),
    ));
  return result[0]?.count ?? 0;
}

// Saison-Items-geholt
export async function countSeasonItemsTaken(userId: string, storeId: string, season: Season): Promise<number> {
  const { from, to } = getSeasonDateRange(season);
  const result = await db.select({ count: count() }).from(pointTransactions)
    .where(and(
      eq(pointTransactions.userId, userId),
      eq(pointTransactions.storeId, storeId),
      eq(pointTransactions.source, 'item_scan'),
      gte(pointTransactions.createdAt, from),
      lte(pointTransactions.createdAt, to),
    ));
  return result[0]?.count ?? 0;
}

// weekly_visits aktualisieren
export async function recordWeeklyVisit(userId: string, storeId: string): Promise<void> {
  const week = getISOWeek();
  const existing = await db.select().from(weeklyVisits)
    .where(and(
      eq(weeklyVisits.userId, userId),
      eq(weeklyVisits.storeId, storeId),
      eq(weeklyVisits.weekStart, week),
    ));
  if (existing.length > 0) {
    await db.update(weeklyVisits)
      .set({ visitCount: existing[0].visitCount + 1 })
      .where(and(
        eq(weeklyVisits.userId, userId),
        eq(weeklyVisits.storeId, storeId),
        eq(weeklyVisits.weekStart, week),
      ));
  } else {
    await db.insert(weeklyVisits).values({ userId, storeId, weekStart: week, visitCount: 1 });
  }
}

export async function calculateStreak(userId: string, storeId: string): Promise<number> {
  const rows = await db.select({ weekStart: weeklyVisits.weekStart })
    .from(weeklyVisits)
    .where(and(eq(weeklyVisits.userId, userId), eq(weeklyVisits.storeId, storeId)));
  if (rows.length === 0) return 0;

  const currentWeek = getISOWeek();
  const lastWeek = getISOWeek(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  // Wochennummern als sortierbare Integerwerte (Jahr * 53 + KW)
  const toNum = (w: string) => {
    const [year, wStr] = w.split('-W');
    return parseInt(year) * 53 + parseInt(wStr);
  };

  const weekNums = rows.map((r) => toNum(r.weekStart)).sort((a, b) => b - a);
  const currentNum = toNum(currentWeek);
  const lastNum = toNum(lastWeek);

  // Streak laeuft nur wenn aktuelle oder letzte Woche vorhanden
  if (weekNums[0] !== currentNum && weekNums[0] !== lastNum) return 0;

  let streak = 0;
  for (let i = 0; i < weekNums.length; i++) {
    if (weekNums[i] === weekNums[0] - i) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
