import { db } from '../../db/client';
import { stores } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { UpdateStoreBody } from './stores.types';

export async function findStoreById(storeId: string) {
  const result = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  return result[0] ?? null;
}

export async function findFirstStore() {
  // v1 single-tenant: gibt den ersten Store zurück
  const result = await db.select().from(stores).limit(1);
  return result[0] ?? null;
}

export async function updateStore(storeId: string, data: UpdateStoreBody) {
  const result = await db
    .update(stores)
    .set({
      ...(data.address !== undefined && { address: data.address }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.openingHours !== undefined && { openingHours: data.openingHours }),
    })
    .where(eq(stores.id, storeId))
    .returning();
  return result[0] ?? null;
}
