import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PP, alpha, glow } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText } from './Text';

interface ToastProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: IconName;
  onHide?: () => void;
  duration?: number;
}

export function Toast({ visible, title, subtitle, icon = 'medal', onHide, duration = 2800 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const ty = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      ty.value = withSpring(0, PP.motion.spring);
      opacity.value = withTiming(1, { duration: PP.motion.base });
      const t = setTimeout(() => {
        ty.value = withTiming(-120, { duration: PP.motion.base });
        opacity.value = withTiming(0, { duration: PP.motion.base }, (done) => {
          if (done && onHide) runOnJS(onHide)();
        });
      }, duration);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 100,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={PP.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: PP.space.md,
          padding: PP.space.lg,
          borderRadius: PP.rTile,
          ...glow(PP.teal),
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: PP.rTile2,
            backgroundColor: alpha(PP.onBrand, "medium"),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={PP.iconSizes.lg} color={PP.onBrand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PPText weight="semibold" size="base" color={PP.onBrand}>
            {title}
          </PPText>
          {subtitle && (
            <PPText size="sm" color="PP.onBrandMuted" style={{ marginTop: 1 }}>
              {subtitle}
            </PPText>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
