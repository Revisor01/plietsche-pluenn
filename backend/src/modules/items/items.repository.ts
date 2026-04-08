import { db } from '../../db/client';
import { items } from '../../db/schema';
import { eq, and, ilike, desc } from 'drizzle-orm';
import type { CreateItemBody, ItemFilters } from './items.types';

export async function createItem(data: CreateItemBody & { storeId: string; qrToken: string }) {
  const result = await db
    .insert(items)
    .values({
      storeId: data.storeId,
      title: data.title,
      category: data.category,
      size: data.size ?? null,
      condition: data.condition ?? null,
      color: data.color ?? null,
      status: 'active',
      qrToken: data.qrToken,
    })
    .returning();
  return result[0];
}

export async function findItems(storeId: string, filters: ItemFilters) {
  const limit = filters.limit ?? 20;
  const page = filters.page ?? 0;
  const conditions = [eq(items.storeId, storeId)];
  if (filters.category) conditions.push(eq(items.category, filters.category));
  if (filters.status) conditions.push(eq(items.status, filters.status));
  if (filters.search) conditions.push(ilike(items.title, `%${filters.search}%`));

  const rows = await db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.createdAt))
    .limit(limit)
    .offset(page * limit);

  return rows;
}

export async function findItemById(id: string, storeId: string) {
  const result = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.storeId, storeId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getShowcaseItems(storeId: string) {
  return db
    .select({
      id: items.id,
      title: items.title,
      category: items.category,
      size: items.size,
      color: items.color,
      createdAt: items.createdAt,
    })
    .from(items)
    .where(
      and(
        eq(items.storeId, storeId),
        eq(items.isShowcase, true),
        eq(items.status, 'active'),
      ),
    )
    .orderBy(desc(items.createdAt))
    .limit(6);
}

export async function setShowcase(id: string, storeId: string, isShowcase: boolean) {
  const result = await db
    .update(items)
    .set({ isShowcase })
    .where(and(eq(items.id, id), eq(items.storeId, storeId)))
    .returning({ id: items.id, isShowcase: items.isShowcase });
  return result[0] ?? null;
}
