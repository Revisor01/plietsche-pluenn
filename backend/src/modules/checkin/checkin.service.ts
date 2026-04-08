import crypto from 'node:crypto';
import * as checkinRepo from './checkin.repository';
import { awardPoints } from '../scan/scan.repository';
import { getStoreSettings } from '../points/points.repository';
import { getActiveCampaign } from '../campaigns/campaigns.repository';
import { evaluateAchievements } from '../badges/achievements.engine';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function currentWeekBucket(): number {
  return Math.floor(Date.now() / WEEK_MS);
}

function generateDoorToken(secret: string, storeId: string, bucket?: number): string {
  const b = bucket ?? currentWeekBucket();
  return crypto.createHmac('sha256', secret).update(`${storeId}:${b}`).digest('hex').substring(0, 32);
}

export function verifyDoorToken(token: string, secret: string, storeId: string): boolean {
  const current = currentWeekBucket();
  return (
    token === generateDoorToken(secret, storeId, current) ||
    token === generateDoorToken(secret, storeId, current - 1)
  );
}

export function getCurrentDoorToken(storeId: string): string {
  const secret = process.env.DOOR_QR_SECRET;
  if (!secret) throw new Error('DOOR_QR_SECRET nicht konfiguriert');
  return generateDoorToken(secret, storeId);
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function processCheckin(
  userId: string,
  storeId: string,
  doorToken: string,
  coords: { lat: number; lng: number },
  itemCount: number,
) {
  const secret = process.env.DOOR_QR_SECRET;
  if (!secret) {
    throw Object.assign(new Error('Server-Konfiguration fehlt'), { statusCode: 500 });
  }

  const store = await checkinRepo.findStoreById(storeId);
  if (!store) {
    throw Object.assign(new Error('Store nicht gefunden'), { statusCode: 404 });
  }

  if (store.lat == null || store.lng == null) {
    throw Object.assign(new Error('Store-Koordinaten nicht konfiguriert'), { statusCode: 422 });
  }

  const dist = haversineMeters(coords.lat, coords.lng, store.lat, store.lng);
  const radius = store.checkinRadiusMeters ?? 150;
  if (dist > radius) {
    throw Object.assign(new Error('Zu weit vom Laden entfernt'), { statusCode: 403 });
  }

  if (!verifyDoorToken(doorToken, secret, storeId)) {
    throw Object.assign(new Error('Ungültiger QR-Code'), { statusCode: 403 });
  }

  const last = await checkinRepo.lastCheckinByUser(userId, storeId);
  if (last && last.createdAt && Date.now() - last.createdAt.getTime() < 12 * 3600 * 1000) {
    throw Object.assign(new Error('Bereits heute eingecheckt'), { statusCode: 409 });
  }

  await checkinRepo.insertCheckin({ userId, storeId, itemCount });

  const settings = await getStoreSettings(storeId);
  const campaign = await getActiveCampaign(storeId);
  const multiplier = campaign?.multiplier ?? 1;
  const basePoints = settings.pointsPerCheckin;
  const itemPoints = Math.min(itemCount, settings.maxItemsPerCheckin) * settings.pointsPerItem;
  const pointsAwarded = Math.round((basePoints + itemPoints) * multiplier);
  const totalPoints = await awardPoints(userId, storeId, pointsAwarded, 'checkin');

  // Achievement-Auswertung (fire-and-forget, Fehler sollen Check-In nicht blockieren)
  let newAchievements: Awaited<ReturnType<typeof evaluateAchievements>> = [];
  try {
    newAchievements = await evaluateAchievements(userId, storeId, 'checkin');
  } catch (e) {
    console.error('Achievement-Auswertung fehlgeschlagen:', e);
  }

  return {
    points: Math.round(basePoints * multiplier),
    itemPoints: Math.round(itemPoints * multiplier),
    totalPoints,
    campaign: campaign ? { title: campaign.title, multiplier } : null,
    newAchievements,
  };
}
