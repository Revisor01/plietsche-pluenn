import { View, Pressable } from 'react-native';
import { PP } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { PPText } from './Text';

// Kuratierte Palette für Aushänge. Bewusst kein freies Hex-Feld: Auf dem Handy
// umständlich, und weißer Text muss auf jeder Farbe lesbar bleiben. Alle Werte
// sind dunkel genug dafür.
export const AUSHANG_COLORS: { name: string; hex: string }[] = [
  { name: 'Teal', hex: '#27b092' },
  { name: 'Sky', hex: '#80b4e2' },
  { name: 'Beere', hex: '#b0478a' },
  { name: 'Koralle', hex: '#e2664f' },
  { name: 'Bernstein', hex: '#d99320' },
  { name: 'Wald', hex: '#4a8c56' },
  { name: 'Pflaume', hex: '#7a5aa8' },
  { name: 'Nordsee', hex: '#2d6e8e' },
];

interface ColorPickerProps {
  /** Aktueller Wert als #RRGGBB, leer = Standard. */
  value?: string;
  onChange: (hex: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label = 'FARBE' }: ColorPickerProps) {
  const current = `${value ?? ''}`.trim().toLowerCase();

  return (
    <View>
      <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 8, letterSpacing: 0.3 }}>
        {label}
      </PPText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {/* Standard = keine eigene Farbe (Marken-Verlauf bzw. Sky). */}
        <Pressable
          onPress={() => onChange('')}
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(26,46,44,0.05)',
            borderWidth: !current ? 2 : 1,
            borderColor: !current ? PP.ink : PP.hairline,
          }}
        >
          <Icon name="sparkles" size={18} color={PP.ink2} />
        </Pressable>

        {AUSHANG_COLORS.map((c) => {
          const active = current === c.hex.toLowerCase();
          return (
            <Pressable
              key={c.hex}
              onPress={() => onChange(c.hex)}
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.hex,
                borderWidth: active ? 2 : 0,
                borderColor: PP.ink,
              }}
            >
              {active && <Icon name="check" size={18} color="#fff" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
