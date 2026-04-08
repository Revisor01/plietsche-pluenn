import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Toast from 'react-native-toast-message';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ItemListScreen from '../screens/items/ItemListScreen';
import ItemCreateScreen from '../screens/items/ItemCreateScreen';
import StoreInfoScreen from '../screens/store/StoreInfoScreen';
import ScanScreen from '../screens/visitor/ScanScreen';
import CheckInScreen from '../screens/visitor/CheckInScreen';
import PointsHistoryScreen from '../screens/visitor/PointsHistoryScreen';
import HomeScreen from '../screens/visitor/HomeScreen';
import DashboardScreen from '../screens/admin/DashboardScreen';
import PrivacyScreen from '../screens/legal/PrivacyScreen';
import { useAuthStore } from '../store/authStore';
import { colors, fonts } from '../theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function VolunteerTabs() {
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
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Items"
        component={ItemListScreen}
        options={{ title: 'Kleidung' }}
      />
      <Tab.Screen
        name="Neu"
        component={ItemCreateScreen}
        options={{ title: 'Neu anlegen' }}
      />
      <Tab.Screen
        name="StoreInfo"
        component={StoreInfoScreen}
        options={{ title: 'Store-Info' }}
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
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{ title: 'Scannen', headerShown: false }}
      />
      <Tab.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ title: 'Check-In' }}
      />
      <Tab.Screen
        name="Punkte"
        component={PointsHistoryScreen}
        options={{ title: 'Punkte' }}
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
      ) : (
        <Stack.Screen name="Tabs" component={VolunteerTabs} />
      )}
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ headerShown: true, title: 'Datenschutz' }}
      />
    </Stack.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {token ? (
            <Stack.Screen
              name="App"
              options={{ headerShown: false }}
            >
              {() => <AuthenticatedStack role={role} />}
            </Stack.Screen>
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
