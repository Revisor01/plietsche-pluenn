/// <reference path="../pb_data/types.d.ts" />

// POST /api/pp/scan { qr_code, gps_lat?, gps_lng?, items_count? }: Tür- oder Teile-Scan in einer Transaktion; die Antwort ist ein Vertrag (docs/openapi.yaml).

routerAdd('POST', '/api/pp/scan', (e) => {
  const lib = require(`${__hooks}/lib/points.js`);
  // Superuser haben kein Konto in `users`, also 401.
  if (!e.auth || e.auth.isSuperuser()) throw new ApiError(401, 'Nicht angemeldet');
  const authId = e.auth.id;

  const data = e.requestInfo().body || {};
  const qr = `${data.qr_code || ''}`.trim();
  if (!qr) throw new ApiError(400, 'Kein QR-Code');

  const lat = data.gps_lat;
  const lng = data.gps_lng;
  const now = new Date();

  const afterCommit = [];
  let result = null;
  // Nach dem Zurückrollen unverändert werfen, damit der Status bei der App ankommt.
  let failure = null;

  try {
    $app.runInTransaction((txApp) => {
      try {
        const L = lib.withApp(txApp, afterCommit);

        // Store singleton (Öffnungszeiten, Standort, Geofence).
        let store;
        try {
          store = txApp.findFirstRecordByFilter('store', '1=1');
        } catch (_) {
          throw new ApiError(500, 'Laden nicht konfiguriert');
        }

        // Türgeheimnis aus store_secrets, weil `store` für alle Angemeldeten lesbar ist; Altfeld als Rückfall.
        let doorSecret = '';
        try {
          const sec = txApp.findFirstRecordByFilter('store_secrets', '1=1');
          doorSecret = `${sec.get('checkin_qr_secret') || ''}`.trim();
        } catch (_) {}
        if (!doorSecret) doorSecret = `${store.get('checkin_qr_secret') || ''}`.trim();

        const cfg = L.config();
        // Tagesgrenze über alle Scans (lib/points.js), je Zweig in dieser Transaktion geprüft.
        const rawCount = Math.max(0, parseInt(data.items_count || 0, 10));
        if (!cfg.itemsTakeUnlimited && rawCount > cfg.maxItemsTake) {
          throw new ApiError(400, `Höchstens ${cfg.maxItemsTake} Teile pro Besuch.`);
        }
        const itemsCount = rawCount;

        const user = txApp.findRecordById('users', authId);
        // Per-type campaign multipliers — only if the user matches the campaign target.
        const camp = L.findActiveCampaign(now, user);
        const multTake = L.campaignMult(camp, 'take');
        // In der Transaktion gelesen, der zweite Scan sieht den Besuch des ersten.
        const alreadyToday = L.hasVisitToday(authId, now);

        // ── Case 1: DOOR QR → check-in ─────────────────────────────
        if (qr === doorSecret) {
          L.assertItemsTakeAllowed(authId, now, itemsCount, cfg);

          // Die Entfernung schreibt doCheckin als gps_distance_m.
          const distance = L.assertInGeofence(store, lat, lng);

          if (alreadyToday) {
            // Already checked in today — only count extra stepper items, no second bonus.
            const stepperPts = Math.round(itemsCount * cfg.takePerItem * multTake);
            if (stepperPts > 0) {
              L.awardPoints(user, stepperPts, 'checkin', `${itemsCount} Teile mitgenommen`, null);
            }
            // Sonst zählt die Tagesgrenze sie beim nächsten Scan nicht.
            L.addItemsToTodaysVisit(authId, now, itemsCount);
            const bonusPts = L.awardBadgesAndCountBonus(user, authId);
            const fresh = txApp.findRecordById('users', authId);
            result = {
              type: 'checkin',
              already_checked_in: true,
              points: stepperPts,
              bonus_points: bonusPts,
              points_total: fresh.get('points_total'),
              streak_weeks: fresh.get('streak_weeks'),
            };
            return;
          }

          const res = L.doCheckin(user, now, { lat, lng, distance, itemsCount });
          const bonusPts = L.awardBadgesAndCountBonus(user, authId);
          const fresh = txApp.findRecordById('users', authId);
          result = {
            type: 'checkin',
            already_checked_in: false,
            points: res.points,
            bonus_points: bonusPts,
            points_total: fresh.get('points_total'),
            streak_weeks: fresh.get('streak_weeks'),
          };
          return;
        }

        // ── Case 2: ITEM QR → take item ────────────────────────────
        let item;
        try {
          // findFirstRecordByData bindet den Wert als Parameter.
          item = txApp.findFirstRecordByData('items', 'qr_code', qr);
        } catch (_) {
          throw new ApiError(404, 'Unbekannter QR-Code');
        }
        if (`${item.get('taken_at')}`.trim() !== '') throw new ApiError(409, 'Schon mitgenommen');
        if (`${item.get('archived_at')}`.trim() !== '') throw new ApiError(410, 'Nicht mehr verfügbar');
        // Nicht freigegebene Einreichungen bringen keine Punkte.
        const itemStatus = `${item.get('status') || ''}`.trim();
        if (itemStatus && itemStatus !== 'approved') throw new ApiError(409, 'Noch nicht freigegeben');

        // Das Teil zählt als eines der heute mitgenommenen.
        L.assertItemsTakeAllowed(authId, now, 1, cfg);

        // Geofence auch hier, ohne GPS trägt der Code im Laden die Prüfung.
        L.assertInGeofence(store, lat, lng);

        // First scan of the day also checks the user in (visit bonus + streak).
        let checkinPts = 0;
        let didCheckin = false;
        if (!alreadyToday) {
          const res = L.doCheckin(user, now, { lat, lng, itemsCount: 0 });
          checkinPts = res.points;
          didCheckin = true;
        }

        // Klartext-Label ohne Verweis aufs Teil (Datenschutz); Holen-Faktor gilt.
        const itemPts = Math.round((item.get('points') || 30) * multTake);
        const size = item.get('size');
        const label = size ? `${item.get('title')}, ${size}` : item.get('title');
        L.awardPoints(user, itemPts, 'scan', label, null);

        // doCheckin lief hier mit itemsCount 0, sonst fiele die Teilnahme aus.
        if (camp) L.bumpActionCount(user, camp, 'take', 1);

        // Mark item taken WITHOUT user reference.
        item.set('taken_at', now.toISOString());
        txApp.saveNoValidate(item);

        const bonusPts = L.awardBadgesAndCountBonus(user, authId);
        const fresh = txApp.findRecordById('users', authId);
        result = {
          type: 'item',
          label: label,
          points: itemPts + checkinPts,
          item_points: itemPts,
          checkin_points: checkinPts,
          bonus_points: bonusPts,
          did_checkin: didCheckin,
          points_total: fresh.get('points_total'),
        };
      } catch (err) {
        failure = err;
        throw err; // → PocketBase rollt zurück
      }
    });
  } catch (err) {
    throw failure || err;
  }

  // Erst nach dem Festschreiben bestätigen.
  for (const send of afterCommit) {
    try {
      send();
    } catch (_) {}
  }

  return e.json(200, result);
});
