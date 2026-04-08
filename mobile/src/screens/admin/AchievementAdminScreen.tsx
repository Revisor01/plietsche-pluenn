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
  ScrollView,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
  fetchAllAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  seedAchievements,
  type Achievement,
  type TriggerType,
  type Tier,
  type Season,
  type CreateAchievementInput,
} from '../../api/badges.api';
import { colors, fonts, spacing, borderRadius } from '../../theme';

const TRIGGER_LABELS: Record<TriggerType, string> = {
  items_brought: 'Teile gebracht',
  items_taken: 'Teile geholt',
  visits: 'Check-Ins',
  streak_weeks: 'Streak (Wo.)',
  season_items_brought: 'Saison gebr.',
  season_items_taken: 'Saison geholt',
  milestone: 'Meilenstein',
};

const TRIGGER_TYPES: TriggerType[] = [
  'items_brought',
  'items_taken',
  'visits',
  'streak_weeks',
  'season_items_brought',
  'season_items_taken',
  'milestone',
];

const TIER_COLORS: Record<Tier, string> = {
  bronze: '#CD7F32',
  silber: '#A8A9AD',
  gold: '#FFD700',
  custom: colors.primary,
};

const TIER_OPTIONS: Tier[] = ['bronze', 'silber', 'gold', 'custom'];
const TIER_LABELS: Record<Tier, string> = {
  bronze: 'Bronze',
  silber: 'Silber',
  gold: 'Gold',
  custom: 'Individual',
};

const SEASON_OPTIONS: Array<Season | null> = ['fruehling', 'sommer', 'herbst', 'winter', null];
const SEASON_LABELS: Record<string, string> = {
  fruehling: 'Fruehling',
  sommer: 'Sommer',
  herbst: 'Herbst',
  winter: 'Winter',
  none: 'Keine',
};

