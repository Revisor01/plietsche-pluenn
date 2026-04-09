import React, { useEffect } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import Toast from 'react-native-toast-message';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import ItemListScreen from '../screens/items/ItemListScreen';
import ItemCreateScreen from '../screens/items/ItemCreateScreen';
import StoreInfoScreen from '../screens/store/StoreInfoScreen';
import ScanScreen from '../screens/visitor/ScanScreen';
import CheckInScreen from '../screens/visitor/CheckInScreen';
import PointsHistoryScreen from '../screens/visitor/PointsHistoryScreen';
import HomeScreen from '../screens/visitor/HomeScreen';
import DashboardScreen from '../screens/admin/DashboardScreen';
import CampaignListScreen from '../screens/admin/CampaignListScreen';
import CampaignCreateScreen from '../screens/admin/CampaignCreateScreen';
import AchievementAdminScreen from '../screens/admin/AchievementAdminScreen';
import BadgeOverviewScreen from '../screens/visitor/BadgeOverviewScreen';
import VolunteerManagementScreen from '../screens/admin/VolunteerManagementScreen';
import AdminPushScreen from '../screens/admin/AdminPushScreen';
import SettingsScreen from '../screens/visitor/SettingsScreen';
import PrivacyScreen from '../screens/legal/PrivacyScreen';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, borderRadius, glass } from '../theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const NativeTab = createNativeBottomTabNavigator();

function GlassHeader() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {Platform.OS === 'ios' && (
        <BlurView
          blurType={glass.blurType}
          blurAmount={glass.blurAmount}
          style={StyleSheet.absoluteFill}
          reducedTransparencyFallbackColor={colors.primary}
        />
      )}
      <LinearGradient
        colors={['rgba(39,176,146,0.75)', 'rgba(128,180,226,0.65)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function TabIcon({ name, color, size }: { name: any; color: string; size: number }) {
  return <FontAwesome6 name={name} iconStyle="solid" size={size} color={color} />;
}

const tabScreenOptions = {
  headerShown: true,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: Platform.select({
    ios: {
      position: 'absolute' as const,
      bottom: 20,
      left: 20,
      right: 20,
      borderRadius: borderRadius.full,
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      shadowColor: glass.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      height: 72,
      paddingBottom: 10,
    },
    android: {
      backgroundColor: glass.androidBackground,
      borderTopColor: glass.androidBorderColor,
      elevation: 8,
    },
  }),
  tabBarBackground: Platform.OS === 'ios'
    ? () => (
        <BlurView
          blurType={glass.blurType}
          blurAmount={glass.blurAmount}
          style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.full, overflow: 'hidden' as const }]}
          reducedTransparencyFallbackColor="white"
        />
      )
    : undefined,
  tabBarLabelStyle: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  headerTransparent: true,
  headerStyle: {
    backgroundColor: 'transparent',
  },
  headerBackground: () => <GlassHeader />,
  headerTintColor: colors.white,
  headerTitleStyle: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
};

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <TabIcon name="chart-simple" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Items"
        component={ItemListScreen}
        options={{
          title: 'Kleidung',
          tabBarIcon: ({ color, size }) => <TabIcon name="shirt" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Neu"
        component={ItemCreateScreen}
        options={{
          title: 'Neu anlegen',
          tabBarIcon: ({ color, size }) => <TabIcon name="circle-plus" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="StoreInfo"
        component={StoreInfoScreen}
        options={{
          title: 'Store',
          tabBarIcon: ({ color, size }) => <TabIcon name="store" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Kampagnen"
        component={CampaignListScreen}
        options={{
          title: 'Aktionen',
          tabBarIcon: ({ color, size }) => <TabIcon name="bullhorn" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Badges"
        component={AchievementAdminScreen}
        options={{
          title: 'Badges',
          tabBarIcon: ({ color, size }) => <TabIcon name="trophy" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Volunteers"
        component={VolunteerManagementScreen}
        options={{
          title: 'Team',
          tabBarIcon: ({ color, size }) => <TabIcon name="users" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Push"
        component={AdminPushScreen}
        options={{
          title: 'Push',
          tabBarIcon: ({ color, size }) => <TabIcon name="bell" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function VolunteerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Items"
        component={ItemListScreen}
        options={{
          title: 'Kleidung',
          tabBarIcon: ({ color, size }) => <TabIcon name="shirt" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Neu"
        component={ItemCreateScreen}
        options={{
          title: 'Neu anlegen',
          tabBarIcon: ({ color, size }) => <TabIcon name="circle-plus" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Visitor: Home / Check-In / Badges / Punkte -- native iOS 26 Liquid Glass Tab-Bar
function VisitorTabs() {
  return (
    <NativeTab.Navigator>

      <NativeTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ sfSymbol: 'house' } as any),
        }}
      />
      <NativeTab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{
          title: 'Check-In',
          tabBarIcon: ({ sfSymbol: 'qrcode.viewfinder' } as any),
        }}
      />
      <NativeTab.Screen
        name="Badges"
        component={BadgeOverviewScreen}
        options={{
          title: 'Badges',
          tabBarIcon: ({ sfSymbol: 'trophy' } as any),
        }}
      />
      <NativeTab.Screen
        name="Punkte"
        component={PointsHistoryScreen}
        options={{
          title: 'Punkte',
          tabBarIcon: ({ sfSymbol: 'star.circle' } as any),
        }}
      />
    </NativeTab.Navigator>
  );
}

function AuthenticatedStack({ role }: { role: string | undefined }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerTransparent: true,
        headerStyle: { backgroundColor: 'transparent' },
        headerBackground: () => <GlassHeader />,
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
      }}
    >
      {role === 'visitor' ? (
        <Stack.Screen name="Tabs" component={VisitorTabs} />
      ) : role === 'admin' ? (
        <Stack.Screen name="Tabs" component={AdminTabs} />
      ) : (
        <Stack.Screen name="Tabs" component={VolunteerTabs} />
      )}
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ headerShown: true, title: 'Datenschutz' }}
      />
      <Stack.Screen
        name="CampaignCreate"
        component={CampaignCreateScreen}
        options={{ headerShown: true, title: 'Neue Kampagne' }}
      />
      <Stack.Screen
        name="AchievementAdmin"
        component={AchievementAdminScreen}
        options={{ headerShown: true, title: 'Badge-Verwaltung' }}
      />
      <Stack.Screen
        name="Scan"
        component={ScanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Einstellungen' }}
      />
    </Stack.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);
  const loadOnboardingState = useAuthStore((s) => s.loadOnboardingState);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  useEffect(() => {
    loadOnboardingState();
  }, []);

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {token ? (
            (!onboardingCompleted && role === 'visitor') ? (
              <Stack.Screen name="Onboarding">
                {() => <OnboardingScreen onComplete={completeOnboarding} />}
              </Stack.Screen>
            ) : (
              <Stack.Screen
                name="App"
                options={{ headerShown: false }}
              >
                {() => <AuthenticatedStack role={role} />}
              </Stack.Screen>
            )
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}
