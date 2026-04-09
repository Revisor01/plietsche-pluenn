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
import { GlassCard } from '../../components/GlassCard';

type Props = {
  navigation: StackNavigationProp<any>;
};

export default function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben');
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post('/api/auth/login', { email, password });
      login(data.token, data.user);
    } catch (err: any) {
      const message = err?.response?.data?.error ?? 'Login fehlgeschlagen';
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
        <Text style={styles.logoText}>P²</Text>
        <Text style={styles.title}>Plietsche Plünn</Text>
        <Text style={styles.subtitle}>Dein Kleidertausch-Laden</Text>
      </LinearGradient>

      <GlassCard style={styles.form}>
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
          placeholder="Passwort"
          placeholderTextColor={colors.textLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
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
              <Text style={styles.buttonText}>Anmelden</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>Noch kein Konto? Registrieren</Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.8)',
  },
  form: {
    flex: 1,
    padding: spacing.lg,
    marginTop: -20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: borderRadius.sm,
    padding: 14,
    marginBottom: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  button: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: {
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  linkText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
});