export default function AchievementAdminScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formular-State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIconName, setFormIconName] = useState('trophy');
  const [formTriggerType, setFormTriggerType] = useState<TriggerType>('visits');
  const [formTriggerValue, setFormTriggerValue] = useState('10');
  const [formTier, setFormTier] = useState<Tier>('custom');
  const [formSeason, setFormSeason] = useState<Season | null>(null);
  const [formSortOrder, setFormSortOrder] = useState('0');

  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormDescription('');
    setFormIconName('trophy');
    setFormTriggerType('visits');
    setFormTriggerValue('10');
    setFormTier('custom');
    setFormSeason(null);
    setFormSortOrder('0');
    setEditingId(null);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllAchievements();
      setAchievements(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && !e.response) {
        setError('Keine Internetverbindung');
      } else {
        setError('Badges konnten nicht geladen werden');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEdit = useCallback((achievement: Achievement) => {
    setEditingId(achievement.id);
    setFormName(achievement.name);
    setFormDescription(achievement.description);
    setFormIconName(achievement.iconName);
    setFormTriggerType(achievement.triggerType);
    setFormTriggerValue(String(achievement.triggerValue));
    setFormTier(achievement.tier);
    setFormSeason(achievement.season);
    setFormSortOrder(String(achievement.sortOrder));
  }, []);

  const handleDelete = useCallback((achievement: Achievement) => {
    Alert.alert(
      'Badge loeschen',
      `"${achievement.name}" wirklich loeschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Loeschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAchievement(achievement.id);
              setAchievements((prev) => prev.filter((a) => a.id !== achievement.id));
            } catch {
              Alert.alert('Fehler', 'Badge konnte nicht geloescht werden');
            }
          },
        },
      ],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!formName.trim()) {
      Alert.alert('Fehler', 'Name ist erforderlich');
      return;
    }
    const val = parseInt(formTriggerValue, 10);
    if (isNaN(val) || val < 1) {
      Alert.alert('Fehler', 'Trigger-Wert muss mindestens 1 sein');
      return;
    }
    setIsSaving(true);
    try {
      const body: CreateAchievementInput = {
        name: formName.trim(),
        description: formDescription.trim(),
        iconName: formIconName.trim() || 'trophy',
        triggerType: formTriggerType,
        triggerValue: val,
        tier: formTier,
        season: formSeason,
        sortOrder: parseInt(formSortOrder, 10) || 0,
      };
      if (editingId) {
        const updated = await updateAchievement(editingId, body);
        setAchievements((prev) => prev.map((a) => a.id === editingId ? updated : a));
      } else {
        const created = await createAchievement(body);
        setAchievements((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      resetForm();
    } catch {
      Alert.alert('Fehler', 'Badge konnte nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  }, [formName, formDescription, formIconName, formTriggerType, formTriggerValue, formTier, formSeason, formSortOrder, editingId, resetForm]);

  const handleSeed = useCallback(() => {
    Alert.alert(
      'Default-Badges laden',
      '23 Standard-Badges fuer alle Kategorien werden angelegt. Bestehende Badges werden nicht ueberschrieben.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Laden',
          onPress: async () => {
            setIsSeeding(true);
            try {
              const result = await seedAchievements();
              setAchievements(result.achievements.sort((a, b) => a.sortOrder - b.sortOrder));
            } catch {
              Alert.alert('Fehler', 'Default-Badges konnten nicht geladen werden');
            } finally {
              setIsSeeding(false);
            }
          },
        },
      ],
    );
  }, []);

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

  const renderItem = ({ item }: { item: Achievement }) => (
    <View style={styles.achievementCard}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconBox, { borderColor: TIER_COLORS[item.tier] }]}>
          <Icon name={item.iconName || 'trophy'} solid size={20} color={TIER_COLORS[item.tier]} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.achievementName}>{item.name}</Text>
          <Text style={styles.achievementMeta}>
            {TRIGGER_LABELS[item.triggerType]} — {item.triggerValue}
          </Text>
          <View style={styles.tierBadge}>
            <Text style={[styles.tierBadgeText, { color: TIER_COLORS[item.tier] }]}>
              {TIER_LABELS[item.tier]}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.editButtonText}>Bearbeiten</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>Loeschen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListFooter = (
    <View style={styles.form}>
      <Text style={styles.formTitle}>
        {editingId ? 'Badge bearbeiten' : 'Neues Badge erstellen'}
      </Text>

      <View style={styles.formRow}>
        <View style={styles.iconPreviewBox}>
          <Icon name={formIconName || 'trophy'} solid size={22} color={colors.primary} />
        </View>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          value={formName}
          onChangeText={setFormName}
          placeholder="Name des Badges"
          maxLength={100}
        />
      </View>

      <TextInput
        style={styles.input}
        value={formDescription}
        onChangeText={setFormDescription}
        placeholder="Beschreibung (optional)"
        maxLength={200}
      />

      <TextInput
        style={styles.input}
        value={formIconName}
        onChangeText={setFormIconName}
        placeholder="FA5 Icon-Name (z.B. trophy, fire, star)"
        maxLength={50}
        autoCapitalize="none"
      />

      <Text style={styles.sectionLabel}>Trigger-Typ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipRow}>
          {TRIGGER_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, formTriggerType === t && styles.chipActive]}
              onPress={() => setFormTriggerType(t)}
            >
              <Text style={[styles.chipText, formTriggerType === t && styles.chipTextActive]}>
                {TRIGGER_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TextInput
        style={styles.input}
        value={formTriggerValue}
        onChangeText={setFormTriggerValue}
        placeholder="Trigger-Wert (z.B. 10)"
        keyboardType="numeric"
      />

      <Text style={styles.sectionLabel}>Tier</Text>
      <View style={styles.buttonRow}>
        {TIER_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tierButton,
              formTier === t && { backgroundColor: TIER_COLORS[t], borderColor: TIER_COLORS[t] },
            ]}
            onPress={() => setFormTier(t)}
          >
            <Text
              style={[
                styles.tierButtonText,
                formTier === t ? styles.tierButtonTextActive : { color: TIER_COLORS[t] },
              ]}
            >
              {TIER_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Saison</Text>
      <View style={styles.buttonRow}>
        {SEASON_OPTIONS.map((s) => {
          const key = s ?? 'none';
          const isActive = formSeason === s;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.seasonButton, isActive && styles.seasonButtonActive]}
              onPress={() => setFormSeason(s)}
            >
              <Text style={[styles.seasonButtonText, isActive && styles.seasonButtonTextActive]}>
                {SEASON_LABELS[key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={styles.input}
        value={formSortOrder}
        onChangeText={setFormSortOrder}
        placeholder="Sortierung (z.B. 0)"
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.saveButtonText}>
            {editingId ? 'Aenderungen speichern' : 'Badge erstellen'}
          </Text>
        )}
      </TouchableOpacity>

      {editingId && (
        <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
          <Text style={styles.cancelButtonText}>Abbrechen</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const ListEmpty = (
    <View style={styles.emptyState}>
      <Icon name="trophy" size={40} color={colors.textLight} />
      <Text style={styles.emptyTitle}>Keine Badges vorhanden</Text>
      <Text style={styles.emptySubtitle}>
        Lade die Standard-Badges oder erstelle ein eigenes Badge unten.
      </Text>
      <TouchableOpacity
        style={[styles.seedButton, isSeeding && styles.saveButtonDisabled]}
        onPress={handleSeed}
        disabled={isSeeding}
      >
        {isSeeding ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Icon name="download" size={14} color={colors.white} style={styles.seedIcon} />
            <Text style={styles.seedButtonText}>Default-Badges laden</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={ListEmpty}
        ListHeaderComponent={
          achievements.length > 0 ? (
            <TouchableOpacity
              style={[styles.seedButtonSmall, isSeeding && styles.saveButtonDisabled]}
              onPress={handleSeed}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Icon name="download" size={12} color={colors.white} style={styles.seedIcon} />
                  <Text style={styles.seedButtonText}>Default-Badges laden</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null
        }
        ListFooterComponent={ListFooter}
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

  // Achievement card
  achievementCard: {
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
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  cardText: { flex: 1 },
  achievementName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  achievementMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tierBadge: {
    marginTop: 3,
  },
  tierBadgeText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'column',
    gap: 4,
    marginLeft: spacing.sm,
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  deleteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.error,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    marginTop: spacing.sm,
  },
  seedButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  seedIcon: {
    marginRight: spacing.xs,
  },
  seedButtonText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },

  // Form
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
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconPreviewBox: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFlex: {
    flex: 1,
    marginBottom: 0,
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
  sectionLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  chipScroll: {
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  tierButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tierButtonText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  tierButtonTextActive: {
    color: colors.white,
  },
  seasonButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  seasonButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  seasonButtonText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  seasonButtonTextActive: {
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  cancelButton: {
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },

  // Error
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
