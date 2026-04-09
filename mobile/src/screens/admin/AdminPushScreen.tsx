import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../api/client';
import { colors, fonts, spacing, borderRadius } from '../../theme';

export default function AdminPushScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !loading;

  async function handleSend() {
    if (!canSend) return;
    setLoading(true);
    try {
      await apiClient.post('/api/push/send', { title: title.trim(), body: body.trim() });
      Toast.show({ type: 'success', text1: 'Push gesendet!' });
      setTitle('');
      setBody('');
    } catch {
      Toast.show({ type: 'error', text1: 'Fehler beim Senden', text2: 'Bitte erneut versuchen.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.hint}>
        Sendet eine Push-Benachrichtigung an alle Besucher dieses Stores.
      </Text>

      <Text style={styles.label}>Titel</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Titel der Nachricht"
        placeholderTextColor={colors.textLight}
        maxLength={100}
        editable={!loading}
      />
      <Text style={styles.charCount}>{title.length}/100</Text>

      <Text style={styles.label}>Nachricht</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={body}
        onChangeText={setBody}
        placeholder="Text der Push-Benachrichtigung"
        placeholderTextColor={colors.textLight}
        maxLength={300}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!loading}
      />
      <Text style={styles.charCount}>{body.length}/300</Text>

      <TouchableOpacity
        style={[styles.button, !canSend && styles.buttonDisabled]}
        onPress={handleSend}
        disabled={!canSend}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Push senden</Text>
        )}
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
  hint: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
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
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
});
