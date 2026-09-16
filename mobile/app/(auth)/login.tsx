import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PP } from '../../lib/theme';
import { useAuth } from '../../lib/hooks/useAuth';
import { BrandMark } from '../../components/BrandMark';
import { PPText, PPButton, Field } from '../../components/ui';

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  // Passwort vergessen: Wir schicken den Link an die Adresse, die oben schon
  // im Feld steht — ein eigener Screen dafuer waere ein Umweg. Die Rueckmeldung
  // sagt bewusst "falls es ein Konto gibt": Ob die Adresse bekannt ist, darf
  // hier niemand herauslesen koennen.
  const onForgotPassword = () => {
    const next = email.trim().toLowerCase();
    if (!next) {
      Alert.alert(
        'E-Mail fehlt',
        'Trag oben deine E-Mail-Adresse ein, dann schicken wir dir einen Link zum Zurücksetzen.',
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      Alert.alert('E-Mail', 'Bitte eine gültige E-Mail-Adresse eingeben.');
      return;
    }
    Alert.alert(
      'Passwort zurücksetzen',
      `Wir schicken einen Link an ${next}. Damit kannst du dir ein neues Passwort setzen.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Link schicken',
          onPress: async () => {
            setResetting(true);
            try {
              await requestPasswordReset(next);
              Alert.alert(
                'Guck in dein Postfach',
                'Falls es ein Konto mit dieser Adresse gibt, ist der Link unterwegs. Schau auch im Spam-Ordner nach.',
              );
            } catch {
              Alert.alert(
                'Klappt nich',
                'Der Link konnte nicht verschickt werden. Versuch es später nochmal.',
              );
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: PP.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, paddingHorizontal: PP.space.xxl, paddingTop: insets.top + 18 }}>
        <View style={{ alignItems: 'center', marginTop: PP.space.lg, marginBottom: PP.space.huge }}>
          <BrandMark />
          <PPText weight="bold" size="xl" style={{ marginTop: PP.space.lg, letterSpacing: PP.tracking.title }}>
            Tach auch!
          </PPText>
          <PPText size="base" color={PP.ink2} style={{ marginTop: PP.space.xs }}>
            Melde dich an, dann geht's los.
          </PPText>
        </View>

        <View style={{ gap: PP.space.md }}>
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

        <View style={{ marginTop: PP.space.xxl }}>
          <PPButton loading={loading} onPress={onSubmit}>
            Anmelden
          </PPButton>
        </View>

        <Pressable
          onPress={onForgotPassword}
          disabled={resetting}
          accessibilityRole="button"
          accessibilityLabel="Passwort vergessen"
          hitSlop={PP.space.md}
          style={{ alignSelf: 'center', marginTop: PP.space.lg }}
        >
          <PPText size="sm" color={PP.ink2}>
            {resetting ? 'Wird verschickt …' : 'Passwort vergessen?'}
          </PPText>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md, marginVertical: PP.space.xxl }}>
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
