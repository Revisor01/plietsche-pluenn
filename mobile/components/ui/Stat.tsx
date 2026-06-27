import { View } from 'react-native';
import { PP } from '../../lib/theme';
import { PPText } from './Text';

interface StatProps {
  value: string | number;
  label: string;
  delta?: number;
  tone?: 'ink' | 'teal';
}

export function Stat({ value, label, delta, tone = 'ink' }: StatProps) {
  const color = tone === 'teal' ? PP.teal : PP.ink;
  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      <PPText weight="bold" size={24} color={color} style={{ letterSpacing: -0.5, lineHeight: 26 }}>
        {value}
      </PPText>
      <PPText size={11} color={PP.ink2} style={{ marginTop: 3, letterSpacing: 0.1 }}>
        {label}
      </PPText>
      {delta != null && (
        <PPText weight="semibold" size={10.5} color={delta >= 0 ? PP.teal : PP.err} style={{ marginTop: 2 }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </PPText>
      )}
    </View>
  );
}
