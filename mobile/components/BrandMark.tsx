import { LinearGradient } from 'expo-linear-gradient';
import { PP, glow } from '../lib/theme';
import { Icon } from '../lib/icons';

export function BrandMark({ size = 64, radius = 20, iconSize }: { size?: number; radius?: number; iconSize?: number }) {
  return (
    <LinearGradient
      colors={PP.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        ...glow(PP.teal),
      }}
    >
      <Icon name="shirt" size={iconSize ?? size * 0.5} color={PP.onBrand} />
    </LinearGradient>
  );
}
