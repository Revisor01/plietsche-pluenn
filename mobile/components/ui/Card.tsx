import { View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP } from '../../lib/theme';

interface CardProps {
  children: React.ReactNode;
  pad?: number;
  radius?: number;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, pad = PP.space.lg, radius = PP.rCard, bg = PP.surface, style }: CardProps) {
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: radius, padding: pad },
        PP.shadowCard,
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
  style?: StyleProp<ViewStyle>;
}

export function GradientCard({ children, pad = PP.space.lg, radius = PP.rCard, style }: GradientCardProps) {
  return (
    <LinearGradient
      colors={PP.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          borderRadius: radius,
          padding: pad,
          overflow: 'hidden',
          shadowColor: PP.teal,
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}
