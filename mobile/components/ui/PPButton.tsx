import { Pressable, View, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PP, ripple, pressedOpacity, surfaceElevation, alpha, glow, isAndroid, radius } from '../../lib/theme';
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
  // Standardmäßig liest der Screenreader den Knopftitel vor. Nur setzen, wenn
  // der Titel als Ansage nicht reicht (z.B. „Weiter" ohne Ziel).
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

// Der sichtbare Titel ist die Ansage. Im Ladezustand ersetzt ein Spinner den
// Text — ohne diese Ableitung wäre der Knopf dann stumm.
function labelFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(labelFromChildren).filter(Boolean).join(' ');
  return '';
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
  accessibilityLabel,
  accessibilityHint,
}: PPButtonProps) {
  const h = size === 'l' ? 52 : size === 'm' ? 44 : 36;
  const fs = size === 'l' ? 'md' : 'base';
  const iconSize = size === 'l' ? PP.iconSizes.lg : PP.iconSizes.md;
  // MD3 Buttons sind vollrund; iOS behält die weichere, eckigere Formsprache.
  const r = radius(size === 'l' ? PP.rBtn : PP.rField, 'full');
  // MD3 label-large hat spürbares Letter-Spacing, iOS-Labels nicht.
  const letterSpacing = isAndroid ? 0.1 : 0;

  const textColor = variant === 'primary' ? PP.onBrand : variant === 'ghost' ? PP.teal : PP.ink;
  const opacity = disabled ? 0.5 : 1;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: PP.space.md,
        height: h,
        paddingHorizontal: PP.space.xxl,
      }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Icon name={icon} size={iconSize} color={textColor} />}
          <PPText weight="semibold" size={fs} color={textColor} style={{ letterSpacing }}>
            {children}
          </PPText>
          {iconRight && <Icon name={iconRight} size={iconSize} color={textColor} />}
        </>
      )}
    </View>
  );

  const baseStyle: StyleProp<ViewStyle> = [
    {
      width: fullWidth ? '100%' : undefined,
      borderRadius: r,
      overflow: 'hidden',
      opacity,
    },
    style,
  ];

  const a11y = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityLabel || labelFromChildren(children) || undefined,
    accessibilityHint,
    accessibilityState: { disabled: !!disabled || !!loading, busy: !!loading },
  };

  // Feedback: Android per Ripple (View bleibt unverändert), iOS per Dimmen.
  const feedback = (extra?: StyleProp<ViewStyle>) =>
    ({ pressed }: { pressed: boolean }) =>
      [baseStyle, extra, { opacity: disabled ? 0.5 : pressedOpacity(pressed) }] as StyleProp<ViewStyle>;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        android_ripple={disabled || loading ? undefined : ripple(PP.onBrand)}
        {...a11y}
        style={feedback()}
      >
        <LinearGradient
          colors={PP.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            {
              borderRadius: r,
              ...glow(PP.teal, 's'),
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
        {...a11y}
        style={feedback({
          backgroundColor: isAndroid ? 'transparent' : PP.surface,
          borderWidth: 1,
          // MD3 Outlined Button: sichtbarer Rand, keine Fläche.
          borderColor: isAndroid ? PP.hairline : alpha(PP.ink, "subtle"),
          borderRadius: r,
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
      {...a11y}
      style={feedback({ backgroundColor: 'transparent', borderRadius: r })}
    >
      {content}
    </Pressable>
  );
}
