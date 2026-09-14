import { useState } from 'react';
import { View, TextInput, Pressable, TextInputProps, StyleSheet } from 'react-native';
import { PP, alpha } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText } from './Text';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  icon?: IconName;
  label: string;
  secure?: boolean;
  // Fehlermeldung zum Feld. Sie wird an die Ansage des Eingabefelds gehängt,
  // damit sie nicht nur sichtbar, sondern auch hörbar beim Feld landet.
  error?: string;
}

export function Field({ icon, label, secure, error, ...inputProps }: FieldProps) {
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={styles.wrap}>
      {icon && <Icon name={icon} size={PP.iconSizes.md} color={PP.ink3} />}
      <View style={{ flex: 1 }}>
        {/* Sichtbares Label; für den Screenreader trägt es das Eingabefeld
            selbst, sonst würde es zweimal vorgelesen. */}
        <PPText
          weight="semibold"
          size="xs"
          color={PP.ink3}
          style={styles.label}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {label.toUpperCase()}
        </PPText>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error}
          {...inputProps}
          secureTextEntry={hidden}
          placeholderTextColor={PP.ink3}
          style={styles.input}
        />
        {!!error && (
          <PPText size="xs" color={PP.err} style={{ marginTop: 2 }}>
            {error}
          </PPText>
        )}
      </View>
      {secure && (
        <Pressable
          onPress={() => setHidden((h) => !h)}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Passwort anzeigen' : 'Passwort verbergen'}
          hitSlop={10}
        >
          <Icon name={hidden ? 'eye-off' : 'eye'} size={PP.iconSizes.md} color={PP.ink3} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: PP.surface,
    borderRadius: PP.rField,
    paddingHorizontal: PP.space.lg,
    paddingVertical: PP.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PP.space.md,
    borderWidth: 1,
    borderColor: alpha(PP.ink, "subtle"),
    // Füllt die Höhe der Zeile, wenn der Container streckt (Ränge-Liste im
    // Admin: zwei Felder nebeneinander sollen gleich hoch sein).
    flexGrow: 1,
  },
  label: {
    letterSpacing: PP.tracking.label,
  },
  input: {
    fontFamily: PP.font.medium,
    fontSize: 14.5,
    color: PP.ink,
    paddingVertical: 2,
    marginTop: 1,
  },
});
