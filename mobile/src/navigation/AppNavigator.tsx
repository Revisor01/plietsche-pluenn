import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ItemListScreen from '../screens/items/ItemListScreen';
import ItemCreateScreen from '../screens/items/ItemCreateScreen';
import StoreInfoScreen from '../screens/store/StoreInfoScreen';
import { useAuthStore } from '../store/authStore';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function VolunteerTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
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

export function AppNavigator(): React.JSX.Element {
  const token = useAuthStore((s) => s.token);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="App" component={VolunteerTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
