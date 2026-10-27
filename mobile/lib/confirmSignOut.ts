import { Alert } from 'react-native';

// Rückfrage, weil der Knopf zwischen oft angetippten Einstellungen sitzt.
export function confirmSignOut(logout: () => Promise<unknown> | void) {
  Alert.alert('Abmelden?', 'Du kannst dich jederzeit mit deiner E-Mail-Adresse wieder anmelden.', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Abmelden', style: 'destructive', onPress: () => { logout(); } },
  ]);
}
