import { Text as RNText, TextProps, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { PP } from '../../lib/theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';
type SizeStep = keyof typeof PP.fontSizes;

interface PPTextProps extends TextProps {
  weight?: Weight;
  /** Stufe aus `PP.fontSizes`. Bewusst keine Zahl — Größen gehören ins Theme. */
  size?: SizeStep;
  /**
   * Nur für Größen, die aus einem übergebenen Maß berechnet werden (Initialen
   * im Avatar, Zeichen im Markenzeichen, Medaille). Hier wird absichtlich an
   * der Skala vorbeigearbeitet, weil ein Verhältnis gehalten wird, keine Größe.
   */
  rawSize?: number;
  color?: string;
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
  // Der globale Schriftfaktor wirkt auf jede Größe — auch auf die berechneten.
  const base = rawSize ?? PP.fontSizes[size ?? 'base'];
  const scaled = scale(base);

  // `lineHeight` und `letterSpacing` aus dem Style sind auf die UNSKALIERTE
  // Größe gemünzt (z.B. size="xl2" + lineHeight: 26). Ohne Mitskalieren bliebe
  // die Zeile kleiner als die Glyphen und Ober-/Unterlängen würden
  // abgeschnitten; eine nicht mitskalierte Laufweite ließe große
  // Überschriften enger stehen, als sie entworfen sind.
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
