import { Pressable, View, ActivityIndicator } from 'react-native';
import { PP, isAndroid, MD3_SHAPE, ripple, pressedOpacity, surfaceElevation, alpha } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';

interface IconButtonProps {
  icon: IconName;
  badge?: boolean;
  dark?: boolean;
  // Getönte Aktions-Variante (z.B. rotes Ablehnen): eigene Fläche + Icon-Farbe
  // auf beiden Plattformen, dann ohne Header-Schatten.
  tint?: string;
  bg?: string;
  loading?: boolean;
  onPress?: () => void;
}

export function IconButton({ icon, badge, dark = false, tint, bg, loading, onPress }: IconButtonProps) {
  const iconColor = tint ?? (dark ? PP.onBrand : PP.ink);
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      hitSlop={8}
      android_ripple={ripple(tint ?? (dark ? PP.onBrand : PP.ink), true)}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        // MD3 Icon Buttons sind rund; iOS behält das abgerundete Quadrat.
        borderRadius: isAndroid ? MD3_SHAPE.full : 14,
        backgroundColor: bg ?? (dark ? alpha(PP.onBrand, "medium") : isAndroid ? 'transparent' : PP.surface),
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressedOpacity(pressed),
        // Auf Android trägt der Ripple das Feedback — keine Erhebung nötig.
        ...(dark || isAndroid || bg ? {} : PP.shadowCard),
      })}
    >
      {loading ? <ActivityIndicator size="small" color={iconColor} /> : <Icon name={icon} size={PP.iconSizes.lg} color={iconColor} />}
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
            borderColor: PP.surface,
          }}
        />
      )}
    </Pressable>
  );
}
