import { db } from '../../db/client';
import { items, users, pointTransactions } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function findItemByQrToken(qrToken: string, storeId: string) {
  const result = await db
    .select()
    .from(items)
    .where(and(eq(items.qrToken, qrToken), eq(items.storeId, storeId)))
    .limit(1);
  return result[0] ?? null;
}

export async function markItemTaken(itemId: string) {
  await db.update(items).set({ status: 'taken' }).where(eq(items.id, itemId));
}

export async function awardPoints(
  userId: string,
  storeId: string,
  points: number,
  source: 'item_scan' | 'checkin' | 'manual_items',
): Promise<number> {
  await db.insert(pointTransactions).values({ userId, storeId, points, source });
  await db
    .update(users)
    .set({ plietschPoints: sql`${users.plietschPoints} + ${points}` })
    .where(eq(users.id, userId));
  const updated = await db
    .select({ plietschPoints: users.plietschPoints })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return updated[0]?.plietschPoints ?? 0;
}
