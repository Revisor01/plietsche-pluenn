import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import {
  fetchBadgeLevels,
  createBadgeLevel,
  deleteBadgeLevel,
  type BadgeLevel,
} from '../../api/badges.api';
import { colors, fonts, spacing, borderRadius } from '../../theme';

export default function BadgeLevelsScreen() {
  const [levels, setLevels] = useState<BadgeLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formular-State
  const [newEmoji, setNewEmoji] = useState('🏅');
  const [newName, setNewName] = useState('');
  const [newMinPoints, setNewMinPoints] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchBadgeLevels();
      setLevels(data.sort((a, b) => a.minPoints - b.minPoints));
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && !e.response) {
        setError('Keine Internetverbindung');
      } else {
        setError('Stufen konnten nicht geladen werden');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback((level: BadgeLevel) => {
    Alert.alert(
      'Stufe löschen',
      `"${level.emoji} ${level.name}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBadgeLevel(level.id);
              setLevels((prev) => prev.filter((l) => l.id !== level.id));
            } catch {
              Alert.alert('Fehler', 'Stufe konnte nicht gelöscht werden');
            }
          },
        },
      ],
    );
  }, []);

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) {
      Alert.alert('Fehler', 'Bitte einen Namen eingeben');
      return;
    }
    const minPts = parseInt(newMinPoints, 10);
    if (isNaN(minPts) || minPts < 0) {
      Alert.alert('Fehler', 'Bitte gültige Mindestpunkte eingeben');
      return;
    }
    setIsSaving(true);
    try {
      const sortOrder = levels.length > 0
        ? Math.max(...levels.map((l) => l.sortOrder)) + 1
        : 0;
      const created = await createBadgeLevel({
        name: newName.trim(),
        emoji: newEmoji.trim() || '🏅',
        minPoints: minPts,
        sortOrder,
      });
      setLevels((prev) => [...prev, created].sort((a, b) => a.minPoints - b.minPoints));
      setNewName('');
      setNewMinPoints('');
      setNewEmoji('🏅');
    } catch {
      Alert.alert('Fehler', 'Stufe konnte nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  }, [newName, newEmoji, newMinPoints, levels]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={levels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.levelCard}>
            <View style={styles.levelInfo}>
              <Text style={styles.levelEmoji}>{item.emoji}</Text>
              <View style={styles.levelText}>
                <Text style={styles.levelName}>{item.name}</Text>
                <Text style={styles.levelPoints}>ab {item.minPoints} Punkten</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteButtonText}>Löschen</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Keine Stufen definiert</Text>
            <Text style={styles.emptySubtitle}>
              Füge unten eine neue Badge-Stufe hinzu.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.form}>
            <Text style={styles.formTitle}>Neue Stufe hinzufügen</Text>
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, styles.inputEmoji]}
                value={newEmoji}
                onChangeText={setNewEmoji}
                placeholder="🏅"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.inputName]}
                value={newName}
                onChangeText={setNewName}
                placeholder="Name der Stufe"
                maxLength={100}
              />
            </View>
            <TextInput
              style={styles.input}
              value={newMinPoints}
              onChangeText={setNewMinPoints}
              placeholder="Mindestpunkte (z.B. 150)"
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.addButton, isSaving && styles.addButtonDisabled]}
              onPress={handleAdd}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.addButtonText}>Stufe hinzufügen</Text>
              )}
            </TouchableOpacity>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  listContent: { padding: spacing.md },
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelEmoji: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  levelText: { flex: 1 },
  levelName: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  levelPoints: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputEmoji: {
    width: 56,
    textAlign: 'center',
    fontSize: 20,
    marginBottom: 0,
  },
  inputName: {
    flex: 1,
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
