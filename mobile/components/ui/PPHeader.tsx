import { View } from 'react-native';
import { PP, isAndroid } from '../../lib/theme';
import { PPText } from './Text';

interface PPHeaderProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function PPHeader({ title, subtitle, leading, trailing }: PPHeaderProps) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {subtitle && (
          <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ letterSpacing: 0.2, marginBottom: 2 }}>
            {subtitle}
          </PPText>
        )}
        {/* iOS: großer Titel mit engem Tracking. MD3 headline-small: keins. */}
        <PPText
          weight="semibold"
          size={isAndroid ? PP.fontSizes.lg : PP.fontSizes.xl}
          color={PP.ink}
          style={{ letterSpacing: isAndroid ? 0 : -0.4 }}
        >
          {title}
        </PPText>
      </View>
      {trailing}
    </View>
  );
}
