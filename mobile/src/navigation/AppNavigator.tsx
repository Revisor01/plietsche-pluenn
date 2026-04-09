import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/FontAwesome5';
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
import { colors, fonts } from '../theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const tabScreenOptions = {
  headerShown: true,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  tabBarLabelStyle: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  headerStyle: {
    backgroundColor: colors.primary,
  },
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
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="chart-bar" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Items"
        component={ItemListScreen}
        options={{
          title: 'Kleidung',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="tshirt" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Neu"
        component={ItemCreateScreen}
        options={{
          title: 'Neu anlegen',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="plus-circle" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StoreInfo"
        component={StoreInfoScreen}
        options={{
          title: 'Store-Info',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="store" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Kampagnen"
        component={CampaignListScreen}
        options={{
          title: 'Kampagnen',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="bullhorn" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Badges"
        component={AchievementAdminScreen}
        options={{
          title: 'Badges',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="trophy" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Volunteers"
        component={VolunteerManagementScreen}
        options={{
          title: 'Team',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="users" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Push"
        component={AdminPushScreen}
        options={{
          title: 'Push',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="bell" solid={focused} size={size} color={color} />
          ),
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
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="tshirt" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Neu"
        component={ItemCreateScreen}
        options={{
          title: 'Neu anlegen',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="plus-circle" solid={focused} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function VisitorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontFamily: fonts.bold,
          fontSize: 17,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="home" solid={focused} size={size} color={color} />
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings' as never)}
              style={{ marginRight: 16 }}
            >
              <Icon name="cog" size={20} color={colors.white} />
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: 'Scannen',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="qrcode" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{
          title: 'Check-In',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="check-circle" solid={focused} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Punkte"
        component={PointsHistoryScreen}
        options={{
          title: 'Punkte',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name="coins" solid={focused} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthenticatedStack({ role }: { role: string | undefined }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.primary },
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
        name="BadgeOverview"
        component={BadgeOverviewScreen}
        options={{ headerShown: true, title: 'Meine Badges' }}
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
