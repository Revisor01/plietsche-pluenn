import * as scanRepo from './scan.repository';
import { getStoreSettings } from '../points/points.repository';
import { getActiveCampaign } from '../campaigns/campaigns.repository';
import { evaluateAchievements } from '../badges/achievements.engine';

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
  const campaign = await getActiveCampaign(storeId);
  const multiplier = campaign?.multiplier ?? 1;
  const basePoints = settings.pointsPerScan;
  const pointsAwarded = Math.round(basePoints * multiplier);

  await scanRepo.markItemTaken(item.id);
  const totalPoints = await scanRepo.awardPoints(userId, storeId, pointsAwarded, 'item_scan');

  // Achievement-Auswertung (fire-and-forget, Fehler sollen Scan nicht blockieren)
  let newAchievements: Awaited<ReturnType<typeof evaluateAchievements>> = [];
  try {
    newAchievements = await evaluateAchievements(userId, storeId, 'item_scan');
  } catch (e) {
    console.error('Achievement-Auswertung fehlgeschlagen:', e);
  }

  return {
    points: pointsAwarded,
    title: item.title,
    totalPoints,
    campaign: campaign ? { title: campaign.title, multiplier } : null,
    newAchievements,
  };
}
