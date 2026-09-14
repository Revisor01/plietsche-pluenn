import { View, Pressable } from 'react-native';
import { PP } from '../../lib/theme';
import { PPText } from './Text';

interface SectionTitleProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionTitle({ title, action, onAction }: SectionTitleProps) {
  return (
    <View
      style={{
        paddingHorizontal: PP.space.xl,
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: PP.space.xxl,
        marginBottom: PP.space.md,
      }}
    >
      <PPText weight="semibold" size="base" color={PP.ink} style={{ letterSpacing: PP.tracking.title }}>
        {title}
      </PPText>
      {action && (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={`${action}: ${title}`} hitSlop={8}>
          <PPText weight="medium" size="sm" color={PP.teal}>
            {action}
          </PPText>
        </Pressable>
      )}
    </View>
  );
}
