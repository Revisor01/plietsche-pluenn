/// <reference path="../pb_data/types.d.ts" />

// Der Token kommt aus dem Anfragekörper und wird in einen PocketBase-Filter
// eingesetzt. Ohne Prüfung bricht ein Anführungszeichen darin aus dem Ausdruck
// aus: `x" || user = "fremdeId` hebelt beim Abmelden die Besitzprüfung aus und
// schreibt beim Anmelden ein fremdes Gerät auf das eigene Konto um — die andere
// Person bekäme keine Mitteilungen mehr, der Angreifer ihre.
//
// Deshalb hier die Form prüfen und alles andere mit 400 abweisen, statt zu
// maskieren: Expo vergibt Token ausschließlich in dieser Gestalt
// (ExponentPushToken[…] bzw. ExpoPushToken[…], darin nur Buchstaben, Ziffern,
// Binde- und Unterstriche). Was nicht so aussieht, könnte ohnehin nie eine
// Nachricht empfangen.
//
// Die Prüfung steht in JEDEM Handler selbst: PocketBase führt Handler in einer
// eigenen Umgebung aus, ein oben in der Datei deklarierter Helfer ist darin
// nicht sichtbar. So war es bis 26.09.2026 — Anmelden und Abmelden scheiterten
// ausnahmslos mit "ReferenceError: assertExpoToken is not defined".

// POST /api/pp/push/register — upsert the caller's Expo push token.
// Body: { expo_token, platform? }
// Uses the admin DAO so the unique-token upsert works even though the
// push_devices list rule is restricted to the owner.
routerAdd('POST', '/api/pp/push/register', (c) => {
  const auth = c.get('authRecord');
  if (!auth) throw new ApiError(401, 'Nicht angemeldet');

  const data = $apis.requestInfo(c).data;
  const token = `${data.expo_token || ''}`.trim();
  if (!token) throw new ApiError(400, 'Kein Token');
  if (!/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token)) {
    throw new ApiError(400, 'Ungueltiger Token');
  }
  const platform = `${data.platform || 'ios'}`.trim();

  const dao = $app.dao();
  let rec;
  try {
    // One row per token; move it to the current user if it already exists.
    rec = dao.findFirstRecordByFilter('push_devices', `expo_token = "${token}"`);
  } catch (_) {
    rec = new Record(dao.findCollectionByNameOrId('push_devices'));
    rec.set('expo_token', token);
  }
  rec.set('user', auth.id);
  rec.set('platform', platform === 'android' ? 'android' : 'ios');
  rec.set('last_seen', new Date().toISOString());
  dao.saveRecord(rec);

  return c.json(200, { ok: true });
});

// POST /api/pp/push/unregister — remove the caller's token (DSGVO opt-out).
routerAdd('POST', '/api/pp/push/unregister', (c) => {
  const auth = c.get('authRecord');
  if (!auth) throw new ApiError(401, 'Nicht angemeldet');
  const data = $apis.requestInfo(c).data;
  const token = `${data.expo_token || ''}`.trim();
  if (!token) throw new ApiError(400, 'Kein Token');
  if (!/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token)) {
    throw new ApiError(400, 'Ungueltiger Token');
  }
  const dao = $app.dao();
  try {
    const rec = dao.findFirstRecordByFilter('push_devices', `expo_token = "${token}" && user = "${auth.id}"`);
    dao.deleteRecord(rec);
  } catch (_) {}
  return c.json(200, { ok: true });
});
