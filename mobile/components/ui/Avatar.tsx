import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP } from '../../lib/theme';
import { PPText } from './Text';

interface AvatarProps {
  initials?: string;
  size?: number;
  gradient?: boolean;
}

export function Avatar({ initials = '?', size = 38, gradient = false }: AvatarProps) {
  if (gradient) {
    return (
      <LinearGradient
        colors={PP.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Hält ein Verhältnis zum Durchmesser, keine Größe — daher rawSize. */}
        <PPText weight="semibold" rawSize={size * 0.36} color={PP.onBrand}>
          {initials}
        </PPText>
      </LinearGradient>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PP.sand,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <PPText weight="semibold" rawSize={size * 0.36} color={PP.ink}>
        {initials}
      </PPText>
    </View>
  );
}
