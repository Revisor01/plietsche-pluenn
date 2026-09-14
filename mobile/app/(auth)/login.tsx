import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PP } from '../../lib/theme';
import { useAuth } from '../../lib/hooks/useAuth';
import { BrandMark } from '../../components/BrandMark';
import { PPText, PPButton, Field } from '../../components/ui';

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Fehlt noch was', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Root guard handles navigation after authStore change.
    } catch (e: any) {
      Alert.alert('Klappt nich', 'E-Mail oder Passwort stimmt nicht. Versuch es nochmal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: PP.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 18 }}>
        <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 28 }}>
          <BrandMark />
          <PPText weight="bold" size="xl" style={{ marginTop: 14, letterSpacing: PP.tracking.title }}>
            Tach auch!
          </PPText>
          <PPText size="base" color={PP.ink2} style={{ marginTop: 4 }}>
            Melde dich an, dann geht's los.
          </PPText>
        </View>

        <View style={{ gap: 12 }}>
          <Field
            icon="mail"
            label="E-Mail"
            placeholder="moin@example.de"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            icon="lock"
            label="Passwort"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={onSubmit}
          />
        </View>

        <View style={{ marginTop: 22 }}>
          <PPButton loading={loading} onPress={onSubmit}>
            Anmelden
          </PPButton>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: PP.hairline }} />
          <PPText size="xs" color={PP.ink3} style={{ letterSpacing: PP.tracking.caps }}>
            ODER
          </PPText>
          <View style={{ flex: 1, height: 1, backgroundColor: PP.hairline }} />
        </View>

        <PPButton variant="secondary" onPress={() => router.push('/(auth)/register')}>
          Neu hier? Registrieren
        </PPButton>
      </View>
    </KeyboardAvoidingView>
  );
}
