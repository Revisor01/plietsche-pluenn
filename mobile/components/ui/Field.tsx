import { useState } from 'react';
import { View, TextInput, Pressable, TextInputProps, StyleSheet } from 'react-native';
import { PP } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText } from './Text';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  icon?: IconName;
  label: string;
  secure?: boolean;
}

export function Field({ icon, label, secure, ...inputProps }: FieldProps) {
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={styles.wrap}>
      {icon && <Icon name={icon} size={18} color={PP.ink3} />}
      <View style={{ flex: 1 }}>
        <PPText weight="semibold" size={10.5} color={PP.ink3} style={styles.label}>
          {label.toUpperCase()}
        </PPText>
        <TextInput
          {...inputProps}
          secureTextEntry={hidden}
          placeholderTextColor={PP.ink3}
          style={styles.input}
        />
      </View>
      {secure && (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
          <Icon name={hidden ? 'eye-off' : 'eye'} size={18} color={PP.ink3} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: PP.rField,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(26,46,44,0.06)',
  },
  label: {
    letterSpacing: 0.3,
  },
  input: {
    fontFamily: PP.font.medium,
    fontSize: 14.5,
    color: PP.ink,
    paddingVertical: 2,
    marginTop: 1,
  },
});
