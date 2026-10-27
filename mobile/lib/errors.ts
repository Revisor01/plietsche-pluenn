// Deutsche Fehlertexte; das SDK setzt `message` immer, auch mit englischen Entwicklersätzen.

// Sätze aus dem ClientResponseError-Konstruktor (pocketbase 0.22.x).
const SDK_MESSAGES = [
  'Something went wrong while processing your request.',
  'The request was autocancelled.',
  'Failed to connect to the PocketBase server.',
];

function isSdkMessage(msg: string): boolean {
  return SDK_MESSAGES.some((s) => msg.startsWith(s));
}

// Deutsch wirkende Server-Meldungen gelten als brauchbar, die eigenen Routen antworten deutsch.
const GERMAN_HINT =
  /[äöüßÄÖÜ]|\b(nicht|kein|keine|keinen|schon|noch|bitte|du|dein|deine|darfst|muss|mehr|laden|punkte|teil|teile|angemeldet|freigegeben|unbekannt\w*|pro|besuch|konfiguriert)\b/i;

function looksGerman(msg: string): boolean {
  return GERMAN_HINT.test(msg);
}

// Feldfehler sind englisch, zeigen aber, dass es an der Eingabe lag.
function hasFieldErrors(e: any): boolean {
  const data = e?.response?.data ?? e?.data;
  return !!data && typeof data === 'object' && Object.keys(data).length > 0;
}

/** Deutsche Meldung für einen Dialog; [fallback] beschreibt die Aktion, die nicht geklappt hat. */
export function errorText(e: unknown, fallback: string): string {
  const err = e as any;
  if (!err) return fallback;

  // Abgebrochene Anfrage, kein Serverfehler.
  if (err.isAbort) return 'Die Anfrage wurde abgebrochen. Bitte noch einmal versuchen.';

  // Nur ClientResponseError trägt `status`; eigene englische Fehler gehören nicht in einen Dialog.
  const isPbError = typeof err.status === 'number' && typeof err.response === 'object';
  if (!isPbError) return fallback;

  const status = err.status as number;

  // Status 0: die Anfrage kam nicht an.
  if (status === 0) return 'Keine Verbindung zum Laden-Server. Bist du online?';

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
