// Zustand eines Teils (Archiv, Filter, Zurückholen), ohne React Native testbar.

import type { Item } from './types';

export type InventoryFilter = 'all' | 'showcase' | 'pending' | 'external' | 'taken' | 'archived';

// Altbestand ohne status-Feld gilt am Datum als archiviert, wie in scan.pb.js.
export function isArchived(item: Pick<Item, 'status' | 'archived_at'>): boolean {
  return item.status === 'archived' || `${item.archived_at ?? ''}`.trim() !== '';
}

// Archiviertes nur unter „Archiv“.
export function filterItems<T extends Item>(items: T[], filter: InventoryFilter): T[] {
  if (filter === 'archived') return items.filter(isArchived);
  const active = items.filter((i) => !isArchived(i));
  switch (filter) {
    case 'showcase':
      return active.filter((i) => i.is_showcase && !i.taken_at);
    case 'pending':
      return active.filter((i) => i.status === 'pending');
    case 'external':
      return active.filter((i) => i.stays_external && !i.taken_at);
    case 'taken':
      return active.filter((i) => !!i.taken_at);
    default:
      return active;
  }
}

// Nie freigegebene Einreichungen kehren in „Zu prüfen“ zurück, sonst Freigabe an der Prüfung vorbei; ohne Rolle im Zweifel Einreichung.
export function restoreStatus(item: Item): 'pending' | 'approved' {
  if (item.brought_awarded) return 'approved';
  if (!`${item.created_by ?? ''}`.trim()) return 'approved';
  const role = item.expand?.created_by?.role;
  if (role === 'volunteer' || role === 'admin') return 'approved';
  return 'pending';
}
