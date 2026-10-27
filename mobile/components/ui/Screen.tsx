import { View, ScrollView, StyleProp, ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PP, isAndroid } from '../../lib/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  bg?: string;
  gradientBg?: boolean;
  padBottom?: number;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

// Bildschirmrahmen mit Safe Area; auf Android wird der Freiraum für die Tab-Leiste zentral zurückgenommen.
const TAB_CLEARANCE = 100;

export function Screen({
  children,
  scroll = true,
  bg = PP.bg,
  gradientBg = false,
  padBottom = 32,
  contentStyle,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padTop = insets.top + 8;
  // Werte über TAB_CLEARANCE sind Freiraum für die schwebende iOS-Leiste.
  const padBot = isAndroid && padBottom >= TAB_CLEARANCE ? PP.space.xxl : padBottom;

  const inner = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingTop: padTop, paddingBottom: padBot}, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={PP.teal} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingTop: padTop, paddingBottom: padBot}, contentStyle]}>{children}</View>
  );

  // Den Wrapper nie inline definieren, sonst verliert jedes TextInput nach jedem Tastendruck den Fokus.
  if (gradientBg) {
    return (
      <LinearGradient colors={PP.gradientSoft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>{inner}</View>
      </LinearGradient>
    );
  }
  return <View style={{ flex: 1, backgroundColor: bg }}>{inner}</View>;
}
