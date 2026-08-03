import { View, Pressable, StyleSheet, AccessibilityInfo, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { BlurView } from 'expo-blur';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PP, isAndroid, ripple, surfaceElevation } from '../lib/theme';
import { Icon, type IconName } from '../lib/icons';
import { PPText } from './ui/Text';
import { useCurrentUser } from '../lib/hooks/useData';

// Evaluated lazily, not at module load: isLiquidGlassAvailable() reaches into a
// native module, and at import time that module may not be registered yet — it
// would then answer `false` and stay wrong for the whole session, because the
// result is cached inside expo-glass-effect after the first call.
function liquidGlassAvailable(): boolean {
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

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
  // Store browser for everyone (href:null route → push directly).
  { name: 'store', label: 'Laden', icon: 'shirt', push: '/(visitor)/store' },
  // Staff inventory (href:null route → push directly).
  { name: 'items/index', label: 'Teile', icon: 'tag', staffOnly: true, push: '/(visitor)/items' },
  { name: 'points', label: 'Punkte', icon: 'coins' },
];

// Tab bar je Plattform:
//  - iOS   → schwebende Liquid-Glass-Leiste (HANDOFF §8 Glass variant)
//  - Android → MD3 Navigation Bar: am Rand verankert, Pill-Indikator, Ripple
export function GlassTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Liquid Glass needs iOS 26 AND the system's transparency setting left on —
  // "Reduce Transparency" (Accessibility → Display) silently flattens the
  // material, in which case the blur fallback is the better-looking option.
  const [glass, setGlass] = useState(() => !isAndroid && liquidGlassAvailable());
  useEffect(() => {
    if (isAndroid) return;
    let alive = true;
    const apply = (reduced: boolean) => {
      if (alive) setGlass(liquidGlassAvailable() && !reduced);
    };
    AccessibilityInfo.isReduceTransparencyEnabled().then(apply).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', apply);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);

  const { data: user } = useCurrentUser();
  const isStaff = user?.role === 'volunteer' || user?.role === 'admin';
  const activeName = state.routes[state.index]?.name;
  const slots = SLOTS.filter((s) => !s.staffOnly || isStaff);

  const press = (slot: Slot, isActive: boolean) => () => {
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

  // Wandernde Glaskachel: Position und Breite müssen VOR jedem frühen return
  // berechnet werden — Hooks dürfen nie bedingt laufen (Android kehrt gleich zurück).
  const activeIndex = slots.findIndex((s2) => !s2.modal && activeName === s2.name);
  const [barWidth, setBarWidth] = useState(0);
  const slotWidth = barWidth > 0 ? (barWidth - 8) / slots.length : 0;
  const pill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (activeIndex < 0 || slotWidth === 0) return;
    Animated.spring(pill, {
      toValue: 4 + activeIndex * slotWidth,
      useNativeDriver: false,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [activeIndex, slotWidth]);

  // --- Android: MD3 Navigation Bar -----------------------------------------
  if (isAndroid) {
    return (
      <View style={[styles.md3Bar, { paddingBottom: insets.bottom }]}>
        {slots.map((slot) => {
          const isActive = !slot.modal && activeName === slot.name;
          const color = isActive ? PP.teal : PP.ink2;
          return (
            <Pressable
              key={slot.name}
              onPress={press(slot, isActive)}
              android_ripple={ripple(PP.teal, false)}
              style={styles.md3Item}
            >
              <View style={styles.md3IndicatorWrap}>
                <Icon name={slot.icon} size={22} color={color} />
              </View>
              <PPText weight={isActive ? 'semibold' : 'medium'} size={10} color={color} style={{ letterSpacing: 0.4 }}>
                {slot.label}
              </PPText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // --- iOS: schwebendes Glas ------------------------------------------------
  // Der Morph-Effekt beim Tab-Wechsel entsteht NICHT aus einer einzelnen
  // GlassView: Zwei Glasflächen innerhalb eines GlassContainer verschmelzen,
  // sobald sie sich näher kommen als `spacing` — das ist das Fließen. Deshalb
  // liegt hier eine wandernde Kachel über der Leiste, beide aus Glas.
  const bottom = Math.max(insets.bottom, 12);

  const items = slots.map((slot) => {
    const isActive = !slot.modal && activeName === slot.name;
    const color = isActive ? PP.teal : PP.ink3;
    return (
      <Pressable
        key={slot.name}
        onPress={press(slot, isActive)}
        style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.iconWrap}>
          <Icon name={slot.icon} size={22} color={color} />
        </View>
        <PPText weight={isActive ? 'semibold' : 'medium'} size={10} color={color} style={{ letterSpacing: 0.1 }}>
          {slot.label}
        </PPText>
      </Pressable>
    );
  });

  if (!glass) {
    return (
      <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
        <BlurView intensity={60} tint="light" style={[styles.bar, styles.barBlur]}>
          {items}
        </BlurView>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      {/* spacing bestimmt, ab welchem Abstand die Kachel mit der Leiste
          verschmilzt — großzügig gewählt, damit das Fließen sichtbar wird. */}
      <GlassContainer spacing={28} style={styles.bar} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
        {activeIndex >= 0 && slotWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: pill,
              top: 6,
              width: slotWidth,
              height: 52,
            }}
          >
            <GlassView
              glassEffectStyle="regular"
              isInteractive
              tintColor="rgba(39,176,146,0.22)"
              style={{ flex: 1, borderRadius: 20 }}
            />
          </Animated.View>
        )}
        <View style={styles.row}>{items}</View>
      </GlassContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    height: 64,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  // Echtes Liquid Glass sampelt den Inhalt DAHINTER auf Systemebene. Deshalb
  // hier kein `overflow: hidden` (die Clipping-Ebene kappt genau das und macht
  // aus dem Material eine milchige Fläche), kein eigener Hintergrund, kein
  // Border und kein Schatten — Tiefe und Rand bringt das Material selbst mit.
  barGlass: {},
  barBlur: {
    // Der Fallback-Blur braucht das Clipping, sonst läuft er über die Ecken.
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(39,176,146,0.35)',
    backgroundColor: 'rgba(255,255,255,0.55)',
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

  // --- MD3 Navigation Bar (Android) ---------------------------------------
  // Material verankert die Leiste am Rand statt sie schweben zu lassen.
  md3Bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PP.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PP.hairline,
    paddingTop: 12,
    ...surfaceElevation(2),
  },
  md3Item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingBottom: 12,
  },
  // Der aktive Zustand wird allein über die Farbe von Icon und Label getragen —
  // bewusst ohne den MD3-Pill hinter dem Icon.
  md3IndicatorWrap: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
