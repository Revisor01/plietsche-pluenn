import { useState } from 'react';
import { View, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PP, alpha } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { PPText } from './Text';

// Format a Date as TT.MM.JJJJ (German).
export function formatDE(d: Date | null): string {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// A tappable field that opens a native date picker. Value/onChange use a Date
// (local time). Display is TT.MM.JJJJ.
//
// iOS: Der Kalender läuft in einem Sheet, NICHT inline im Layout. Inline zwängt
// er sich in die Breite des Feldes — bei zwei Feldern nebeneinander ("Von"/"Bis"
// mit je flex:1) läuft er rechts aus dem Bild, und zwei geöffnete Picker
// überlagern sich gegenseitig. Android bringt seinen eigenen System-Dialog mit,
// der ohnehin über dem Layout schwebt.
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  // Auf iOS wird erst beim Bestätigen übernommen, damit "Abbrechen" verwirft.
  const [draft, setDraft] = useState<Date | null>(null);

  const openPicker = () => {
    setDraft(value ?? new Date());
    setOpen(true);
  };

  return (
    <View>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? formatDE(value) : 'kein Datum gewählt' }}
        accessibilityHint="Öffnet die Datumsauswahl."
        style={{
          backgroundColor: PP.surface,
          borderRadius: PP.rField,
          paddingHorizontal: PP.space.lg,
          paddingVertical: PP.space.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: PP.space.md,
          borderWidth: 1,
          borderColor: alpha(PP.ink, "subtle"),
        }}
      >
        <Icon name="calendar" size={PP.iconSizes.md} color={PP.ink3} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <PPText weight="semibold" size="xs" color={PP.ink3} style={{ letterSpacing: PP.tracking.label }}>
            {label.toUpperCase()}
          </PPText>
          <PPText
            weight="medium"
            size="md"
            color={value ? PP.ink : PP.ink3}
            numberOfLines={1}
            style={{ marginTop: 1 }}
          >
            {value ? formatDE(value) : 'TT.MM.JJJJ'}
          </PPText>
        </View>
      </Pressable>

      {/* Android: System-Dialog, schwebt selbst über dem Layout. */}
      {open && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setOpen(false);
            if (event.type === 'dismissed') return;
            if (selected) onChange(selected);
          }}
        />
      )}

      {/* iOS: eigenes Sheet über die volle Breite. */}
      {Platform.OS === 'ios' && (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Datumsauswahl schließen"
            style={{ flex: 1, backgroundColor: alpha(PP.ink, "strong"), justifyContent: 'flex-end' }}
          >
            {/* Tippen im Sheet darf es nicht schließen. */}
            <Pressable
              onPress={() => {}}
              // Reiner Auffänger, damit ein Tipp im Sheet es nicht schließt —
              // selbst kein Bedienelement, die Kinder bleiben erreichbar.
              importantForAccessibility="no"
              style={{
                backgroundColor: PP.surface,
                borderTopLeftRadius: PP.rCard,
                borderTopRightRadius: PP.rCard,
                paddingHorizontal: PP.space.lg,
                paddingTop: PP.space.sm,
                paddingBottom: PP.space.huge,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: PP.space.sm,
                }}
              >
                <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Abbrechen" hitSlop={8}>
                  <PPText weight="medium" size="md" color={PP.ink2}>
                    Abbrechen
                  </PPText>
                </Pressable>
                <PPText weight="semibold" size="md" color={PP.ink}>
                  {label}
                </PPText>
                <Pressable
                  onPress={() => {
                    if (draft) onChange(draft);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Fertig"
                  hitSlop={8}
                >
                  <PPText weight="semibold" size="md" color={PP.teal}>
                    Fertig
                  </PPText>
                </Pressable>
              </View>

              <DateTimePicker
                value={draft ?? value ?? new Date()}
                mode="date"
                display="inline"
                locale="de-DE"
                themeVariant="light"
                style={{ alignSelf: 'stretch' }}
                onChange={(_event, selected) => {
                  if (selected) setDraft(selected);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
