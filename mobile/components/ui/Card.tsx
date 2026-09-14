import { View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP, surfaceElevation, radius as cardRadius } from '../../lib/theme';

interface CardProps {
  children: React.ReactNode;
  pad?: number;
  radius?: number;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, pad = PP.space.lg, radius, bg = PP.surface, style }: CardProps) {
  // MD3 nutzt kleinere Radien als die iOS-Formsprache dieser App.
  const r = cardRadius(PP.rCard, 'md');
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: r, padding: pad },
        surfaceElevation(1),
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface GradientCardProps {
  children: React.ReactNode;
  pad?: number;
  radius?: number;
  /** Eigener Verlauf (z.B. aus einer Admin-Farbe). Ohne Angabe: Marken-Verlauf. */
  colors?: readonly [string, string, string];
  style?: StyleProp<ViewStyle>;
}

export function GradientCard({ children, pad = PP.space.lg, radius, colors, style }: GradientCardProps) {
  const r = cardRadius(PP.rCard, 'md');
  return (
    <LinearGradient
      colors={colors ?? PP.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          borderRadius: r,
          padding: pad,
          overflow: 'hidden',
          // Schatten folgt der Kartenfarbe, sonst schimmert bei einer eigenen
          // Akzentfarbe das Teal der Marke darunter durch.
          shadowColor: colors?.[0] ?? PP.teal,
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
        },
        surfaceElevation(1),
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}
