import { pb } from './pb';

// Unified scan result — the server tells us what kind of QR it was.
export interface ScanResult {
  type: 'checkin' | 'item';
  points: number;
  points_total: number;
  // checkin fields
  already_checked_in?: boolean;
  streak_weeks?: number;
  // item fields
  label?: string;
  item_points?: number;
  checkin_points?: number;
  did_checkin?: boolean;
}

export async function scan(params: {
  qr_code: string;
  gps_lat?: number;
  gps_lng?: number;
  items_count?: number;
}): Promise<ScanResult> {
  return pb.send('/api/pp/scan', {
    method: 'POST',
    body: params,
  });
}

// ── Items: einstellen / freigeben ──────────────────────────────
import type { Item, Badge } from './types';

// ── Badges: Admin-Verwaltung ───────────────────────────────────
export type BadgeInput = Partial<Omit<Badge, 'id'>>;

export async function createBadge(input: BadgeInput): Promise<Badge> {
  return (await pb.collection('badges').create(input)) as unknown as Badge;
}

export async function updateBadge(id: string, patch: BadgeInput): Promise<Badge> {
  return (await pb.collection('badges').update(id, patch)) as unknown as Badge;
}

export async function deleteBadge(id: string): Promise<void> {
  await pb.collection('badges').delete(id);
}

// ── Aktionen (campaigns) ───────────────────────────────────────
import type { Campaign, Need } from './types';

export async function createCampaign(input: Partial<Omit<Campaign, 'id'>>): Promise<Campaign> {
  return (await pb.collection('campaigns').create(input)) as unknown as Campaign;
}
export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign> {
  return (await pb.collection('campaigns').update(id, patch)) as unknown as Campaign;
}
export async function deleteCampaign(id: string): Promise<void> {
  await pb.collection('campaigns').delete(id);
}

// ── Globale Punkte-Ränge (store.tiers_json) ────────────────────
export async function saveTiers(storeId: string, tiers: { name: string; at: number }[]): Promise<void> {
  await pb.collection('store').update(storeId, { tiers_json: tiers });
}

// ── Bedarf-Aushang (needs) ─────────────────────────────────────
export async function createNeed(input: Partial<Omit<Need, 'id'>>): Promise<Need> {
  return (await pb.collection('needs').create(input)) as unknown as Need;
}
export async function updateNeed(id: string, patch: Partial<Need>): Promise<Need> {
  return (await pb.collection('needs').update(id, patch)) as unknown as Need;
}
export async function deleteNeed(id: string): Promise<void> {
  await pb.collection('needs').delete(id);
}

export interface NewItemInput {
  title: string;
  category: string;
  size?: string;
  condition?: string;
  points?: number;
  note?: string;
  location?: string;
  stays_external?: boolean;
  is_showcase?: boolean;
  photoUri?: string | null;
}

// Create an item. The server sets sku, qr_code and status (staff→approved,
// visitor→pending) in pb_hooks. A photo is uploaded via multipart FormData.
export async function createItem(input: NewItemInput): Promise<Item> {
  const form = new FormData();
  form.append('title', input.title);
  form.append('category', input.category);
  if (input.size) form.append('size', input.size);
  if (input.condition) form.append('condition', input.condition);
  if (input.points != null) form.append('points', String(input.points));
  if (input.note) form.append('note', input.note);
  if (input.location) form.append('location', input.location);
  form.append('stays_external', input.stays_external ? 'true' : 'false');
  // Only staff may set is_showcase; the server hook forces visitor items to
  // is_showcase=false regardless, so sending it is safe.
  if (input.is_showcase) form.append('is_showcase', 'true');
  if (input.photoUri) {
    const name = input.photoUri.split('/').pop() || 'photo.jpg';
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    // React Native FormData file shape.
    form.append('photo', { uri: input.photoUri, name, type: mime } as any);
  }
  return (await pb.collection('items').create(form)) as unknown as Item;
}

// Staff approval: pending → approved (optionally push to showcase).
// Approve an item. Optionally push to showcase and credit it to a campaign
// (the latter drives action_participation badges for the submitter).
export async function approveItem(id: string, showcase = false, campaignId?: string): Promise<Item> {
  return (await pb.collection('items').update(id, {
    status: 'approved',
    ...(showcase ? { is_showcase: true } : {}),
    ...(campaignId ? { campaign: campaignId } : {}),
  })) as unknown as Item;
}

// Staff: toggle an item in/out of the public showcase.
export async function setShowcase(id: string, on: boolean): Promise<Item> {
  return (await pb.collection('items').update(id, { is_showcase: on })) as unknown as Item;
}

// Staff: patch arbitrary editable fields (title, location, points, …).
export async function updateItem(id: string, patch: Partial<Item>): Promise<Item> {
  return (await pb.collection('items').update(id, patch)) as unknown as Item;
}

// Staff: archive an item (hide from inventory/showcase without deleting).
export async function archiveItem(id: string): Promise<Item> {
  return (await pb.collection('items').update(id, {
    status: 'archived',
    is_showcase: false,
    archived_at: new Date().toISOString(),
  })) as unknown as Item;
}
