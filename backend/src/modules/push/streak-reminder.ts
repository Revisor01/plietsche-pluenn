import cron from 'node-cron';
import { db } from '../../db/client';
import { deviceTokens, weeklyVisits, stores } from '../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { sendToTokens } from './push.service';

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sonntag, 1=Montag...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Montag dieser Woche
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function checkAndSendStreakReminders(): Promise<void> {
  const weekStart = getCurrentWeekStart();
  const allStores = await db.select({ id: stores.id }).from(stores);

  for (const store of allStores) {
    // Alle aktiven Token-User dieses Stores
    const activeTokenRows = await db
      .select({ userId: deviceTokens.userId, token: deviceTokens.token })
      .from(deviceTokens)
      .where(and(
        eq(deviceTokens.storeId, store.id),
        eq(deviceTokens.pushEnabled, true)
      ));

    if (activeTokenRows.length === 0) continue;

    const activeUserIds = activeTokenRows.map(r => r.userId);

    // User die diese Woche schon besucht haben
    const visitedRows = await db
      .select({ userId: weeklyVisits.userId })
      .from(weeklyVisits)
      .where(and(
        eq(weeklyVisits.storeId, store.id),
        eq(weeklyVisits.weekStart, weekStart),
        inArray(weeklyVisits.userId, activeUserIds)
      ));

    const visitedUserIds = new Set(visitedRows.map(r => r.userId));

    // Token der saeumigeN Besucher
    const remindTokens = activeTokenRows
      .filter(r => !visitedUserIds.has(r.userId))
      .map(r => r.token);

    if (remindTokens.length === 0) continue;

    await sendToTokens(
      remindTokens,
      'Plietsche Pluenn',
      'Deine Serie bricht bald ab -- komm diese Woche noch vorbei!'
    ).catch((err: unknown) => {
      console.error(`[Push] Streak-Reminder fuer Store ${store.id} fehlgeschlagen:`, err);
    });

    console.log(`[Push] Streak-Reminder: ${remindTokens.length} Benachrichtigungen fuer Store ${store.id} gesendet`);
  }
}

export function startStreakReminderScheduler(): void {
  // Jeden Freitag um 9 Uhr (Server-Zeitzone)
  cron.schedule('0 9 * * 5', () => {
    console.log('[Push] Streak-Reminder Cron gestartet');
    checkAndSendStreakReminders().catch((err: unknown) => {
      console.error('[Push] Streak-Reminder Cron-Fehler:', err);
    });
  });
  console.log('[Push] Streak-Reminder Scheduler registriert (Freitag 9 Uhr)');
}
