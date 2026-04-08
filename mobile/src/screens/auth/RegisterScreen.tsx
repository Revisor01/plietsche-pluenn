import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

// Fester storeId für Phase 1 (Single-Tenant) — wird in Phase 2+ konfigurierbar.
// Nach dem ersten `npm run db:seed` im Backend die Store-UUID aus der DB-Ausgabe
// hier eintragen oder als STORE_ID Env-Variable setzen.
const PHASE1_STORE_ID = process.env.STORE_ID ?? '00000000-0000-0000-0000-000000000000';

type Props = {
  navigation: StackNavigationProp<any>;
};

export default function RegisterScreen({ navigation }: Props): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfüllen');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post('/api/auth/register', {
        username, email, password,
        storeId: PHASE1_STORE_ID,
      });
      login(data.token, data.user);
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'Registrierung fehlgeschlagen';
      Alert.alert('Fehler', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrieren</Text>
      <TextInput
        style={styles.input}
        placeholder="Benutzername (min. 3 Zeichen)"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username"
      />
      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Passwort (min. 8 Zeichen)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Konto erstellen</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.linkText}>Zurück zum Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, marginBottom: 16, fontSize: 16,
  },
  button: {
    backgroundColor: '#2d6a4f', padding: 14, borderRadius: 8,
    alignItems: 'center', marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { textAlign: 'center', color: '#2d6a4f', fontSize: 14 },
});
