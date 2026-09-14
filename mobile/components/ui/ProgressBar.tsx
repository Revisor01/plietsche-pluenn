import { View, StyleSheet, type DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP, alpha } from '../../lib/theme';
import type { Tier } from '../../lib/types';

interface ProgressBarProps {
  value?: number; // 0..1
  height?: number;
  tier?: Tier;
}

const TIER_COLOR: Record<string, string> = {
  bronze: PP.bronze,
  silber: PP.silver,
  gold: PP.gold,
  platin: PP.platin,
};

export function ProgressBar({ value = 0, height = 6, tier }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const widthPct = `${clamped * 100}%` as DimensionValue;
  const tierColor = tier && tier !== 'none' ? TIER_COLOR[tier] : null;

  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      {tierColor ? (
        <View style={{ width: widthPct, height: '100%', backgroundColor: tierColor, borderRadius: height }} />
      ) : (
        <LinearGradient
          colors={PP.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: widthPct, height: '100%', borderRadius: height }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: alpha(PP.ink, "subtle"),
    overflow: 'hidden',
  },
});
