import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { PP } from '../lib/theme';
import { useAuth } from '../lib/hooks/useAuth';

// Entscheidet die Einstiegsroute selbst, damit nie ein Spinner hängt, falls der Guard ausbleibt.
export default function Index() {
  const { ready, isAuthenticated, user } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PP.bg }}>
        <ActivityIndicator color={PP.teal} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!user?.onboarding_complete) return <Redirect href="/(onboarding)/welcome" />;
  return <Redirect href="/(visitor)" />;
}
