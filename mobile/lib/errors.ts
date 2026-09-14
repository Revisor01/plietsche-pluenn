// Deutsche Fehlertexte für Nutzerinnen.
//
// Warum es diese Datei gibt: Das PocketBase-SDK setzt `message` IMMER — auch
// dann, wenn der Server gar nichts geschickt hat. Der ClientResponseError-
// Konstruktor füllt das Feld in dem Fall mit einem englischen Entwicklersatz
// ("Failed to connect to the PocketBase server. Try changing the SDK URL …",
// "Something went wrong while processing your request.", "The request was
// autocancelled …"). Ein `e?.message ?? 'deutscher Text'` greift deshalb nie:
// der deutsche Rückfalltext ist toter Code, und die Nutzerin liest Englisch.
//
// `errorText(e, fallback)` dreht das um: Deutsche Server-Meldungen werden
// durchgereicht (die selbstgebauten Routen in pb_hooks antworten deutsch —
// "Du bist nicht im Laden", "Schon mitgenommen"), alles andere wird auf einen
// deutschen Satz abgebildet.

// Die Sätze, die das SDK selbst erzeugt, wenn der Server keine Meldung liefert.
// Wortlaut aus dem ClientResponseError-Konstruktor (pocketbase 0.22.x).
const SDK_MESSAGES = [
  'Something went wrong while processing your request.',
  'The request was autocancelled.',
  'Failed to connect to the PocketBase server.',
];

function isSdkMessage(msg: string): boolean {
  return SDK_MESSAGES.some((s) => msg.startsWith(s));
}

// Eine Server-Meldung ist brauchbar, wenn sie deutsch wirkt. Umlaute und
// typische deutsche Wörter reichen als Hinweis — die Meldungen aus pb_hooks
// sind kurze deutsche Sätze, die generischen PocketBase-Meldungen englisch.
// Abgedeckt sind damit alle heutigen Meldungen der selbstgebauten Routen:
// "Du bist nicht im Laden", "Schon mitgenommen", "Nicht mehr verfügbar",
// "Noch nicht freigegeben", "Unbekannter QR-Code", "Kein Token",
// "Nicht angemeldet", "Höchstens N Teile pro Besuch.", "Laden nicht
// konfiguriert", "Kein QR-Code".
const GERMAN_HINT =
  /[äöüßÄÖÜ]|\b(nicht|kein|keine|keinen|schon|noch|bitte|du|dein|deine|darfst|muss|mehr|laden|punkte|teil|teile|angemeldet|freigegeben|unbekannt\w*|pro|besuch|konfiguriert)\b/i;

function looksGerman(msg: string): boolean {
  return GERMAN_HINT.test(msg);
}

// Validierungsfehler pro Feld: PocketBase legt sie unter response.data ab,
// je Feld ein { code, message }. Die Meldungen sind englisch ("Cannot be
// blank."), taugen also nicht als Text — sie sagen uns aber, DASS es an der
// Eingabe lag, und das ist die hilfreichere Auskunft.
function hasFieldErrors(e: any): boolean {
  const data = e?.response?.data ?? e?.data;
  return !!data && typeof data === 'object' && Object.keys(data).length > 0;
}

/**
 * Macht aus einem beliebigen Fehler eine deutsche Meldung für einen Dialog.
 *
 * @param e         der gefangene Fehler (meist ein PocketBase ClientResponseError)
 * @param fallback  der Satz für den Fall, dass sich nichts Genaueres sagen lässt —
 *                  beschreibt die Aktion, die nicht geklappt hat
 */
export function errorText(e: unknown, fallback: string): string {
  const err = e as any;
  if (!err) return fallback;

  // Abgebrochene Anfrage (der Screen wurde verlassen, eine neue Anfrage hat
  // die alte ersetzt). Kein Serverfehler, aber wenn es doch angezeigt wird,
  // soll da kein GitHub-Link stehen.
  if (err.isAbort) return 'Die Anfrage wurde abgebrochen. Bitte noch einmal versuchen.';

  // Nur ein ClientResponseError trägt `status` und `response` — ein schlichtes
  // `new Error(...)` aus unserem eigenen Code nicht. Dessen englische
  // Entwicklertexte ("not authenticated") gehören nicht in einen Dialog.
  const isPbError = typeof err.status === 'number' && typeof err.response === 'object';
  if (!isPbError) return fallback;

  const status = err.status as number;

  // Status 0 heißt beim SDK: die Anfrage kam gar nicht beim Server an —
  // kein Netz, Server nicht erreichbar, DNS. Genau hier stand bisher der
  // englische Satz mit dem GitHub-Link.
  if (status === 0) return 'Keine Verbindung zum Laden-Server. Bist du online?';

  // Der Server hat geantwortet und eine eigene Meldung mitgeschickt — die
  // selbstgebauten Routen antworten deutsch, die nehmen wir wörtlich.
  const serverMsg = typeof err.response?.message === 'string' ? err.response.message.trim() : '';
  if (serverMsg && !isSdkMessage(serverMsg) && looksGerman(serverMsg)) return serverMsg;

  switch (status) {
    case 400:
      return hasFieldErrors(err)
        ? 'Die Eingabe passt so nicht. Bitte die Felder prüfen.'
        : fallback;
    case 401:
      return 'Du bist nicht mehr angemeldet. Bitte melde dich neu an.';
    case 403:
      return 'Dafür fehlt dir die Berechtigung.';
    case 404:
      return 'Das gibt es nicht (mehr).';
    case 408:
      return 'Der Server hat zu lange gebraucht. Bitte noch einmal versuchen.';
    case 409:
      return fallback;
    case 413:
      return 'Die Datei ist zu groß.';
    case 429:
      return 'Zu viele Versuche. Bitte kurz warten.';
    default:
      if (status >= 500) return 'Der Laden-Server hat gerade ein Problem. Bitte später noch einmal versuchen.';
      return fallback;
  }
}
