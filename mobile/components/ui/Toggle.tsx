import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { PP, alpha } from '../../lib/theme';

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  // Der Schalter trägt keinen eigenen Text; die Beschriftung steht daneben in
  // der Zeile. Für den Screenreader muss sie hier mitgegeben werden.
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Toggle({ value, onChange, accessibilityLabel, accessibilityHint }: ToggleProps) {
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? 18 : 0, { duration: PP.motion.fast }) }],
  }));
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? PP.teal : alpha(PP.ink, "medium"), { duration: PP.motion.fast }),
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
