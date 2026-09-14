import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Abhängigkeiten des Bestands ────────────────────────────────
// Ein Teil taucht in sechs Ansichten auf. Wer eins freigibt, ablehnt,
// einstellt, archiviert oder ins Schaufenster schiebt, ändert damit alle
// sechs — der Zähler „Teile warten" auf der Startseite liegt in einem anderen
// Cache-Eintrag als die Liste, in der die Helferin gerade freigibt.
// `refetch()` auf dem eigenen Screen erreicht die anderen nicht.
// Die Schlüssel sind Präfixe: ['showcase'] trifft auch ['showcase', 12],
// ['recent_items'] auch ['recent_items', 6].
const ITEM_KEYS: string[][] = [
  ['pending_items'],
  ['all_items'],
  ['my_items'],
  ['showcase'],
  ['recent_items'],
  ['store_items'],
];

// Nach jeder Änderung am Bestand aufrufen.
export async function invalidateItems(qc: QueryClient): Promise<void> {
  await Promise.all(ITEM_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

// Aktionen stehen in zwei getrennten Queries (['campaigns','all'] für den
// Admin, ['campaigns','active-list'] für den Aushang auf der Startseite) und
// steuern zusätzlich, welche Ankündigungen sichtbar sind: eine Ankündigung,
// die zu einer laufenden Aktion gehört, wird ausgeblendet.
export async function invalidateCampaigns(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['campaigns'] }),
    qc.invalidateQueries({ queryKey: ['campaign', 'active'] }),
    qc.invalidateQueries({ queryKey: ['needs', 'active'] }),
  ]);
}
