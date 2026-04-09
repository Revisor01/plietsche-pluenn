import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client';
import { deviceTokens } from '../../db/schema';

export async function insertToken(
  userId: string,
  storeId: string,
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  // Ein User hat immer nur ein aktives Geraet: erst loeschen, dann einfuegen
  await db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
  await db.insert(deviceTokens).values({ userId, storeId, token, platform });
}

export async function deleteToken(userId: string): Promise<void> {
  await db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));
}

export async function findTokensByStore(storeId: string): Promise<string[]> {
  const rows = await db
    .select({ token: deviceTokens.token })
    .from(deviceTokens)
    .where(and(eq(deviceTokens.storeId, storeId), eq(deviceTokens.pushEnabled, true)));
  return rows.map((r) => r.token);
}

export async function findTokensByUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ token: deviceTokens.token })
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));
  return rows.map((r) => r.token);
}

export async function setPushEnabled(userId: string, enabled: boolean): Promise<void> {
  await db
    .update(deviceTokens)
    .set({ pushEnabled: enabled, updatedAt: new Date() })
    .where(eq(deviceTokens.userId, userId));
}
