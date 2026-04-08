import { db } from '../../db/client';
import { users, pointTransactions, storeSettings } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getBalance(userId: string): Promise<number> {
  const result = await db.select({ plietschPoints: users.plietschPoints })
    .from(users).where(eq(users.id, userId)).limit(1);
  return result[0]?.plietschPoints ?? 0;
}

export async function getTransactionHistory(userId: string, _storeId: string, limit = 50) {
  return db.select({
    id: pointTransactions.id,
    source: pointTransactions.source,
    points: pointTransactions.points,
    createdAt: pointTransactions.createdAt,
  })
  .from(pointTransactions)
  .where(eq(pointTransactions.userId, userId))
  .orderBy(desc(pointTransactions.createdAt))
  .limit(limit);
  // Kein itemId im SELECT — PUNKT-03 Locked Decision
}

export async function getStoreSettings(storeId: string) {
  const result = await db.select().from(storeSettings)
    .where(eq(storeSettings.storeId, storeId)).limit(1);
  // Fallback auf Defaults wenn kein Eintrag vorhanden
  return result[0] ?? {
    pointsPerScan: 10,
    pointsPerCheckin: 5,
    pointsPerItem: 3,
    maxItemsPerCheckin: 10,
  };
}

export async function upsertStoreSettings(storeId: string, data: {
  pointsPerScan?: number;
  pointsPerCheckin?: number;
  pointsPerItem?: number;
  maxItemsPerCheckin?: number;
}) {
  await db.insert(storeSettings)
    .values({ storeId, ...data })
    .onConflictDoUpdate({
      target: storeSettings.storeId,
      set: { ...data, updatedAt: sql`now()` },
    });
}
