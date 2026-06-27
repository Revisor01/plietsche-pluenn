import { View, ScrollView, StyleProp, ViewStyle, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PP } from '../../lib/theme';

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

// Screen wrapper that handles safe-area top inset and optional scroll.
// Tab screens pass padBottom ~110 to clear the floating glass tab bar.
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

  const inner = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingTop: padTop, paddingBottom: padBottom }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={PP.teal} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingTop: padTop, paddingBottom: padBottom }, contentStyle]}>{children}</View>
  );

  // NOTE: never define the wrapper as an inline component — a fresh component
  // identity each render remounts the whole subtree (incl. TextInputs), which
  // drops keyboard focus after every keystroke. Render both branches directly.
  if (gradientBg) {
    return (
      <LinearGradient colors={PP.gradientSoft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>{inner}</View>
      </LinearGradient>
    );
  }
  return <View style={{ flex: 1, backgroundColor: bg }}>{inner}</View>;
}
