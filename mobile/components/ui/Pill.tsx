import { View, StyleProp, ViewStyle } from 'react-native';
import { PP, isAndroid, MD3_SHAPE } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText } from './Text';

interface PillProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  icon?: IconName;
  size?: 's' | 'm';
  style?: StyleProp<ViewStyle>;
}

export function Pill({ children, color = PP.teal, bg = 'rgba(39,176,146,0.10)', icon, size = 'm', style }: PillProps) {
  const fs = size === 's' ? 11 : 12.5;
  // Polsterung und Mindesthöhe wachsen mit der Schrift mit (PP.fontScale),
  // sonst wird der Chip bei größerer Typo zu eng und die Schrift beschnitten.
  const scale = PP.fontScale;
  const padH = Math.round((size === 's' ? 8 : 12) * scale);
  const padV = Math.round((size === 's' ? 4 : 6) * scale);
  const minHeight = Math.round((size === 's' ? 22 : 28) * scale);

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: padH,
          paddingVertical: padV,
          minHeight,
          // MD3 Chips sind eckig (8dp), iOS-Pills vollrund.
          borderRadius: isAndroid ? MD3_SHAPE.sm : PP.rPill,
          backgroundColor: bg,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={fs + 2} color={color} />}
      <PPText weight="medium" size={fs} color={color}>
        {children}
      </PPText>
    </View>
  );
}
