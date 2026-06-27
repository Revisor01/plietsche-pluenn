import { View, ViewStyle, StyleProp, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { PP } from '../../lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  pad?: number;
  radius?: number;
  intensity?: number;
  tint?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({
  children,
  pad = PP.space.lg,
  radius = 24,
  intensity = 60,
  tint = 'light',
  style,
}: GlassCardProps) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint === 'light' ? 'light' : 'dark'}
      style={[
        {
          borderRadius: radius,
          padding: pad,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.5)',
          // BlurView on Android needs a fallback tint to look right.
          backgroundColor:
            Platform.OS === 'android'
              ? tint === 'light'
                ? 'rgba(255,255,255,0.82)'
                : 'rgba(26,46,44,0.7)'
              : 'transparent',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}
