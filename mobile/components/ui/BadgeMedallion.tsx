import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP, alpha } from '../../lib/theme';
import { lighten } from '../../lib/format';
import { Icon, type IconName } from '../../lib/icons';
import type { Tier } from '../../lib/types';

interface BadgeMedallionProps {
  icon: IconName;
  tier?: Tier;
  earned?: boolean;
  size?: number;
  /** Eigene Farbe statt der Stufenfarbe — für Einzel-Abzeichen. */
  color?: string;
}

export const TIER_COLORS: Record<Exclude<Tier, 'none'>, { base: string; light: string }> = PP.tier;

export function BadgeMedallion({ icon, tier = 'bronze', earned = false, size = 56, color }: BadgeMedallionProps) {
  if (!earned || tier === 'none') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: alpha(PP.ink, "ghost"),
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: alpha(PP.ink, "subtle"),
        }}
      >
        <Icon name={icon} size={size * 0.42} color={PP.ink3} />
      </View>
    );
  }

  // Eigene Farbe schlägt die Stufenfarbe. Der helle Ton wird daraus gemischt,
  // damit der Verlauf dieselbe Anmutung behält wie bei den Stufen.
  const c = color ? { base: color, light: lighten(color, 0.25) } : TIER_COLORS[tier];
  return (
    <LinearGradient
      colors={[c.base, c.light]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: c.base,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <Icon name={icon} size={size * 0.46} color={PP.onBrand} />
    </LinearGradient>
  );
}
