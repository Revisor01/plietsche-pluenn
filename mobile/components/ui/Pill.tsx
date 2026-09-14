import { View, StyleProp, ViewStyle } from 'react-native';
import { PP, alpha, radius } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText } from './Text';

interface PillProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  icon?: IconName;
  size?: 's' | 'm';
  style?: StyleProp<ViewStyle>;
  // Auswahl-Chip: der ausgewählte Zustand wird sonst allein über die Farbe
  // getragen und ist für den Screenreader nicht erkennbar. Wird nur gesetzt,
  // wenn die Pille tatsächlich eine Auswahl darstellt.
  selected?: boolean;
  accessibilityLabel?: string;
}

export function Pill({
  children,
  color = PP.teal,
  bg = alpha(PP.teal, "subtle"),
  icon,
  size = 'm',
  style,
  selected,
  accessibilityLabel,
}: PillProps) {
  const fs = size === 's' ? 'xs' : 'sm';
  const iconSize = size === 's' ? PP.iconSizes.xs : PP.iconSizes.sm;
  // Polsterung und Mindesthöhe wachsen mit der Schrift mit (PP.fontScale),
  // sonst wird der Chip bei größerer Typo zu eng und die Schrift beschnitten.
  const scale = PP.fontScale;
  const padH = Math.round((size === 's' ? 8 : 12) * scale);
  const padV = Math.round((size === 's' ? 4 : 6) * scale);
  const minHeight = Math.round((size === 's' ? 22 : 28) * scale);

  return (
    <View
      // Als Ganzes ansagen statt Icon und Text getrennt.
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: PP.space.sm,
          paddingHorizontal: padH,
          paddingVertical: padV,
          minHeight,
          // MD3 Chips sind eckig (8dp), iOS-Pills vollrund.
          borderRadius: radius(PP.rPill, 'sm'),
          backgroundColor: bg,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={iconSize} color={color} />}
      <PPText weight="medium" size={fs} color={color}>
        {children}
      </PPText>
    </View>
  );
}
