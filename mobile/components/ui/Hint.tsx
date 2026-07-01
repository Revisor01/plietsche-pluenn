import { View } from 'react-native';
import { PP } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText } from './Text';

type Tone = 'info' | 'warn' | 'neutral';

const TONES: Record<Tone, { bg: string; fg: string; icon: string }> = {
  info: { bg: 'rgba(39,176,146,0.08)', fg: PP.ink2, icon: PP.teal },
  warn: { bg: 'rgba(232,169,59,0.12)', fg: PP.ink2, icon: PP.warn },
  neutral: { bg: 'rgba(26,46,44,0.05)', fg: PP.ink2, icon: PP.ink3 },
};

// A flat, shadowless hint block — a soft tinted background with optional icon.
// Deliberately has NO card shadow: a tinted surface plus a drop shadow reads as
// an ugly fat border, so hints stay flat and quiet.
export function Hint({
  children,
  icon,
  tone = 'info',
}: {
  children: React.ReactNode;
  icon?: IconName;
  tone?: Tone;
}) {
  const t = TONES[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: t.bg,
        borderRadius: PP.rField,
        paddingVertical: 11,
        paddingHorizontal: 13,
      }}
    >
      {icon && <Icon name={icon} size={15} color={t.icon} style={{ marginTop: 1 }} />}
      <PPText size={PP.fontSizes.sm} color={t.fg} style={{ flex: 1, lineHeight: 18 }}>
        {children}
      </PPText>
    </View>
  );
}
