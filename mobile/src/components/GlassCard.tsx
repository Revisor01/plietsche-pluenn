import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { borderRadius, glass } from '../theme';

export interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Border-Radius -- Standard: borderRadius.lg (16) */
  radius?: number;
  /** Blur-Staerke uebersteuern -- Standard: glass.blurAmount (20), max 25 */
  blurAmount?: number;
}

export function GlassCard({ children, style, radius = borderRadius.lg, blurAmount = glass.blurAmount }: GlassCardProps) {
  // T-11-02: blurAmount auf max 25 begrenzen, hohe Werte koennen auf alten Geraeten laggen
  const clampedBlurAmount = Math.min(blurAmount, 25);

  const containerStyle: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
    borderWidth: glass.borderWidth,
    borderColor: glass.borderColor,
    shadowColor: glass.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: glass.shadowOpacity,
    shadowRadius: glass.shadowRadius,
    elevation: 4,
  };

  if (Platform.OS === 'android') {
    // Android-Fallback: kein nativer Blur
    return (
      <View style={[containerStyle, { backgroundColor: glass.androidBackground, borderColor: glass.androidBorderColor }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <BlurView
        blurType={glass.blurType}
        blurAmount={clampedBlurAmount}
        style={StyleSheet.absoluteFill}
        reducedTransparencyFallbackColor="white"
      />
      <LinearGradient
        colors={[...glass.tintColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
