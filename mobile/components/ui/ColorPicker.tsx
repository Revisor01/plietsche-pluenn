import { View, Pressable } from 'react-native';
import { PP } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { PPText } from './Text';

// Kuratierte Palette für Aushänge. Bewusst kein freies Hex-Feld: Auf dem Handy
// umständlich, und weißer Text muss auf jeder Farbe lesbar bleiben. Alle Werte
// sind dunkel genug dafür. Die Liste selbst steht im Theme (PP.accents) —
// sie ist eine Gestaltungsentscheidung, keine Zuständigkeit dieses Bausteins.
export const AUSHANG_COLORS: { name: string; hex: string }[] = [...PP.accents];

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
      <PPText weight="semibold" size="xs" color={PP.ink3} style={{ marginBottom: PP.space.sm, letterSpacing: PP.tracking.label }}>
        {label}
      </PPText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: PP.space.sm }}>
        {/* Standard = keine eigene Farbe (Marken-Verlauf bzw. Sky). */}
        <Pressable
          onPress={() => onChange('')}
          style={{
            width: 46,
            height: 46,
            borderRadius: PP.rTile2,
            alignItems: 'center',
            justifyContent: 'center',
            // Standard = Markenfarbe. Vorher ein Zauberstab-Symbol, das wie
            // "Farbe automatisch wählen" aussah und niemand deuten konnte.
            backgroundColor: PP.teal,
            borderWidth: !current ? 2 : 0,
            borderColor: PP.ink,
          }}
        >
          {!current && <Icon name="check" size={PP.iconSizes.md} color={PP.onBrand} />}
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
                borderRadius: PP.rTile2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.hex,
                borderWidth: active ? 2 : 0,
                borderColor: PP.ink,
              }}
            >
              {active && <Icon name="check" size={PP.iconSizes.md} color={PP.onBrand} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
