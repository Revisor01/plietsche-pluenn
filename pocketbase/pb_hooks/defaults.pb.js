/// <reference path="../pb_data/types.d.ts" />

// Apply field defaults that PocketBase select/number fields can't express,
// and auto-generate item SKU + QR code on create.

onRecordBeforeCreateRequest((e) => {
  const r = e.record;
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
}, 'users');

onRecordBeforeCreateRequest((e) => {
  const r = e.record;
  // Readable counter-based SKU: PP-0001 ... (volunteer-friendly).
  if (!r.get('sku')) {
    const count = $app.dao().findRecordsByExpr('items').length;
    const n = String(count + 1).padStart(4, '0');
    r.set('sku', `PP-${n}`);
  }
  // QR code defaults to the SKU if not provided.
  if (!r.get('qr_code')) {
    r.set('qr_code', r.get('sku'));
  }
  if (r.get('points') == null) r.set('points', 30);
  if (r.get('is_showcase') == null) r.set('is_showcase', false);

  // Track who created the item.
  const auth = e.httpContext && e.httpContext.get('authRecord');
  if (auth && !r.get('created_by')) r.set('created_by', auth.id);

  // Approval flow: staff items are approved immediately; visitor submissions
  // must be reviewed → forced to "pending". Visitors can never self-approve
  // because updateRule is staff-only. The server decides status, not the client.
  const role = auth ? `${auth.get('role')}` : 'visitor';
  const isStaff = role === 'volunteer' || role === 'admin';
  r.set('status', isStaff ? 'approved' : 'pending');

  // Visitor submissions never go straight into the public showcase.
  if (!isStaff) r.set('is_showcase', false);
}, 'items');
