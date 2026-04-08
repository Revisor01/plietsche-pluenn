import crypto from 'node:crypto';
import * as checkinRepo from './checkin.repository';
import { awardPoints } from '../scan/scan.repository';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const POINTS_PER_CHECKIN = 5;  // Wird in Plan 03-03 durch store_settings ersetzt
const POINTS_PER_ITEM = 3;     // Wird in Plan 03-03 durch store_settings ersetzt

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

  const basePoints = POINTS_PER_CHECKIN;
  const itemPoints = itemCount * POINTS_PER_ITEM;
  const totalPoints = await awardPoints(userId, storeId, basePoints + itemPoints, 'checkin');

  return { points: basePoints, itemPoints, totalPoints };
}
