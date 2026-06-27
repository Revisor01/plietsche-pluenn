import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { PP } from '../../lib/theme';

interface GradientRingProps {
  size?: number;
  stroke?: number;
  progress?: number; // 0..1
  trackColor?: string;
  children?: React.ReactNode;
}

export function GradientRing({
  size = 132,
  stroke = 12,
  progress = 0,
  trackColor = 'rgba(26,46,44,0.06)',
  children,
}: GradientRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const off = c * (1 - clamped);
  const gid = `ppg-${size}-${stroke}`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGrad id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={PP.teal} />
            <Stop offset="0.5" stopColor={PP.mint} />
            <Stop offset="1" stopColor={PP.sky} />
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
