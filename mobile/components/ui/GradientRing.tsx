import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { PP, alpha } from '../../lib/theme';

interface GradientRingProps {
  size?: number;
  stroke?: number;
  progress?: number; // 0..1
  trackColor?: string;
  /** Verlauf des Fortschritts-Bogens. Ohne Angabe der Marken-Verlauf. */
  colors?: readonly [string, string, string];
  /** Unterscheidet mehrere Ringe gleicher Größe im selben SVG-Namensraum. */
  gradientKey?: string;
  children?: React.ReactNode;
}

export function GradientRing({
  size = 132,
  stroke = 12,
  progress = 0,
  trackColor = alpha(PP.ink, "subtle"),
  colors,
  gradientKey,
  children,
}: GradientRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const off = c * (1 - clamped);
  // Ohne eigenen Schlüssel kollidieren zwei Ringe gleicher Größe mit
  // verschiedenen Farben — SVG-Verlaufs-IDs sind dokumentweit eindeutig.
  const gid = `ppg-${size}-${stroke}-${gradientKey ?? 'brand'}`;
  const [c0, c1, c2] = colors ?? [PP.teal, PP.mint, PP.sky];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGrad id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c0} />
            <Stop offset="0.5" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </SvgGrad>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={off}
        />
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
