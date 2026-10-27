import { File } from 'expo-file-system';

// Foto als expo-file-system-File, weil expo/fetch die RN-Form { uri, name, type } nicht umwandeln kann und Status 0 meldete.
export function photoPart(uri: string): File {
  return new File(uri);
}
