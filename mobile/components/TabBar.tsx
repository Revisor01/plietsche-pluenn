import { View, Pressable, StyleSheet, AccessibilityInfo } from 'react-native';
import { useState, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PP, isAndroid, ripple, surfaceElevation, alpha } from '../lib/theme';
import { Icon, type IconName } from '../lib/icons';
import { PPText } from './ui/Text';
import { useCurrentUser } from '../lib/hooks/useData';

// Erst beim Aufruf prüfen, beim Import ist das native Modul evtl. noch nicht registriert und das falsche Ergebnis bliebe gecacht.
function liquidGlassAvailable(): boolean {
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

// Minimale Form der tabBar-Props, ohne @react-navigation/bottom-tabs als Abhängigkeit.
type TabRoute = { key: string; name: string };
type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

// Feste Reihenfolge; „Scannen“ öffnet den Scanner als Modal statt einer Tab-Route.
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

// iOS schwebende Liquid-Glass-Leiste, Android MD3 Navigation Bar.
export function GlassTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Mit „Transparenz reduzieren“ wird das Material flach, dann sieht der Blur besser aus.
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
              accessibilityRole="tab"
              accessibilityLabel={slot.label}
              // Sonst ist der aktive Tab im Screenreader nicht erkennbar.
              accessibilityState={{ selected: isActive }}
              style={styles.md3Item}
            >
              <View style={styles.md3IndicatorWrap}>
                <Icon name={slot.icon} size={PP.iconSizes.lg} color={color} />
              </View>
              <PPText weight={isActive ? 'semibold' : 'medium'} size="xs" color={color} style={{ letterSpacing: PP.tracking.caps }}>
                {slot.label}
              </PPText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // --- iOS: schwebendes Glas ------------------------------------------------
  const bottom = Math.max(insets.bottom, 12);
  const items = slots.map((slot) => {
    const isActive = !slot.modal && activeName === slot.name;
    const color = isActive ? PP.teal : PP.ink3;
    return (
      <Pressable
        key={slot.name}
        onPress={press(slot, isActive)}
        accessibilityRole="tab"
        accessibilityLabel={slot.label}
        accessibilityState={{ selected: isActive }}
        style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.iconWrap}>
          <Icon name={slot.icon} size={PP.iconSizes.lg} color={color} />
        </View>
        <PPText weight={isActive ? 'semibold' : 'medium'} size="xs" color={color} style={{ letterSpacing: PP.tracking.label }}>
          {slot.label}
        </PPText>
      </Pressable>
    );
  });

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      {/* colorScheme bleibt auf 'auto': mit 'light' erzeugt iOS ein helles Glas,
          das auf unserem hellen Hintergrund praktisch unsichtbar ist — der Effekt
          greift, nur sieht man ihn nicht. Der leichte Tint gibt dem Material
          zusätzlich Kante, ohne es zuzukleistern. */}
      {glass ? (
        <GlassView
          glassEffectStyle="regular"
          isInteractive
          tintColor={alpha(PP.onBrand, 'strong')}
          style={[styles.bar, styles.barGlass]}
        >
          {items}
        </GlassView>
      ) : (
        <BlurView intensity={60} tint="light" style={[styles.bar, styles.barBlur]}>
          {items}
        </BlurView>
      )}
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
    borderRadius: PP.rSheet,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PP.space.xs,
  },
  // Kein overflow, Hintergrund, Rand oder Schatten, sonst wird das Glas milchig.
  barGlass: {},
  barBlur: {
    // Der Fallback-Blur braucht das Clipping, sonst läuft er über die Ecken.
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: alpha(PP.teal, "strong"),
    backgroundColor: alpha(PP.onBrand, "veil"),
    ...PP.shadowTabBar,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: PP.space.xs,
  },
  iconWrap: {
    width: 38,
    height: 28,
    borderRadius: PP.rField,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- MD3 Navigation Bar (Android), am Rand verankert ---
  md3Bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PP.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: PP.hairline,
    paddingTop: PP.space.md,
    ...surfaceElevation(2),
  },
  md3Item: {
    flex: 1,
    alignItems: 'center',
    gap: PP.space.xs,
    paddingBottom: PP.space.md,
  },
  // Aktiv nur über die Farbe, bewusst ohne MD3-Pill.
  md3IndicatorWrap: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
