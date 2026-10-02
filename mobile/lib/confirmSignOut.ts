import { Alert } from 'react-native';

// Abmelden fragt vorher nach. Vorher reichte ein Tipp — im Profil sitzt der
// Knopf zwischen Einstellungen, die man öfter antippt, und wer sich
// versehentlich abmeldet, muss E-Mail und Passwort erst wieder heraussuchen.
export function confirmSignOut(logout: () => Promise<unknown> | void) {
  Alert.alert('Abmelden?', 'Du kannst dich jederzeit mit deiner E-Mail-Adresse wieder anmelden.', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Abmelden', style: 'destructive', onPress: () => { logout(); } },
  ]);
}
