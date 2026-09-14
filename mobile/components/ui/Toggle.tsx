import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { PP, alpha } from '../../lib/theme';

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? 18 : 0, { duration: PP.motion.fast }) }],
  }));
  const track = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? PP.teal : alpha(PP.ink, "medium"), { duration: PP.motion.fast }),
  }));

  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={6}>
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
