import { Stack } from 'expo-router';
import { PP } from '../../lib/theme';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: PP.bg } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="how" />
      <Stack.Screen name="permissions" />
    </Stack>
  );
}
