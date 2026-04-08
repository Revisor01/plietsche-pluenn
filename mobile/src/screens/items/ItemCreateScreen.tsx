import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ColorPicker, { HueSlider, Panel1 } from 'reanimated-color-picker';
import { createItem } from '../../api/items.api';
import { useItemStore } from '../../store/itemStore';
import { colors, fonts, spacing, borderRadius } from '../../theme';

const CATEGORIES = ['Oberteil', 'Hose', 'Jacke', 'Schuhe', 'Kleid', 'Accessoire'];

const SIZE_GROUPS: Record<string, string[]> = {
  Erwachsene: [
    'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL',
    '34', '36', '38', '40', '42', '44', '46', '48',
  ],
  Kinder: [
    '56', '62', '68', '74', '80', '86', '92', '98',
    '104', '110', '116', '122', '128', '134', '140',
    '146', '152', '158', '164', '170', '176',
  ],
  Schuhe: Array.from({ length: 31 }, (_, i) => String(18 + i)),
};

export default function ItemCreateScreen() {
  const { lastItem, setLastItem } = useItemStore();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [sizeGroup, setSizeGroup] = useState('Erwachsene');
  const [size, setSize] = useState('');
  const [condition, setCondition] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [isLoading, setIsLoading] = useState(false);

  // ITEM-04: Schnelleingabe — Defaults vom vorherigen Eintrag
  useEffect(() => {
    if (lastItem) {
      if (lastItem.category) { setCategory(lastItem.category); }
      if (lastItem.size) { setSize(lastItem.size); }
      if (lastItem.condition) { setCondition(lastItem.condition); }
      if (lastItem.color) { setColor(lastItem.color); }
    }
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !category) {
      Alert.alert('Fehler', 'Titel und Kategorie sind Pflichtfelder');
      return;
    }
    setIsLoading(true);
    try {
      const item = await createItem({
        title: title.trim(),
        category,
        size: size || undefined,
        condition: condition || undefined,
        color: color || undefined,
      });
      // Schnelleingabe-Defaults speichern
      setLastItem({ category, size, condition, color });
      // Nur Titel zurücksetzen — andere Felder bleiben für Schnelleingabe
      setTitle('');
      Alert.alert('Erfolgreich angelegt!', `"${item.title}" wurde gespeichert.\nQR-Token: ${item.qrToken}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      Alert.alert('Fehler', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Titel *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="z.B. Blaue Jeans"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>Kategorie *</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipSelected]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Größengruppe</Text>
      <View style={styles.chipRow}>
        {Object.keys(SIZE_GROUPS).map((group) => (
          <TouchableOpacity
            key={group}
            style={[styles.chip, sizeGroup === group && styles.chipSelected]}
            onPress={() => setSizeGroup(group)}
          >
            <Text style={[styles.chipText, sizeGroup === group && styles.chipTextSelected]}>{group}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Größe</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizeScroll}>
        {SIZE_GROUPS[sizeGroup].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, size === s && styles.chipSelected]}
            onPress={() => setSize(s)}
          >
            <Text style={[styles.chipText, size === s && styles.chipTextSelected]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TextInput
        style={styles.input}
        value={size}
        onChangeText={setSize}
        placeholder="Oder Freitext (z.B. One Size)"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>Zustand</Text>
      <TextInput
        style={styles.input}
        value={condition}
        onChangeText={setCondition}
        placeholder="z.B. einwandfrei, kleine Flecken"
        placeholderTextColor={colors.textLight}
      />

      <Text style={styles.label}>Farbe</Text>
      <View style={[styles.colorPreview, { backgroundColor: color }]} />
      <ColorPicker
        style={styles.colorPicker}
        value={color}
        onComplete={({ hex }) => setColor(hex)}
      >
        <Panel1 />
        <HueSlider style={styles.hueSlider} />
      </ColorPicker>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <LinearGradient
          colors={[...colors.gradientColors]}
          locations={[...colors.gradientLocations]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitButtonGradient}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Item anlegen</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  label: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: 12,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary },
  chipTextSelected: { color: colors.white, fontFamily: fonts.medium },
  sizeScroll: { marginBottom: 8 },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorPicker: { width: '100%', marginVertical: 8 },
  hueSlider: { marginTop: 12 },
  submitButton: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonGradient: { padding: 16, alignItems: 'center' },
  submitButtonText: { color: colors.white, fontSize: 16, fontFamily: fonts.bold },
});
