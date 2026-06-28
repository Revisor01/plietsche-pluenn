import { Tabs } from 'expo-router';
import { GlassTabBar } from '../../components/TabBar';
import { PP } from '../../lib/theme';

export default function VisitorLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...(props as any)} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: PP.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="badges" />
      <Tabs.Screen name="points" />
      {/* Hidden tab routes (reached via header / store screen). */}
      <Tabs.Screen name="settings/push" options={{ href: null }} />
      <Tabs.Screen name="settings/store" options={{ href: null }} />
      <Tabs.Screen name="settings/account" options={{ href: null }} />
      <Tabs.Screen name="showcase" options={{ href: null }} />
      <Tabs.Screen name="items/index" options={{ href: null }} />
      <Tabs.Screen name="items/new" options={{ href: null }} />
      <Tabs.Screen name="items/review" options={{ href: null }} />
      <Tabs.Screen name="items/[id]" options={{ href: null }} />
      <Tabs.Screen name="admin/badges" options={{ href: null }} />
      <Tabs.Screen name="admin/actions" options={{ href: null }} />
      <Tabs.Screen name="admin/needs" options={{ href: null }} />
      <Tabs.Screen name="admin/tiers" options={{ href: null }} />
    </Tabs>
  );
}
