import { z } from 'zod';
import { getDashboardStats } from './dashboard.repository';

export const statsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).transform((s) => new Date(s)),
  to: z.string().datetime({ offset: true }).transform((s) => new Date(s)),
});

export async function fetchStats(storeId: string, from: Date, to: Date) {
  if (from > to) {
    const err = new Error('from muss vor to liegen') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }
  return getDashboardStats(storeId, from, to);
}
