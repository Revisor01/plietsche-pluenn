import { db } from '../../db/client';
import { campaigns } from '../../db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';
import type { CreateCampaignBody, UpdateCampaignBody } from './campaigns.types';

export async function getActiveCampaign(storeId: string) {
  const now = new Date();
  const result = await db.select().from(campaigns)
    .where(and(
      eq(campaigns.storeId, storeId),
      lte(campaigns.startsAt, now),
      gte(campaigns.endsAt, now),
    ))
    .limit(1);
  return result[0] ?? null;
}

export async function listCampaigns(storeId: string) {
  return db.select().from(campaigns)
    .where(eq(campaigns.storeId, storeId))
    .orderBy(campaigns.startsAt);
}

export async function createCampaign(storeId: string, data: CreateCampaignBody) {
  const result = await db.insert(campaigns).values({
    storeId,
    title: data.title,
    description: data.description ?? null,
    multiplier: data.multiplier,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
  }).returning();
  return result[0];
}

export async function updateCampaign(id: string, storeId: string, data: UpdateCampaignBody) {
  const set: Record<string, unknown> = {};
  if (data.title !== undefined) set.title = data.title;
  if (data.description !== undefined) set.description = data.description;
  if (data.multiplier !== undefined) set.multiplier = data.multiplier;
  if (data.startsAt !== undefined) set.startsAt = new Date(data.startsAt);
  if (data.endsAt !== undefined) set.endsAt = new Date(data.endsAt);
  const result = await db.update(campaigns).set(set)
    .where(and(eq(campaigns.id, id), eq(campaigns.storeId, storeId)))
    .returning();
  return result[0] ?? null;
}

export async function deleteCampaign(id: string, storeId: string) {
  await db.delete(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.storeId, storeId)));
}
