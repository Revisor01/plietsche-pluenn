import * as scanRepo from './scan.repository';
import { getStoreSettings } from '../points/points.repository';

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

  const settings = await getStoreSettings(storeId);
  const pointsPerScan = settings.pointsPerScan;

  await scanRepo.markItemTaken(item.id);
  const totalPoints = await scanRepo.awardPoints(userId, storeId, pointsPerScan, 'item_scan');

  return { points: pointsPerScan, title: item.title, totalPoints };
}
