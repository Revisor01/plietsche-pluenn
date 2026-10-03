import { File } from 'expo-file-system';

// Ein Foto für einen PocketBase-Upload (FormData-Feld „photo").
//
// Expo 57 ersetzt fetch durch expo/fetch. Dessen FormData-Umwandlung kennt
// die React-Native-Form { uri, name, type } nicht und wirft — das SDK meldete
// daraus Status 0, die App „Keine Verbindung zum Laden-Server". Ein File aus
// expo-file-system implementiert Blob und bytes(); das liest expo/fetch.
// Dateiname und MIME-Typ bringt das File selbst mit. PocketBase prüft den
// Typ ohnehin am Inhalt, nicht an der Angabe.
//
// Ein Schalter auf das alte fetch (EXPO_PUBLIC_USE_RN_FETCH) wirkt im fertigen
// Build nicht: process.env enthält zur Laufzeit nur NODE_ENV.
export function photoPart(uri: string): File {
  return new File(uri);
}
