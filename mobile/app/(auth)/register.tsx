import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PP } from '../../lib/theme';
import { useAuth } from '../../lib/hooks/useAuth';
import { Icon } from '../../lib/icons';
import { BrandMark } from '../../components/BrandMark';
import { PPText, PPButton, Field } from '../../components/ui';

export default function Register() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      Alert.alert('Fast', 'Name, E-Mail und ein Passwort mit mindestens 8 Zeichen.');
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      // Root guard routes to onboarding after auth.
    } catch (e: any) {
      const msg = e?.response?.data?.email
        ? 'Diese E-Mail ist schon vergeben.'
        : 'Registrierung hat nicht geklappt. Versuch es nochmal.';
      Alert.alert('Hmm', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: PP.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginBottom: 8 }}>
          <Icon name="chevron-left" size={26} color={PP.ink} />
        </Pressable>

        <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 24 }}>
          <BrandMark size={56} radius={18} />
          <PPText weight="bold" size={22} style={{ marginTop: 14, letterSpacing: -0.4 }}>
            Willkommen an Bord
          </PPText>
          <PPText size={13} color={PP.ink2} style={{ marginTop: 4 }}>
            Ein Konto, dann sammelst du los.
          </PPText>
        </View>

        <View style={{ gap: 12 }}>
          <Field
            icon="user"
            label="Name"
            placeholder="Wie heißt du?"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
          />
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
            placeholder="Mind. 8 Zeichen"
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={onSubmit}
          />
        </View>

        <View style={{ marginTop: 22 }}>
          <PPButton loading={loading} onPress={onSubmit} iconRight="arrow-right">
            Konto erstellen
          </PPButton>
        </View>

        <View style={{ alignItems: 'center', marginTop: 18 }}>
          <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
            <PPText size={13} color={PP.ink2}>
              Schon dabei? <PPText weight="semibold" size={13} color={PP.teal}>Anmelden</PPText>
            </PPText>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
