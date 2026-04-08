import * as scanRepo from './scan.repository';

const POINTS_PER_SCAN = 10; // In Plan 03 durch store_settings ersetzt

export async function scanItemQr(qrToken: string, userId: string, storeId: string) {
  const item = await scanRepo.findItemByQrToken(qrToken, storeId);
  if (!item) {
    throw Object.assign(new Error('Unbekannter QR-Code'), { statusCode: 404 });
  }
  if (item.status === 'taken') {
    throw Object.assign(new Error('Dieses Teil wurde bereits mitgenommen'), { statusCode: 409 });
  }
  if (item.createdBy && item.createdBy === userId) {
    throw Object.assign(new Error('Du hast dieses Teil eingestellt'), { statusCode: 403 });
  }

  await scanRepo.markItemTaken(item.id);
  const totalPoints = await scanRepo.awardPoints(userId, storeId, POINTS_PER_SCAN, 'item_scan');

  return { points: POINTS_PER_SCAN, title: item.title, totalPoints };
}
