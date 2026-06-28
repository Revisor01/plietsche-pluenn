/// <reference path="../pb_data/types.d.ts" />

// POST /api/pp/scan — universal scanner.
// Body: { qr_code, gps_lat?, gps_lng?, items_count? }
// Auto-detects whether the QR is the door secret or an item code.
//   - Door QR  → check-in (visit bonus + streak, once/day) + optional stepper.
//   - Item QR  → take item (item points) + first scan of the day also checks in.
// Privacy: items get taken_at but NO user reference.

routerAdd('POST', '/api/pp/scan', (c) => {
  const lib = require(`${__hooks}/lib/points.js`);
  const auth = c.get('authRecord');
  if (!auth) throw new ApiError(401, 'Nicht angemeldet');

  const data = $apis.requestInfo(c).data;
  const qr = `${data.qr_code || ''}`.trim();
  if (!qr) throw new ApiError(400, 'Kein QR-Code');

  const lat = data.gps_lat;
  const lng = data.gps_lng;
  const itemsCount = Math.max(0, parseInt(data.items_count || 0, 10));
  const now = new Date();

  // Store singleton (door secret + geofence).
  let store;
  try {
    store = $app.dao().findFirstRecordByFilter('store', '1=1');
  } catch (_) {
    throw new ApiError(500, 'Laden nicht konfiguriert');
  }
  const doorSecret = `${store.get('checkin_qr_secret')}`.trim();

  const camp = lib.findActiveCampaign(now);
  const mult = camp ? camp.get('multiplier') : 1.0;
  const user = $app.dao().findRecordById('users', auth.id);
  const alreadyToday = lib.hasVisitToday(auth.id, now);

  // ── Case 1: DOOR QR → check-in ─────────────────────────────
  if (qr === doorSecret) {
    // Geofence check.
    let distance = null;
    if (lat != null && lng != null) {
      distance = lib.distanceM(lat, lng, store.get('lat'), store.get('lng'));
      const radius = store.get('geofence_radius_m') || 150;
      if (distance > radius) throw new ApiError(400, 'Du bist nicht im Laden');
    }

    if (alreadyToday) {
      // Already checked in today — only count extra stepper items, no second bonus.
      const stepperPts = Math.round(itemsCount * lib.POINTS.takePerItem * mult);
      if (stepperPts > 0) {
        lib.awardPoints(user, stepperPts, 'checkin', `${itemsCount} Teile mitgenommen`, null);
      }
      lib.checkBadges(user);
      const fresh = $app.dao().findRecordById('users', auth.id);
      return c.json(200, {
        type: 'checkin',
        already_checked_in: true,
        points: stepperPts,
        points_total: fresh.get('points_total'),
        streak_weeks: fresh.get('streak_weeks'),
      });
    }

    const res = lib.doCheckin(user, now, { lat, lng, distance, itemsCount });
    lib.checkBadges(user);
    const fresh = $app.dao().findRecordById('users', auth.id);
    return c.json(200, {
      type: 'checkin',
      already_checked_in: false,
      points: res.points,
      points_total: fresh.get('points_total'),
      streak_weeks: fresh.get('streak_weeks'),
    });
  }

  // ── Case 2: ITEM QR → take item ────────────────────────────
  let item;
  try {
    item = $app.dao().findFirstRecordByData('items', 'qr_code', qr);
  } catch (_) {
    throw new ApiError(404, 'Unbekannter QR-Code');
  }
  if (`${item.get('taken_at')}`.trim() !== '') throw new ApiError(409, 'Schon mitgenommen');
  if (`${item.get('archived_at')}`.trim() !== '') throw new ApiError(410, 'Nicht mehr verfügbar');
  // Only approved items may be taken — a pending (unreviewed) submission can't
  // be scanned for points before a staff member approves it.
  const itemStatus = `${item.get('status') || ''}`.trim();
  if (itemStatus && itemStatus !== 'approved') throw new ApiError(409, 'Noch nicht freigegeben');

  // Geofence also applies to item scans (an item scan triggers a check-in).
  // GPS is optional — when provided it must be within the radius; without it we
  // fall back to trusting the in-store QR secret (same as the door check-in).
  if (lat != null && lng != null) {
    const d = lib.distanceM(lat, lng, store.get('lat'), store.get('lng'));
    const radius = store.get('geofence_radius_m') || 150;
    if (d > radius) throw new ApiError(400, 'Du bist nicht im Laden');
  }

  // First scan of the day also checks the user in (visit bonus + streak).
  let checkinPts = 0;
  let didCheckin = false;
  if (!alreadyToday) {
    const res = lib.doCheckin(user, now, { lat, lng, itemsCount: 0 });
    checkinPts = res.points;
    didCheckin = true;
  }

  // Item points (PLAIN-TEXT label, no FK to item — privacy).
  const itemPts = Math.round((item.get('points') || 30) * mult);
  const size = item.get('size');
  const label = size ? `${item.get('title')}, ${size}` : item.get('title');
  lib.awardPoints(user, itemPts, 'scan', label, null);

  // Mark item taken WITHOUT user reference.
  item.set('taken_at', now.toISOString());
  $app.dao().saveRecord(item);

  lib.checkBadges(user);
  const fresh = $app.dao().findRecordById('users', auth.id);
  return c.json(200, {
    type: 'item',
    label: label,
    points: itemPts + checkinPts,
    item_points: itemPts,
    checkin_points: checkinPts,
    did_checkin: didCheckin,
    points_total: fresh.get('points_total'),
  });
});
