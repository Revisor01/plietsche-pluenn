import { Text as RNText, TextProps, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { PP } from '../../lib/theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';
type SizeStep = keyof typeof PP.fontSizes;

interface PPTextProps extends TextProps {
  weight?: Weight;
  /** Stufe aus `PP.fontSizes`. Bewusst keine Zahl — Größen gehören ins Theme. */
  size?: SizeStep;
  /** Nur für Größen, die aus einem übergebenen Maß berechnet werden. */
  rawSize?: number;
  /** Fertiger Farbwert, kein Token-Name; die Prüfung unten fängt den Vertipper zur Laufzeit. */
  color?: string;
}

// `color="PP.ink3"` als String zeichnet unlesbar in der Standardfarbe, und tsc sieht es nicht.
function warnIfTokenName(color: string) {
  if (!__DEV__) return;
  if (/^(PP|alpha)\./.test(color)) {
    console.error(
      `PPText: color="${color}" ist ein Token-Name als Text, kein Farbwert. ` +
        `Gemeint war vermutlich color={${color}}.`
    );
  }
}

const fontFor: Record<Weight, string> = {
  regular: PP.font.regular,
  medium: PP.font.medium,
  semibold: PP.font.semibold,
  bold: PP.font.bold,
};

const scale = (n: number) => Math.round(n * PP.fontScale * 10) / 10;

export function PPText({
  weight = 'regular',
  size,
  rawSize,
  color = PP.ink,
  style,
  ...rest
}: PPTextProps) {
  warnIfTokenName(color);

  // Der globale Schriftfaktor wirkt auf jede Größe — auch auf die berechneten.
  const base = rawSize ?? PP.fontSizes[size ?? 'base'];
  const scaled = scale(base);

  // lineHeight und letterSpacing mitskalieren, sonst werden Ober- und Unterlängen abgeschnitten.
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const metrics: TextStyle = {};
  if (typeof flat?.lineHeight === 'number') metrics.lineHeight = scale(flat.lineHeight);
  if (typeof flat?.letterSpacing === 'number') metrics.letterSpacing = scale(flat.letterSpacing);
  const scaledMetrics: StyleProp<TextStyle> = Object.keys(metrics).length ? metrics : null;

  return (
    <RNText
      {...rest}
      style={[{ fontFamily: fontFor[weight], fontSize: scaled, color }, style, scaledMetrics]}
    />
  );
}
