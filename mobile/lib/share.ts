// Texte und Adressen fürs Teilen, Empfehlen und Bewerten.
//
// Reine Logik ohne React Native, damit sie sich in Node testen lässt
// (tests/share.test.js). Die Screens reichen die Beschriftungen aus
// lib/format.ts herein und rufen damit das Teilen-Menü des Systems auf.
//
// Formatierung: reiner Text mit Zeilenumbrüchen, kein *fett* und kein
// _kursiv_. WhatsApp würde das auszeichnen, iMessage, SMS und Signal zeigen
// die Sternchen dagegen wörtlich an — und welche App die Person im
// Teilen-Menü wählt, erfährt die App vorher nicht. Auch kein Emoji.

export const LINKS = {
  // Die öffentliche Seite des Ladens (web/index.html). In Punycode, weil
  // nicht jede Messenger-App eine Adresse mit Umlaut als Link erkennt.
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
  // Bewusst kein Feld für den Lagerort (item.location): Er ist intern, bei
  // Teilen, die zu Hause bleiben, steht dort eine Privatadresse.
};

export type ShareableStore = { name?: string; address?: string } | null | undefined;

const nichtLeer = (s?: string | null) => `${s ?? ''}`.trim();

// Teilen nur für Teile, die man auch bekommen kann. Vergebene, archivierte
// und noch nicht freigegebene Teile würden jemanden umsonst losschicken.
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

  // Blöcke durch eine Leerzeile getrennt; fehlende Angaben hinterlassen
  // keine leeren Zeilen.
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

// MIME-Typ eines Fotos für das Teilen-Menü, aus der Dateiendung. PocketBase
// nimmt nur JPEG, PNG und WebP an (items.photo); alles andere gilt als JPEG.
export function photoMimeType(filename: string): string {
  const endung = `${filename}`.split('.').pop()?.toLowerCase() ?? '';
  if (endung === 'png') return 'image/png';
  if (endung === 'webp') return 'image/webp';
  return 'image/jpeg';
}

// Wohin „App bewerten" führt. Ein Knopf darf laut Apple nicht den
// System-Dialog (requestReview) auslösen — der erscheint höchstens dreimal im
// Jahr und in TestFlight nie, der Knopf täte dann sichtbar nichts. Apple
// empfiehlt für Knöpfe den direkten Weg zur Bewertungsseite.
//
// Android: zuerst die Play-Store-App (market://), falls sie fehlt die Webseite.
export function reviewUrls(os: string): string[] {
  if (os === 'ios') return [`${LINKS.appStore}?action=write-review`];
  return ['market://details?id=de.godsapp.plietschepluenn', LINKS.playStore];
}
