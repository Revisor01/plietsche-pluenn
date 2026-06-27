import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { PP } from '../../lib/theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

interface PPTextProps extends TextProps {
  weight?: Weight;
  size?: number;
  color?: string;
}

const fontFor: Record<Weight, string> = {
  regular: PP.font.regular,
  medium: PP.font.medium,
  semibold: PP.font.semibold,
  bold: PP.font.bold,
};

export function PPText({ weight = 'regular', size = PP.fontSizes.base, color = PP.ink, style, ...rest }: PPTextProps) {
  // Apply the global font scale to every size — including hard-coded size={n}
  // values passed by screens — so typography grows app-wide from one knob.
  const scaled = Math.round(size * PP.fontScale * 10) / 10;
  return (
    <RNText
      {...rest}
      style={[{ fontFamily: fontFor[weight], fontSize: scaled, color }, style]}
    />
  );
}
