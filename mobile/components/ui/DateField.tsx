import { useState } from 'react';
import { View, Pressable, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PP } from '../../lib/theme';
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
        style={{
          backgroundColor: '#fff',
          borderRadius: PP.rField,
          paddingHorizontal: 14,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: 'rgba(26,46,44,0.06)',
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
            style={{ flex: 1, backgroundColor: 'rgba(26,46,44,0.35)', justifyContent: 'flex-end' }}
          >
            {/* Tippen im Sheet darf es nicht schließen. */}
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: PP.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 28,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                }}
              >
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
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
