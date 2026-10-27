import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { PP, alpha } from '../../lib/theme';

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  // Die Beschriftung steht daneben und muss für den Screenreader mit.
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

// Einmal beim Laden berechnet, weil `alpha()` im Worklet auf dem UI-Thread nicht existiert.
const TRACK_OFF = alpha(PP.ink, 'medium');
const TRACK_ON = PP.teal;

export function Toggle({ value, onChange, accessibilityLabel, accessibilityHint }: ToggleProps) {
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? 18 : 0, { duration: PP.motion.fast }) }],
  }));
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? TRACK_ON : TRACK_OFF, { duration: PP.motion.fast }),
  }));

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value }}
      // 28 pt Spur + 2×8 pt = 44 pt Trefferfläche (WCAG 2.5.5).
      hitSlop={8}
    >
      <Animated.View style={[{ width: 46, height: 28, borderRadius: PP.rPill, justifyContent: 'center', paddingHorizontal: 3 }, track]}>
        <Animated.View
          style={[
            {
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: PP.surface,
              shadowColor: PP.inkDeep,
              shadowOpacity: 0.18,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            },
            knob,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
