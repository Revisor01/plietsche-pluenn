import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { PP, isAndroid, MD3_SHAPE, surfaceElevation } from '../../lib/theme';

interface GlassCardProps {
  children: React.ReactNode;
  pad?: number;
  radius?: number;
  intensity?: number;
  tint?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
}

// Wird einmal beim Laden ausgewertet — das Ergebnis ändert sich zur Laufzeit nicht.
const LIQUID_GLASS = isLiquidGlassAvailable();

/**
 * Glasfläche je Plattform:
 *  - iOS 26+   → echtes UIGlassEffect über expo-glass-effect
 *  - iOS < 26  → BlurView als Fallback (das bisherige Verhalten)
 *  - Android   → MD3 surface mit Elevation; Material kennt kein Glas
 */
export function GlassCard({
  children,
  pad = PP.space.lg,
  radius,
  intensity = 60,
  tint = 'light',
  style,
}: GlassCardProps) {
  const r = radius ?? (isAndroid ? MD3_SHAPE.lg : 24);

  if (isAndroid) {
    return (
      <View
        style={[
          {
            borderRadius: r,
            padding: pad,
            backgroundColor: tint === 'light' ? PP.surface : PP.ink,
          },
          surfaceElevation(1),
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (LIQUID_GLASS) {
    // Kein `overflow: hidden` — die Clipping-Ebene würde verhindern, dass das
    // Material den Inhalt dahinter sampelt (siehe TabBar).
    return (
      <GlassView glassEffectStyle="regular" colorScheme={tint} style={[{ borderRadius: r, padding: pad }, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint === 'light' ? 'light' : 'dark'}
      style={[
        {
          borderRadius: r,
          padding: pad,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.5)',
          backgroundColor: 'transparent',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}
