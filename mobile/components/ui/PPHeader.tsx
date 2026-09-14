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
        paddingHorizontal: PP.space.xl,
        paddingTop: PP.space.sm,
        paddingBottom: PP.space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: PP.space.md,
      }}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        {subtitle && (
          <PPText size="sm" color={PP.ink2} style={{ letterSpacing: PP.tracking.label, marginBottom: 2 }}>
            {subtitle}
          </PPText>
        )}
        {/* iOS: großer Titel mit engem Tracking. MD3 headline-small: keins. */}
        <PPText
          weight="semibold"
          size={isAndroid ? 'lg' : 'xl'}
          color={PP.ink}
          style={{ letterSpacing: isAndroid ? PP.tracking.body : PP.tracking.title }}
        >
          {title}
        </PPText>
      </View>
      {trailing}
    </View>
  );
}
