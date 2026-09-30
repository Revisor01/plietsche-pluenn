// Zustand eines Teils in der Teile-Übersicht: Archiv, Filter, Zurückholen.
//
// Reine Logik ohne React Native, damit sie sich in Node testen lässt
// (tests/item-archive.test.js).

import type { Item } from './types';

export type InventoryFilter = 'all' | 'showcase' | 'pending' | 'external' | 'taken' | 'archived';

// Archiviert ist ein Teil am Status oder — bei Altbestand aus der Zeit vor dem
// status-Feld — am Datum. scan.pb.js sperrt das Mitnehmen am Datum.
export function isArchived(item: Pick<Item, 'status' | 'archived_at'>): boolean {
  return item.status === 'archived' || `${item.archived_at ?? ''}`.trim() !== '';
}

// Archivierte Teile stehen nur unter „Archiv". Vorher blieben sie unter
// „Alle" stehen und sahen aus, als hätte der Mülleimer nichts getan.
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

// Status beim Zurückholen aus dem Archiv.
//
// Freigeben zahlt dem Einreichenden einmalig Bring-Punkte (defaults.pb.js,
// Merker brought_awarded). Ablehnen archiviert eine Einreichung. Käme sie
// beim Zurückholen direkt als „approved" zurück, wäre das eine Freigabe an der
// Prüfung vorbei — ohne die Wahl von Schaufenster und Aktion. Deshalb geht
// eine nie freigegebene Einreichung zurück in „Zu prüfen".
//
// Vom Team angelegte Teile sind nie Einreichungen. Die Rolle steht nur im
// expand, wenn der Server das Konto herausgibt; fehlt sie, gilt das Teil im
// Zweifel als Einreichung — ein Tipp auf „Freigeben" mehr ist billiger als
// Punkte, die niemand vergeben wollte.
export function restoreStatus(item: Item): 'pending' | 'approved' {
  if (item.brought_awarded) return 'approved';
  if (!`${item.created_by ?? ''}`.trim()) return 'approved';
  const role = item.expand?.created_by?.role;
  if (role === 'volunteer' || role === 'admin') return 'approved';
  return 'pending';
}
