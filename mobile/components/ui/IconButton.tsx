import { Pressable, View } from 'react-native';
import { PP } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';

interface IconButtonProps {
  icon: IconName;
  badge?: boolean;
  dark?: boolean;
  onPress?: () => void;
}

export function IconButton({ icon, badge, dark = false, onPress }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: dark ? 'rgba(255,255,255,0.18)' : '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        ...(dark ? {} : PP.shadowCard),
      }}
    >
      <Icon name={icon} size={20} color={dark ? '#fff' : PP.ink} />
      {badge && (
        <View
          style={{
            position: 'absolute',
            top: 9,
            right: 11,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: PP.warn,
            borderWidth: 1.5,
            borderColor: '#fff',
          }}
        />
      )}
    </Pressable>
  );
}
