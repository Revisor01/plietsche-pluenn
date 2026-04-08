import { db } from '../../db/client';
import { checkins, items } from '../../db/schema';
import { eq, and, gte, lte, count } from 'drizzle-orm';

export interface DashboardStats {
  visits: number;
  itemsTaken: number;
  newItems: number;
  activeItems: number;
}

export async function getDashboardStats(
  storeId: string,
  from: Date,
  to: Date
): Promise<DashboardStats> {
  const [visitsResult, itemsTakenResult, newItemsResult, activeItemsResult] =
    await Promise.all([
      // visits = checkins im Zeitraum
      db
        .select({ value: count() })
        .from(checkins)
        .where(
          and(
            eq(checkins.storeId, storeId),
            gte(checkins.createdAt, from),
            lte(checkins.createdAt, to)
          )
        ),

      // itemsTaken = mitgenommene Items im Zeitraum
      db
        .select({ value: count() })
        .from(items)
        .where(
          and(
            eq(items.storeId, storeId),
            eq(items.status, 'taken'),
            gte(items.createdAt, from),
            lte(items.createdAt, to)
          )
        ),

      // newItems = alle neuen Items im Zeitraum (egal ob active oder taken)
      db
        .select({ value: count() })
        .from(items)
        .where(
          and(
            eq(items.storeId, storeId),
            gte(items.createdAt, from),
            lte(items.createdAt, to)
          )
        ),

      // activeItems = Gesamtstand aktiver Items (kein Zeitraum-Filter)
      db
        .select({ value: count() })
        .from(items)
        .where(and(eq(items.storeId, storeId), eq(items.status, 'active'))),
    ]);

  return {
    visits: Number(visitsResult[0]?.value ?? 0),
    itemsTaken: Number(itemsTakenResult[0]?.value ?? 0),
    newItems: Number(newItemsResult[0]?.value ?? 0),
    activeItems: Number(activeItemsResult[0]?.value ?? 0),
  };
}
