/// <reference path="../pb_data/types.d.ts" />

// Der Token kommt aus dem Anfragekörper. Er geht als gebundener Parameter
// ({:token}) in den Filter, nicht als eingesetzter Text — ein
// Anführungszeichen darin kann den Ausdruck also nicht mehr aufbrechen. Bis
// 26.09.2026 wurde er eingesetzt: `x" || user = "fremdeId` hebelte beim
// Abmelden die Besitzprüfung aus und schrieb beim Anmelden ein fremdes Gerät
// auf das eigene Konto um.
//
// Die Formprüfung bleibt trotzdem, als zweite Sperre und weil sie etwas
// Eigenes sagt: Expo vergibt Token ausschließlich in dieser Gestalt
// (ExponentPushToken[…] bzw. ExpoPushToken[…], darin nur Buchstaben, Ziffern,
// Binde- und Unterstriche). Was nicht so aussieht, könnte ohnehin nie eine
// Nachricht empfangen — 400 statt eines Datensatzes, der nie zustellbar ist.
//
// Die Prüfung steht in JEDEM Handler selbst: PocketBase führt Handler in einer
// eigenen Umgebung aus, ein oben in der Datei deklarierter Helfer ist darin
// nicht sichtbar. So war es bis 26.09.2026 — Anmelden und Abmelden scheiterten
// ausnahmslos mit "ReferenceError: assertExpoToken is not defined".
//
// Antworten und Fehlertexte sind ein Vertrag mit den ausgelieferten Apps.

// POST /api/pp/push/register — upsert the caller's Expo push token.
// Body: { expo_token, platform? }
// Server-side lookup, so the unique-token upsert works even though the
// push_devices list rule is restricted to the owner.
routerAdd('POST', '/api/pp/push/register', (e) => {
  // Superuser haben kein Konto in `users` — unter 0.22 war authRecord leer.
  if (!e.auth || e.auth.isSuperuser()) throw new ApiError(401, 'Nicht angemeldet');

  const data = e.requestInfo().body || {};
  const token = `${data.expo_token || ''}`.trim();
  if (!token) throw new ApiError(400, 'Kein Token');
  if (!/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token)) {
    throw new ApiError(400, 'Ungueltiger Token');
  }
  const platform = `${data.platform || 'ios'}`.trim();

  let rec;
  try {
    // One row per token; move it to the current user if it already exists.
    rec = $app.findFirstRecordByFilter('push_devices', 'expo_token = {:token}', { token });
  } catch (_) {
    rec = new Record($app.findCollectionByNameOrId('push_devices'));
    rec.set('expo_token', token);
  }
  rec.set('user', e.auth.id);
  rec.set('platform', platform === 'android' ? 'android' : 'ios');
  rec.set('last_seen', new Date().toISOString());
  $app.saveNoValidate(rec);

  return e.json(200, { ok: true });
});

// POST /api/pp/push/unregister — remove the caller's token (DSGVO opt-out).
routerAdd('POST', '/api/pp/push/unregister', (e) => {
  if (!e.auth || e.auth.isSuperuser()) throw new ApiError(401, 'Nicht angemeldet');
  const data = e.requestInfo().body || {};
  const token = `${data.expo_token || ''}`.trim();
  if (!token) throw new ApiError(400, 'Kein Token');
  if (!/^Expo(?:nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token)) {
    throw new ApiError(400, 'Ungueltiger Token');
  }
  try {
    const rec = $app.findFirstRecordByFilter('push_devices', 'expo_token = {:token} && user = {:user}', {
      token,
      user: e.auth.id,
    });
    $app.delete(rec);
  } catch (_) {}
  return e.json(200, { ok: true });
});
