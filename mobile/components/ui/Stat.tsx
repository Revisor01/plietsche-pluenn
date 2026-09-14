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
      <PPText weight="bold" size="xl2" color={color} style={{ letterSpacing: PP.tracking.title, lineHeight: PP.fontSizes.xl2 * PP.leading.tight }}>
        {value}
      </PPText>
      <PPText size="xs" color={PP.ink2} style={{ marginTop: 3, letterSpacing: PP.tracking.label }}>
        {label}
      </PPText>
      {delta != null && (
        <PPText weight="semibold" size="xs" color={delta >= 0 ? PP.teal : PP.err} style={{ marginTop: 2 }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </PPText>
      )}
    </View>
  );
}
