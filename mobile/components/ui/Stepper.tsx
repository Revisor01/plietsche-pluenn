import { View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PP, alpha } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { PPText } from './Text';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  // Wofür gezählt wird — steht sichtbar über dem Stepper, für den
  // Screenreader muss es mit an das Bedienelement.
  accessibilityLabel?: string;
}

export function Stepper({ value, onChange, min = 0, max = 99, accessibilityLabel }: StepperProps) {
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

  const Btn = ({
    onPress,
    disabled,
    icon,
    label,
  }: {
    onPress: () => void;
    disabled: boolean;
    icon: 'plus' | 'minus';
    label: string;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{
        width: 44,
        height: 44,
        borderRadius: PP.rCard,
        backgroundColor: disabled ? alpha(PP.ink, "ghost") : alpha(PP.teal, "subtle"),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={PP.iconSizes.lg} color={disabled ? PP.ink3 : PP.teal} />
    </Pressable>
  );

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.lg, alignSelf: 'center' }}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      // VoiceOver/TalkBack wischen hoch und runter statt die Knöpfe zu suchen.
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') inc();
        if (e.nativeEvent.actionName === 'decrement') dec();
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    >
      <Btn onPress={dec} disabled={value <= min} icon="minus" label="Weniger" />
      <View style={{ minWidth: 60, alignItems: 'center' }}>
        <PPText weight="bold" size="hero" color={PP.ink}>
          {value}
        </PPText>
      </View>
      <Btn onPress={inc} disabled={value >= max} icon="plus" label="Mehr" />
    </View>
  );
}
