import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import axios from 'axios';
import { createCampaign } from '../../api/campaigns.api';
import { colors, fonts, spacing, borderRadius } from '../../theme';

type RootStackParamList = {
  CampaignCreate: { onCreated: () => void };
};

type CampaignCreateRouteProp = RouteProp<RootStackParamList, 'CampaignCreate'>;

function toISOString(dateStr: string, timeStr: string): string {
  // Combine "YYYY-MM-DD" + "HH:MM" into ISO string
  const dt = `${dateStr}T${timeStr || '00:00'}:00Z`;
  return dt;
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
  hint?: string;
  error?: string;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, hint, error }: FieldProps) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.inputMultiline, error ? fieldStyles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.error,
    marginTop: 4,
  },
});

export default function CampaignCreateScreen() {
  const navigation = useNavigation();
  const route = useRoute<CampaignCreateRouteProp>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [multiplier, setMultiplier] = useState('2');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    const mult = parseFloat(multiplier);
    if (isNaN(mult) || mult < 1 || mult > 10) {
      newErrors.multiplier = 'Multiplikator muss zwischen 1 und 10 liegen';
    }

    const startIso = startDate ? toISOString(startDate, startTime) : '';
    const endIso = endDate ? toISOString(endDate, endTime) : '';

    if (!startDate || isNaN(new Date(startIso).getTime())) {
      newErrors.startDate = 'Gültiges Startdatum eingeben (YYYY-MM-DD)';
    }
    if (!endDate || isNaN(new Date(endIso).getTime())) {
      newErrors.endDate = 'Gültiges Enddatum eingeben (YYYY-MM-DD)';
    }

    if (startDate && endDate && !newErrors.startDate && !newErrors.endDate) {
      if (new Date(endIso) <= new Date(startIso)) {
        newErrors.endDate = 'Enddatum muss nach dem Startdatum liegen';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await createCampaign({
        title: title.trim(),
        description: description.trim() || undefined,
        multiplier: parseFloat(multiplier),
        startsAt: toISOString(startDate, startTime),
        endsAt: toISOString(endDate, endTime),
      });

      route.params?.onCreated?.();
      navigation.goBack();
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data?.error) {
        Alert.alert('Fehler', e.response.data.error);
      } else {
        Alert.alert('Fehler', 'Kampagne konnte nicht erstellt werden');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Field
          label="Titel *"
          value={title}
          onChangeText={setTitle}
          placeholder="z.B. Frühjahrs-Aktion"
          error={errors.title}
        />

        <Field
          label="Beschreibung (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Kurze Beschreibung der Aktion..."
          multiline
        />

        <Field
          label="Multiplikator *"
          value={multiplier}
          onChangeText={setMultiplier}
          placeholder="2"
          keyboardType="decimal-pad"
          hint="z.B. 2 für doppelte Punkte, 3 für dreifache Punkte (max. 10)"
          error={errors.multiplier}
        />

        <Field
          label="Startdatum *"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          hint="Format: 2026-04-01"
          error={errors.startDate}
        />

        <Field
          label="Startzeit"
          value={startTime}
          onChangeText={setStartTime}
          placeholder="00:00"
          hint="Format: HH:MM (UTC)"
        />

        <Field
          label="Enddatum *"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          hint="Format: 2026-04-30"
          error={errors.endDate}
        />

        <Field
          label="Endzeit"
          value={endTime}
          onChangeText={setEndTime}
          placeholder="23:59"
          hint="Format: HH:MM (UTC)"
        />

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Kampagne erstellen</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
});
