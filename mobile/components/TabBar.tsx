import { View, Pressable, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PP } from '../lib/theme';
import { Icon, type IconName } from '../lib/icons';
import { PPText } from './ui/Text';
import { useCurrentUser } from '../lib/hooks/useData';

// Minimal shape of the tabBar prop expo-router passes (avoids a direct
// @react-navigation/bottom-tabs dependency that isn't installed standalone).
type TabRoute = { key: string; name: string };
type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

// Fixed visual order. "Scannen" is not a tab route — it opens the modal
// universal-scanner screen at the root, so the tab bar stays out of the way there.
type Slot = { name: string; label: string; icon: IconName; modal?: boolean; staffOnly?: boolean; push?: string };
const SLOTS: Slot[] = [
  { name: 'index', label: 'Moin', icon: 'house' },
  { name: 'badges', label: 'Watt', icon: 'medal' },
  { name: 'scan', label: 'Scannen', icon: 'qr-scan', modal: true },
  // href:null route → not in the tab navigator state, so push it directly.
  { name: 'items/index', label: 'Teile', icon: 'shirt', staffOnly: true, push: '/(visitor)/items' },
  { name: 'points', label: 'Punkte', icon: 'coins' },
];

// Floating liquid-glass tab bar (HANDOFF §8 Glass variant).
export function GlassTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const isStaff = user?.role === 'volunteer' || user?.role === 'admin';
  const bottom = Math.max(insets.bottom, 12);
  const activeName = state.routes[state.index]?.name;
  const slots = SLOTS.filter((s) => !s.staffOnly || isStaff);

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 100} tint="light" style={styles.bar}>
        {slots.map((slot) => {
          const isActive = !slot.modal && activeName === slot.name;
          const color = isActive ? PP.teal : PP.ink3;

          const onPress = () => {
            if (slot.modal) {
              router.push('/scan');
              return;
            }
            if (slot.push) {
              router.push(slot.push as any);
              return;
            }
            const route = state.routes.find((r) => r.name === slot.name);
            if (!route) return;
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(slot.name);
            }
          };

          return (
            <Pressable key={slot.name} onPress={onPress} style={styles.item}>
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Icon name={slot.icon} size={22} color={color} />
              </View>
              <PPText weight={isActive ? 'semibold' : 'medium'} size={10} color={color} style={{ letterSpacing: 0.1 }}>
                {slot.label}
              </PPText>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  bar: {
    height: 64,
    borderRadius: 26,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(39,176,146,0.35)',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
    ...PP.shadowTabBar,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 38,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(39,176,146,0.14)',
  },
});
