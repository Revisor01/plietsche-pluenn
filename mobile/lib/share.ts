// Texte und Adressen fürs Teilen, ohne React Native testbar; reiner Text ohne Markdown oder Emoji, weil nicht jeder Messenger es auszeichnet.

export const LINKS = {
  // Punycode, weil nicht jeder Messenger eine Umlaut-Adresse verlinkt.
  web: 'https://xn--plietsche-plnn-rsb.de',
  appStore: 'https://apps.apple.com/app/id6784690448',
  playStore: 'https://play.google.com/store/apps/details?id=de.godsapp.plietschepluenn',
} as const;

export type ShareableItem = {
  title: string;
  size?: string;
  // Beschriftungen, nicht die Schlüssel: „Sehr gut", „Damen", „Hosen".
  condition?: string;
  group?: string;
  type?: string;
  // Die öffentliche Beschreibung, die auch Besucher:innen sehen.
  note?: string;
  staysExternal?: boolean;
  // Kein Lagerort, dort steht bei Teilen zu Hause eine Privatadresse.
};

export type ShareableStore = { name?: string; address?: string } | null | undefined;

const nichtLeer = (s?: string | null) => `${s ?? ''}`.trim();

// Nur verfügbare Teile, sonst schickt man jemanden umsonst los.
export function canShareItem(item: {
  status?: string;
  taken_at?: string;
  archived_at?: string;
}): boolean {
  const status = nichtLeer(item.status);
  if (status && status !== 'approved') return false;
  return !nichtLeer(item.taken_at) && !nichtLeer(item.archived_at);
}

export function itemShareText(item: ShareableItem, store?: ShareableStore): string {
  const ladenName = nichtLeer(store?.name) || 'Plietsche Plünn';
  const adresse = nichtLeer(store?.address);

  const eckdaten = [
    nichtLeer(item.size) && `Größe ${nichtLeer(item.size)}`,
    nichtLeer(item.condition) && `Zustand: ${nichtLeer(item.condition)}`,
  ].filter(Boolean).join(' · ');
  const fuerWen = [nichtLeer(item.group), nichtLeer(item.type)].filter(Boolean).join(' · ');

  const wo = item.staysExternal
    ? `Das Teil lagert nicht im Laden – sprich das Team bei ${ladenName} an, es stellt den Kontakt her.`
    : `Zum Mitnehmen bei ${ladenName}${adresse ? `, ${adresse}` : ''}.`;

  const teil = [
    nichtLeer(item.title),
    eckdaten,
    fuerWen && `Für: ${fuerWen}`,
    nichtLeer(item.note),
  ].filter(Boolean).join('\n');

  return [`Schau mal, was es bei ${ladenName} gibt:`, teil, wo, `Mehr zum Laden: ${LINKS.web}`].join('\n\n');
}

export function appRecommendationText(store?: ShareableStore): string {
  const ladenName = nichtLeer(store?.name) || 'Plietsche Plünn';
  return [
    `Kennst du schon die App von ${ladenName}? Damit siehst du, was es im Tauschladen gerade gibt, und sammelst Punkte fürs Vorbeikommen, Mitnehmen und Bringen.`,
    '',
    `iPhone: ${LINKS.appStore}`,
    `Android: ${LINKS.playStore}`,
  ].join('\n');
}

// MIME-Typ aus der Endung; PocketBase nimmt nur JPEG, PNG und WebP, sonst gilt JPEG.
export function photoMimeType(filename: string): string {
  const endung = `${filename}`.split('.').pop()?.toLowerCase() ?? '';
  if (endung === 'png') return 'image/png';
  if (endung === 'webp') return 'image/webp';
  return 'image/jpeg';
}

// Direkt zur Bewertungsseite, weil requestReview höchstens dreimal im Jahr erscheint; Android zuerst market://.
export function reviewUrls(os: string): string[] {
  if (os === 'ios') return [`${LINKS.appStore}?action=write-review`];
  return ['market://details?id=de.godsapp.plietschepluenn', LINKS.playStore];
}
