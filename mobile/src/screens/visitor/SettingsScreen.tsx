import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../../api/client';
import { colors, fonts, spacing, borderRadius } from '../../theme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ pushEnabled: boolean }>('/api/push/settings')
      .then((res) => setPushEnabled(res.data.pushEnabled))
      .catch(() => {
        // Fehler still: Standard-Wert true beibehalten
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle() {
    const next = !pushEnabled;
    setPushEnabled(next); // Optimistic Update
    try {
      await apiClient.patch('/api/push/settings', { pushEnabled: next });
    } catch {
      setPushEnabled(!next); // Zuruecksetzen bei Fehler
      Toast.show({
        type: 'error',
        text1: 'Fehler',
        text2: 'Einstellung konnte nicht gespeichert werden.',
      });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Benachrichtigungen</Text>

        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Push-Benachrichtigungen</Text>
            <Text style={styles.rowSubtitle}>
              Erhalte Infos zu neuen Aktionen und Highlights.
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={pushEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={pushEnabled ? colors.primary : colors.textLight}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rechtliches</Text>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Privacy' as never)}
        >
          <Text style={styles.rowLabel}>Datenschutz</Text>
          <Text style={styles.rowArrow}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowArrow: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
});
