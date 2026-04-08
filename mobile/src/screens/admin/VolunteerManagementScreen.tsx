import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../../store/authStore';
import { colors, fonts, spacing, borderRadius } from '../../theme';

const API_BASE = 'https://xn--plietsche-plnn-rsb.de/api';

interface VolunteerUser {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function VolunteerManagementScreen() {
  const [volunteers, setVolunteers] = useState<VolunteerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadVolunteers() {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Laden fehlgeschlagen');
      const data = await res.json();
      setVolunteers(data.users);
    } catch (_e) {
      Toast.show({ type: 'error', text1: 'Fehler beim Laden der Volunteers' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!username.trim() || !email.trim() || password.length < 8) {
      Toast.show({ type: 'error', text1: 'Alle Felder ausfüllen (Passwort mind. 8 Zeichen)' });
      return;
    }
    setCreating(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Fehler beim Erstellen');
      }
      Toast.show({ type: 'success', text1: 'Volunteer-Account erstellt' });
      setUsername('');
      setEmail('');
      setPassword('');
      loadVolunteers();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Fehler beim Erstellen';
      Toast.show({ type: 'error', text1: message });
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    loadVolunteers();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Team-Mitglieder</Text>
      {loading && <Text style={styles.hint}>Lade...</Text>}
      {!loading && volunteers.length === 0 && (
        <Text style={styles.hint}>Noch keine Volunteers angelegt.</Text>
      )}
      {volunteers.map((v) => (
        <View key={v.id} style={styles.volunteerRow}>
          <Text style={styles.volunteerName}>{v.username}</Text>
          <Text style={styles.volunteerEmail}>{v.email}</Text>
          <Text style={styles.volunteerDate}>
            {new Date(v.createdAt).toLocaleDateString('de-DE')}
          </Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Neues Mitglied anlegen</Text>
      <TextInput
        style={styles.input}
        placeholder="Benutzername"
        placeholderTextColor={colors.textSecondary}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Passwort (mind. 8 Zeichen)"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.button, creating && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={creating}
      >
        <Text style={styles.buttonText}>{creating ? 'Erstelle...' : 'Anlegen'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  volunteerRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  volunteerName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  volunteerEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  volunteerDate: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.white,
  },
});
