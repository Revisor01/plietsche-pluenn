import { Pressable, View, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP, isAndroid, MD3_SHAPE, ripple, pressedOpacity, surfaceElevation } from '../../lib/theme';
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
  // MD3 Buttons sind vollrund; iOS behält die weichere, eckigere Formsprache.
  const radius = isAndroid ? MD3_SHAPE.full : size === 'l' ? PP.rBtn : 14;
  // MD3 label-large hat spürbares Letter-Spacing, iOS-Labels nicht.
  const letterSpacing = isAndroid ? 0.1 : 0;

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
          <PPText weight="semibold" size={fs} color={textColor} style={{ letterSpacing }}>
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

  // Feedback: Android per Ripple (View bleibt unverändert), iOS per Dimmen.
  const feedback = (extra?: StyleProp<ViewStyle>) =>
    ({ pressed }: { pressed: boolean }) =>
      [baseStyle, extra, { opacity: disabled ? 0.5 : pressedOpacity(pressed) }] as StyleProp<ViewStyle>;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        android_ripple={disabled || loading ? undefined : ripple('#ffffff')}
        style={feedback()}
      >
        <LinearGradient
          colors={PP.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              borderRadius: radius,
              shadowColor: PP.teal,
              shadowOpacity: 0.32,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 6 },
            },
            // MD3 Filled Button: Elevation level 1 statt farbigem Glow.
            isAndroid ? surfaceElevation(1) : { elevation: 4 },
          ]}
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
        android_ripple={disabled || loading ? undefined : ripple(PP.teal)}
        style={feedback({
          backgroundColor: isAndroid ? 'transparent' : '#fff',
          borderWidth: 1,
          // MD3 Outlined Button: sichtbarer Rand, keine Fläche.
          borderColor: isAndroid ? PP.hairline : 'rgba(26,46,44,0.08)',
          borderRadius: radius,
        })}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      android_ripple={disabled || loading ? undefined : ripple(PP.teal)}
      style={feedback({ backgroundColor: 'transparent', borderRadius: radius })}
    >
      {content}
    </Pressable>
  );
}
