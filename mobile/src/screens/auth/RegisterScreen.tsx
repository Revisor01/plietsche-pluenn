import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { StackNavigationProp } from '@react-navigation/stack';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { colors, fonts, spacing, borderRadius } from '../../theme';

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
      <LinearGradient
        colors={[...colors.gradientColors]}
        locations={[...colors.gradientLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>Registrieren</Text>
        <Text style={styles.subtitle}>Erstelle deinen Plietsche-Plünn-Account</Text>
      </LinearGradient>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Benutzername (min. 3 Zeichen)"
          placeholderTextColor={colors.textLight}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username"
        />
        <TextInput
          style={styles.input}
          placeholder="E-Mail"
          placeholderTextColor={colors.textLight}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort (min. 8 Zeichen)"
          placeholderTextColor={colors.textLight}
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
          <LinearGradient
            colors={[...colors.gradientColors]}
            locations={[...colors.gradientLocations]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Konto erstellen</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Zurück zum Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  title: { fontSize: 28, fontFamily: fonts.bold, color: colors.white, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.8)' },
  form: {
    flex: 1,
    padding: spacing.lg,
    marginTop: -20,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: 14,
    marginBottom: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  button: { borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.md },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: { padding: 14, alignItems: 'center' },
  buttonText: { color: colors.white, fontSize: 16, fontFamily: fonts.semiBold },
  linkText: { textAlign: 'center', color: colors.primary, fontSize: 14, fontFamily: fonts.medium },
});
