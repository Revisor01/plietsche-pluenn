/// <reference path="../pb_data/types.d.ts" />

// Apply field defaults that PocketBase select/number fields can't express,
// and auto-generate item SKU + QR code on create.
//
// Ab PocketBase 0.23 sind das Request-Hooks mit Kette: Was vor e.next()
// steht, läuft VOR dem Speichern und landet im Datensatz; e.next() prüft und
// speichert; was danach steht, läuft auf dem gespeicherten Stand. Wer e.next()
// vergisst, speichert nichts.
//
// Rechte: e.hasSuperuserAuth() ist der PocketBase-Superuser (unter 0.22
// httpContext.get('admin')). e.auth ist die angemeldete Person — bei einem
// Superuser aber dessen Datensatz aus `_superusers`, ohne Rolle und ohne
// Konto in `users`.
//
// Lesen und Schreiben über e.app: Läuft die Anfrage als Teil eines Stapels
// (Batch-API), ist das die Transaktion; $app würde darin blockieren.

onRecordCreateRequest((e) => {
  const r = e.record;
  // Die Registrierung ist offen (createRule ""), der Anfragekörper kommt also
  // von beliebigen Clients. Rolle, Punktestand und Serie setzt deshalb nur der
  // Server — sonst legte ein POST mit role "admin" ein Admin-Konto an (so bis
  // 26.09.2026) oder ein Startguthaben, dem die Abzeichen-Vergabe vertraut.
  // Ausnahme wie beim Ändern: Superuser und App-Admins legen Konten mit Rolle an.
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
  // Push defaults: streak/campaign/badge on, other off.
  // bool fields default to false in the request body, so set them unconditionally
  // on create (the user has no way to opt out during registration anyway).
  r.set('push_streak_enabled', true);
  r.set('push_campaign_enabled', true);
  r.set('push_badge_enabled', true);
  r.set('push_other_enabled', false);

  e.next();
}, 'users');

// Score fields are server-owned. PocketBase auth collections let a user PATCH
// their own record, which would otherwise allow setting points_total or
// streak_weeks by hand — and badge awarding trusts those values. Any client
// request that tries to change them is reverted to the stored value;
// server-side code writes via $app.save…() and never passes through this
// request hook.
onRecordUpdateRequest((e) => {
  const r = e.record;
  let stored = null;
  try {
    stored = e.app.findRecordById('users', r.id);
  } catch (_) {}

  if (stored) {
    // Admins keep manual correction rights (e.g. fixing a miscount): both the
    // PocketBase superuser and an app admin editing someone else's record.
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
  // Readable SKU: PP-0001 ... derived from the highest existing number (not the
  // row count — deletions would otherwise cause collisions on the unique index).
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
  // Ein Zahlenfeld ohne Wert liefert 0, nicht null — eine Prüfung auf
  // `== null` griffe hier also nie, und in der Teileliste stünde 0, obwohl
  // das Teil beim Mitnehmen 30 Punkte bringt (scan.pb.js rechnet `|| 30`).
  // Wer ein Teil bewusst mit 0 Punkten anlegen will, trägt es danach ein.
  if (!r.get('points')) r.set('points', 30);
  if (r.get('is_showcase') == null) r.set('is_showcase', false);

  // Track who created the item. Ein Superuser hat kein Konto in `users` —
  // sein Datensatz gehört nicht in die Relation (unter 0.22 war authRecord
  // für ihn leer, und so bleibt es: kein created_by, Status wie Besucherin).
  const auth = e.auth && !e.auth.isSuperuser() ? e.auth : null;
  if (auth && !r.get('created_by')) r.set('created_by', auth.id);

  // Approval flow: staff items are approved immediately; visitor submissions
  // must be reviewed → forced to "pending". Visitors can never self-approve
  // because updateRule is staff-only. The server decides status, not the client.
  const role = auth ? `${auth.get('role')}` : 'visitor';
  const isStaff = role === 'volunteer' || role === 'admin';
  r.set('status', isStaff ? 'approved' : 'pending');

  // Visitor submissions never go straight into the public showcase.
  if (!isStaff) r.set('is_showcase', false);

  e.next();
}, 'items');

// "Bringen": when a staff member approves a visitor's submitted item, the
// submitter earns bring points — once per item (brought_awarded flag).
//
// Nach e.next(), also auf dem gespeicherten Stand — wie unter 0.22
// onRecordAfterUpdateRequest. Bewusst ein Request-Hook und nicht
// onRecordAfterUpdateSuccess: Der liefe bei JEDEM Speichern eines Teils, auch
// bei serverseitigen (der Scan setzt taken_at). Ein freigegebenes Besucher-Teil
// ohne brought_awarded — etwa aus der Zeit vor den Bring-Punkten — zahlte dann
// beim Mitnehmen plötzlich Punkte an die Person, die es gebracht hat.
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

  // If the staff member credited this item to an action, that action's BRING
  // multiplier applies to the bring points. No campaign credited → plain points.
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

  // Teilnahme mitzählen — nur wenn die Aktion aufs Bringen auch Bonus gibt
  // (siehe lib.bumpActionCount). Treibt die Aktions-Abzeichen.
  if (campId) {
    try {
      L.bumpActionCount(submitter, app.findRecordById('campaigns', campId), 'bring', 1);
    } catch (_) {}
  }

  L.checkBadges(submitter);

  // Tell the submitter their item went through — approval happens later, so
  // without this they'd never learn the points landed.
  try {
    const push = require(`${__hooks}/lib/push.js`);
    // 'badge' category: on by default, and this is a personal reward message —
    // 'other' defaults to off, so the confirmation would never arrive.
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

  // Flag so re-approval doesn't pay twice. Direkt gespeichert: Das löst nur
  // die Modell-Hooks aus, nicht diesen Request-Hook — kein erneuter Durchlauf.
  r.set('brought_awarded', true);
  app.saveNoValidate(r);
}, 'items');
