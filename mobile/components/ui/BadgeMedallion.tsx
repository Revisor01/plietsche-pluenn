import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import type { Tier } from '../../lib/types';

interface BadgeMedallionProps {
  icon: IconName;
  tier?: Tier;
  earned?: boolean;
  size?: number;
}

export const TIER_COLORS: Record<Exclude<Tier, 'none'>, { base: string; light: string }> = {
  bronze: { base: PP.bronze, light: '#E89E58' },
  silber: { base: PP.silver, light: '#E0E0E0' },
  gold: { base: PP.gold, light: '#FFD658' },
  platin: { base: PP.platin, light: '#B9DCE8' },
  diamant: { base: PP.diamant, light: '#B6ECF6' },
};

export function BadgeMedallion({ icon, tier = 'bronze', earned = false, size = 56 }: BadgeMedallionProps) {
  if (!earned || tier === 'none') {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(26,46,44,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(26,46,44,0.06)',
        }}
      >
        <Icon name={icon} size={size * 0.42} color={PP.ink3} />
      </View>
    );
  }

  const c = TIER_COLORS[tier];
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
      <Icon name={icon} size={size * 0.46} color="#fff" />
    </LinearGradient>
  );
}
