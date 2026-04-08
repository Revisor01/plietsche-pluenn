import { db } from '../../db/client';
import { checkins, stores } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function findStoreById(storeId: string) {
  const result = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  return result[0] ?? null;
}

export async function lastCheckinByUser(userId: string, storeId: string) {
  const result = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.storeId, storeId)))
    .orderBy(desc(checkins.createdAt))
    .limit(1);
  return result[0] ?? null;
}

export async function insertCheckin(data: { userId: string; storeId: string; itemCount: number }) {
  await db.insert(checkins).values(data);
}
