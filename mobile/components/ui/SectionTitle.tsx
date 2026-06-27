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
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: 22,
        marginBottom: 10,
      }}
    >
      <PPText weight="semibold" size={14} color={PP.ink} style={{ letterSpacing: -0.2 }}>
        {title}
      </PPText>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <PPText weight="medium" size={12} color={PP.teal}>
            {action}
          </PPText>
        </Pressable>
      )}
    </View>
  );
}
