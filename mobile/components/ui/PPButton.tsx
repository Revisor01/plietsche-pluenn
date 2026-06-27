import { Pressable, View, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'l' | 'm' | 's';

interface PPButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PPButton({
  children,
  variant = 'primary',
  size = 'l',
  icon,
  iconRight,
  fullWidth = true,
  disabled,
  loading,
  onPress,
  style,
}: PPButtonProps) {
  const h = size === 'l' ? 52 : size === 'm' ? 44 : 36;
  const fs = size === 'l' ? 16 : size === 'm' ? 14.5 : 13;
  const radius = size === 'l' ? PP.rBtn : 14;

  const textColor = variant === 'primary' ? '#fff' : variant === 'ghost' ? PP.teal : PP.ink;
  const opacity = disabled ? 0.5 : 1;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: h,
        paddingHorizontal: 22,
      }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Icon name={icon} size={fs + 4} color={textColor} />}
          <PPText weight="semibold" size={fs} color={textColor}>
            {children}
          </PPText>
          {iconRight && <Icon name={iconRight} size={fs + 4} color={textColor} />}
        </>
      )}
    </View>
  );

  const baseStyle: StyleProp<ViewStyle> = [
    {
      width: fullWidth ? '100%' : undefined,
      borderRadius: radius,
      overflow: 'hidden',
      opacity,
    },
    style,
  ];

  if (variant === 'primary') {
    return (
      <Pressable onPress={disabled || loading ? undefined : onPress} style={baseStyle}>
        <LinearGradient
          colors={PP.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: radius,
            shadowColor: PP.teal,
            shadowOpacity: 0.32,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        style={[
          baseStyle,
          {
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: 'rgba(26,46,44,0.08)',
            borderRadius: radius,
          },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={[baseStyle, { backgroundColor: 'transparent', borderRadius: radius }]}
    >
      {content}
    </Pressable>
  );
}
