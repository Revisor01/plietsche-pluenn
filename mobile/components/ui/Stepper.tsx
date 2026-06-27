import { View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PP } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { PPText } from './Text';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

export function Stepper({ value, onChange, min = 0, max = 99 }: StepperProps) {
  const dec = () => {
    if (value <= min) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(value - 1);
  };
  const inc = () => {
    if (value >= max) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(value + 1);
  };

  const Btn = ({ onPress, disabled, icon }: { onPress: () => void; disabled: boolean; icon: 'plus' | 'minus' }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: disabled ? 'rgba(26,46,44,0.04)' : 'rgba(39,176,146,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={20} color={disabled ? PP.ink3 : PP.teal} />
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, alignSelf: 'center' }}>
      <Btn onPress={dec} disabled={value <= min} icon="minus" />
      <View style={{ minWidth: 60, alignItems: 'center' }}>
        <PPText weight="bold" size={32} color={PP.ink}>
          {value}
        </PPText>
      </View>
      <Btn onPress={inc} disabled={value >= max} icon="plus" />
    </View>
  );
}
