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

// ── Ein Teil erscheint in sechs Ansichten; die Schlüssel sind Präfixe ──
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

// Aktionen stehen in zwei Queries und steuern zudem, welche Ankündigungen sichtbar sind.
export async function invalidateCampaigns(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['campaigns'] }),
    qc.invalidateQueries({ queryKey: ['campaign', 'active'] }),
    qc.invalidateQueries({ queryKey: ['needs', 'active'] }),
  ]);
}
