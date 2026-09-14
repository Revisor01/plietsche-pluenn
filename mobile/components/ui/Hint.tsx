import { View } from 'react-native';
import { PP, alpha } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText } from './Text';

type Tone = 'info' | 'warn' | 'neutral';

const TONES: Record<Tone, { bg: string; fg: string; icon: string }> = {
  info: { bg: alpha(PP.teal, "subtle"), fg: PP.ink2, icon: PP.teal },
  warn: { bg: alpha(PP.warn, "soft"), fg: PP.ink2, icon: PP.warn },
  neutral: { bg: alpha(PP.ink, "ghost"), fg: PP.ink2, icon: PP.ink3 },
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
        gap: PP.space.md,
        backgroundColor: t.bg,
        borderRadius: PP.rField,
        paddingVertical: PP.space.md,
        paddingHorizontal: PP.space.md,
      }}
    >
      {icon && <Icon name={icon} size={PP.iconSizes.sm} color={t.icon} style={{ marginTop: 1 }} />}
      <PPText size="sm" color={t.fg} style={{ flex: 1, lineHeight: PP.fontSizes.sm * PP.leading.loose }}>
        {children}
      </PPText>
    </View>
  );
}
