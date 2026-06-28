import { useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
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

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
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
        <Icon name="calendar" size={18} color={PP.ink3} />
        <View style={{ flex: 1 }}>
          <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ letterSpacing: 0.3 }}>
            {label.toUpperCase()}
          </PPText>
          <PPText weight="medium" size={PP.fontSizes.md} color={value ? PP.ink : PP.ink3} style={{ marginTop: 1 }}>
            {value ? formatDE(value) : 'TT.MM.JJJJ'}
          </PPText>
        </View>
      </Pressable>

      {open && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            // Android fires once and closes; iOS inline stays open.
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'dismissed') { setOpen(false); return; }
            if (selected) onChange(selected);
          }}
        />
      )}

      {open && Platform.OS === 'ios' && (
        <Pressable onPress={() => setOpen(false)} style={{ alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 8 }}>
          <PPText weight="semibold" size={PP.fontSizes.base} color={PP.teal}>Fertig</PPText>
        </Pressable>
      )}
    </View>
  );
}
