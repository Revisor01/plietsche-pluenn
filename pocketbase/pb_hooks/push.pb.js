/// <reference path="../pb_data/types.d.ts" />

// Token als gebundener Parameter gegen Filter-Injection, Formprüfung als zweite Sperre, je Handler, weil Handler isoliert laufen; Antworten sind ein Vertrag mit den Apps.

// POST /api/pp/push/register { expo_token, platform? }: Upsert serverseitig, weil die list rule nur eigene Geräte zeigt.
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
