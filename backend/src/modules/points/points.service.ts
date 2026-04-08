import * as pointsRepo from './points.repository';

export async function getBalance(userId: string) {
  const points = await pointsRepo.getBalance(userId);
  return { points };
}

export async function getHistory(userId: string, storeId: string) {
  const transactions = await pointsRepo.getTransactionHistory(userId, storeId);
  return { transactions };
}

export { getStoreSettings, upsertStoreSettings } from './points.repository';
