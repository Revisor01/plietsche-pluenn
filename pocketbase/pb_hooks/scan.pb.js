/// <reference path="../pb_data/types.d.ts" />

// POST /api/pp/scan — universal scanner.
// Body: { qr_code, gps_lat?, gps_lng?, items_count? }
// Auto-detects whether the QR is the door secret or an item code.
//   - Door QR  → check-in (visit bonus + streak, once/day) + optional stepper.
//   - Item QR  → take item (item points) + first scan of the day also checks in.
// Privacy: items get taken_at but NO user reference.
//
// Die Antwort ist ein Vertrag mit den ausgelieferten Apps: Feldnamen, Typen
// und Statuscodes bleiben, wie sie sind (siehe docs/openapi.yaml).
//
// Alles, was ein Scan schreibt, läuft in EINER Transaktion. Vorher wurde
// nacheinander gespeichert — Besuch, Punkte, Punktestand, zuletzt taken_at am
// Teil. Scheiterte der letzte Schritt (etwa „database is locked" unter Last),
// blieben die Punkte gebucht und das Teil verfügbar: beim nächsten Scan
// zahlte es ein zweites Mal. Jetzt gilt: alles oder nichts.
//
// Innerhalb der Transaktion geht jeder Zugriff über txApp (lib.withApp) —
// PocketBase hat eine einzige Schreibverbindung, und die hält die
// Transaktion. Die Push-Bestätigung wird gesammelt und erst nach dem
// Festschreiben verschickt.
//
// Alles steht im Handler: PocketBase führt ihn in einer eigenen Umgebung aus,
// oben in der Datei deklarierte Helfer wären darin nicht sichtbar.

routerAdd('POST', '/api/pp/scan', (e) => {
  const lib = require(`${__hooks}/lib/points.js`);
  // Ein Superuser ist ab 0.23 ebenfalls e.auth, hat aber kein Konto in
  // `users`. Unter 0.22 war authRecord für ihn leer → 401; so bleibt es.
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
  // Der Fehler, mit dem der Scan abbricht. Er wird hier festgehalten und
  // nach dem Zurückrollen unverändert weitergeworfen: So kommt ein ApiError
  // mit seinem Status (400/404/409/410) bei der App an, egal wie PocketBase
  // ihn auf dem Weg durch runInTransaction verpackt.
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

        // Türgeheimnis: liegt in der gesperrten Sammlung store_secrets, nicht
        // in `store`. `store` ist für alle Angemeldeten lesbar — ein Geheimnis
        // darin wäre für jedes Konto abrufbar, weil PocketBase-Regeln auf ganze
        // Datensätze wirken und nicht auf einzelne Felder.
        // Rückfall auf das Altfeld, solange eine Instanz die Migration noch
        // nicht gefahren hat; nach der Migration steht dort der Leerstring.
        let doorSecret = '';
        try {
          const sec = txApp.findFirstRecordByFilter('store_secrets', '1=1');
          doorSecret = `${sec.get('checkin_qr_secret') || ''}`.trim();
        } catch (_) {}
        if (!doorSecret) doorSecret = `${store.get('checkin_qr_secret') || ''}`.trim();

        const cfg = L.config();
        // Höchstzahl mitgenommener Teile: gilt pro Besuch, also pro Tag in der
        // Ladenzeitzone, über ALLE Scans — Zähler an der Tür (auch beim
        // zweiten Tür-Scan) und per QR gescannte Teile (lib/points.js,
        // itemsTakenToday). Mit dem Schalter „Unbegrenzt" gibt es keine
        // Grenze. Geprüft wird unten je Zweig, in dieser Transaktion: Wird
        // abgelehnt, ist nichts gebucht und das Teil bleibt offen.
        // Die Grenze je Aufruf bleibt vorn stehen, wie bisher auch für einen
        // Teile-Scan mit mitgeschicktem items_count.
        const rawCount = Math.max(0, parseInt(data.items_count || 0, 10));
        if (!cfg.itemsTakeUnlimited && rawCount > cfg.maxItemsTake) {
          throw new ApiError(400, `Höchstens ${cfg.maxItemsTake} Teile pro Besuch.`);
        }
        const itemsCount = rawCount;

        const user = txApp.findRecordById('users', authId);
        // Per-type campaign multipliers — only if the user matches the campaign target.
        const camp = L.findActiveCampaign(now, user);
        const multTake = L.campaignMult(camp, 'take');
        // In der Transaktion gelesen: Zwei gleichzeitige Scans laufen
        // nacheinander, der zweite sieht den Besuch des ersten.
        const alreadyToday = L.hasVisitToday(authId, now);

        // ── Case 1: DOOR QR → check-in ─────────────────────────────
        if (qr === doorSecret) {
          L.assertItemsTakeAllowed(authId, now, itemsCount, cfg);

          // Geofence check. Die Entfernung wird behalten: doCheckin schreibt
          // sie als gps_distance_m in den Besuch.
          const distance = L.assertInGeofence(store, lat, lng);

          if (alreadyToday) {
            // Already checked in today — only count extra stepper items, no second bonus.
            const stepperPts = Math.round(itemsCount * cfg.takePerItem * multTake);
            if (stepperPts > 0) {
              L.awardPoints(user, stepperPts, 'checkin', `${itemsCount} Teile mitgenommen`, null);
            }
            // Die Teile in den Tagesbesuch schreiben — sonst zählte die
            // Tagesgrenze sie beim nächsten Scan nicht mit.
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
        // Only approved items may be taken — a pending (unreviewed) submission can't
        // be scanned for points before a staff member approves it.
        const itemStatus = `${item.get('status') || ''}`.trim();
        if (itemStatus && itemStatus !== 'approved') throw new ApiError(409, 'Noch nicht freigegeben');

        // Das Teil zählt als eines der heute mitgenommenen.
        L.assertItemsTakeAllowed(authId, now, 1, cfg);

        // Geofence also applies to item scans (an item scan triggers a check-in).
        // GPS is optional — when provided it must be within the radius; without it we
        // fall back to trusting the in-store QR secret (same as the door check-in).
        L.assertInGeofence(store, lat, lng);

        // First scan of the day also checks the user in (visit bonus + streak).
        let checkinPts = 0;
        let didCheckin = false;
        if (!alreadyToday) {
          const res = L.doCheckin(user, now, { lat, lng, itemsCount: 0 });
          checkinPts = res.points;
          didCheckin = true;
        }

        // Item points (PLAIN-TEXT label, no FK to item — privacy). A scanned item is
        // a "take", so the campaign's take multiplier applies.
        const itemPts = Math.round((item.get('points') || 30) * multTake);
        const size = item.get('size');
        const label = size ? `${item.get('title')}, ${size}` : item.get('title');
        L.awardPoints(user, itemPts, 'scan', label, null);

        // Ein gescanntes Teil ist ein "Holen" — zählt als Teilnahme, wenn die
        // Aktion darauf Bonus gibt. doCheckin lief hier mit itemsCount 0, sonst
        // fiele es aus.
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

  // Festgeschrieben — jetzt erst die Bestätigung. Ein Fehler beim Versand
  // ändert an der Buchung nichts mehr.
  for (const send of afterCommit) {
    try {
      send();
    } catch (_) {}
  }

  return e.json(200, result);
});
