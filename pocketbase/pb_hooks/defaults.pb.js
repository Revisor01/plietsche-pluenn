/// <reference path="../pb_data/types.d.ts" />

// Standardwerte, SKU und QR-Code beim Anlegen; vor e.next() vor dem Speichern, danach auf dem gespeicherten Stand; Lesen und Schreiben über e.app.

onRecordCreateRequest((e) => {
  const r = e.record;
  // Rolle, Punkte und Serie setzt nur der Server, sonst legt ein POST mit role "admin" ein Admin-Konto an.
  const superuser = e.hasSuperuserAuth();
  const auth = e.auth && !e.auth.isSuperuser() ? e.auth : null;
  const privileged = superuser || (!!auth && `${auth.get('role')}` === 'admin');
  if (!privileged) {
    r.set('role', 'visitor');
    r.set('points_total', 0);
    r.set('streak_weeks', 0);
    r.set('streak_last_visit', '');
  }
  if (!r.get('role')) r.set('role', 'visitor');
  if (r.get('points_total') == null) r.set('points_total', 0);
  if (r.get('streak_weeks') == null) r.set('streak_weeks', 0);
  r.set('onboarding_complete', false);
  // Bei der Registrierung gibt es keine Wahl, bool-Felder kämen sonst als false.
  r.set('push_streak_enabled', true);
  r.set('push_campaign_enabled', true);
  r.set('push_badge_enabled', true);
  r.set('push_other_enabled', false);

  e.next();
}, 'users');

// Punktefelder gehören dem Server; Client-Änderungen werden zurückgesetzt, weil die Abzeichen-Vergabe ihnen vertraut.
onRecordUpdateRequest((e) => {
  const r = e.record;
  let stored = null;
  try {
    stored = e.app.findRecordById('users', r.id);
  } catch (_) {}

  if (stored) {
    // Superuser und App-Admins dürfen korrigieren.
    const superuser = e.hasSuperuserAuth();
    const auth = e.auth && !e.auth.isSuperuser() ? e.auth : null;
    const adminOnOther = !!auth && `${auth.get('role')}` === 'admin' && auth.id !== r.id;
    if (!superuser && !adminOnOther) {
      for (const f of ['points_total', 'streak_weeks', 'streak_last_visit', 'role']) {
        r.set(f, stored.get(f));
      }
    }
  }

  e.next();
}, 'users');

onRecordCreateRequest((e) => {
  const r = e.record;
  // Aus der höchsten Nummer, nicht der Anzahl, sonst kollidiert der Unique-Index nach Löschungen.
  if (!r.get('sku')) {
    let next = 1;
    try {
      const last = e.app.findRecordsByFilter('items', 'sku != ""', '-sku', 1, 0);
      if (last.length) {
        const m = `${last[0].get('sku')}`.match(/(\d+)/);
        if (m) next = parseInt(m[1], 10) + 1;
      }
    } catch (_) {}
    r.set('sku', `PP-${String(next).padStart(4, '0')}`);
  }
  // QR code defaults to the SKU if not provided.
  if (!r.get('qr_code')) {
    r.set('qr_code', r.get('sku'));
  }
  // Leeres Zahlenfeld ist 0, nicht null; scan.pb.js rechnet sonst mit 30.
  if (!r.get('points')) r.set('points', 30);
  if (r.get('is_showcase') == null) r.set('is_showcase', false);

  // Superuser haben kein Konto in `users`, also kein created_by.
  const auth = e.auth && !e.auth.isSuperuser() ? e.auth : null;
  if (auth && !r.get('created_by')) r.set('created_by', auth.id);

  // Den Status entscheidet der Server: Staff-Teile frei, Einreichungen pending.
  const role = auth ? `${auth.get('role')}` : 'visitor';
  const isStaff = role === 'volunteer' || role === 'admin';
  r.set('status', isStaff ? 'approved' : 'pending');

  // Visitor submissions never go straight into the public showcase.
  if (!isStaff) r.set('is_showcase', false);

  e.next();
}, 'items');

// Bring-Punkte bei Freigabe einmal je Teil; Request-Hook, weil ein Success-Hook auch beim Scan-Speichern liefe.
onRecordUpdateRequest((e) => {
  e.next();

  const lib = require(`${__hooks}/lib/points.js`);
  const app = e.app;
  const L = lib.withApp(app);
  const r = e.record;
  if (`${r.get('status')}` !== 'approved') return;
  if (r.get('brought_awarded')) return;
  const submitterId = `${r.get('created_by') || ''}`.trim();
  if (!submitterId) return;

  let submitter;
  try { submitter = app.findRecordById('users', submitterId); } catch (_) { return; }
  // Only visitor-submitted items count as "brought" (staff-created stock doesn't).
  const role = `${submitter.get('role')}`;
  if (role !== 'visitor') return;

  // Der Bring-Faktor der gutgeschriebenen Aktion gilt.
  const campId = `${r.get('campaign') || ''}`.trim();
  let mult = 1.0;
  let campLabel = '';
  if (campId) {
    try {
      const camp = app.findRecordById('campaigns', campId);
      mult = L.campaignMult(camp, 'bring');
      campLabel = `${camp.get('name') || ''}`.trim();
    } catch (_) {}
  }

  const base = L.config().bringPerItem;
  const pts = Math.round(base * mult);
  const label =
    mult > 1 && campLabel
      ? `Teil gebracht (${campLabel} ×${mult}): ${r.get('title')}`
      : `Teil gebracht: ${r.get('title')}`;
  L.awardPoints(submitter, pts, 'bring', label, r.id);

  // Nur, wenn die Aktion aufs Bringen Bonus gibt (lib.bumpActionCount).
  if (campId) {
    try {
      L.bumpActionCount(submitter, app.findRecordById('campaigns', campId), 'bring', 1);
    } catch (_) {}
  }

  L.checkBadges(submitter);

  // Sonst erfährt die Person nie, dass die Punkte da sind.
  try {
    const push = require(`${__hooks}/lib/push.js`);
    // 'badge', weil 'other' standardmäßig aus ist.
    const targets = push.tokensForUser(submitter, 'badge');
    if (targets.length) {
      push.send(
        targets,
        'Dein Teil ist freigegeben',
        `„${r.get('title')}" ist jetzt im Laden – ${pts} Punkte für dich.`,
        '/(visitor)/points',
        'badge'
      );
    }
  } catch (_) {}

  // Direkt gespeichert, das löst diesen Request-Hook nicht erneut aus.
  r.set('brought_awarded', true);
  app.saveNoValidate(r);
}, 'items');
