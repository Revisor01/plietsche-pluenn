import { useState } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { PP } from '../../../lib/theme';
import { Icon, type IconName } from '../../../lib/icons';
import { useCurrentUser } from '../../../lib/hooks/useData';
import { useAuth } from '../../../lib/hooks/useAuth';
import {
  Screen,
  PPHeader,
  PPText,
  Card,
  Field,
  PPButton,
  SectionTitle,
  IconButton,
} from '../../../components/ui';

function AdminLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(39,176,146,0.10)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={PP.teal} />
        </View>
        <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink} style={{ flex: 1 }}>{label}</PPText>
        <Icon name="chevron-right" size={18} color={PP.ink3} />
      </Card>
    </Pressable>
  );
}

export default function Account() {
  const router = useRouter();
  const { data: user, refetch } = useCurrentUser();
  const { updateName, updateEmail, updatePassword, logout } = useAuth();
  const isStaff = user?.role === 'volunteer' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const [busy, setBusy] = useState<null | 'name' | 'email' | 'pw'>(null);

  const saveName = async () => {
    if (!name.trim() || name.trim() === user?.name) return;
    setBusy('name');
    try {
      await updateName(name.trim());
      await refetch();
      Alert.alert('Gespeichert', 'Dein Name wurde aktualisiert.');
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Name konnte nicht gespeichert werden.');
    } finally {
      setBusy(null);
    }
  };

  const saveEmail = async () => {
    const next = email.trim().toLowerCase();
    if (!next || next === user?.email?.toLowerCase()) return;
    setBusy('email');
    try {
      await updateEmail(next);
      setEmail('');
      Alert.alert(
        'Bestätigung nötig',
        `Wir haben eine E-Mail an ${next} geschickt. Bestätige den Link, um die Adresse zu ändern.`,
      );
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'E-Mail konnte nicht geändert werden.');
    } finally {
      setBusy(null);
    }
  };

  const savePassword = async () => {
    if (!oldPw || newPw.length < 8) {
      Alert.alert('Hinweis', 'Neues Passwort braucht mindestens 8 Zeichen.');
      return;
    }
    setBusy('pw');
    try {
      await updatePassword(oldPw, newPw);
      setOldPw('');
      setNewPw('');
      Alert.alert('Gespeichert', 'Dein Passwort wurde geändert.');
    } catch (e: any) {
      Alert.alert('Fehler', 'Passwort konnte nicht geändert werden. Stimmt das aktuelle Passwort?');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Dein Konto"
        title="Profil"
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
      />

      <SectionTitle title="Name" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Field icon="user" label="Anzeigename" value={name} onChangeText={setName} autoCapitalize="words" />
        <PPButton
          size="m"
          loading={busy === 'name'}
          disabled={!name.trim() || name.trim() === user?.name}
          onPress={saveName}
        >
          Name speichern
        </PPButton>
      </View>

      <SectionTitle title="E-Mail" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Card pad={12}>
          <PPText size={PP.fontSizes.sm} color={PP.ink2}>Aktuell</PPText>
          <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink} style={{ marginTop: 2 }}>
            {user?.email ?? '–'}
          </PPText>
        </Card>
        <Field
          icon="mail"
          label="Neue E-Mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="name@example.de"
        />
        <PPButton
          size="m"
          variant="secondary"
          loading={busy === 'email'}
          disabled={!email.trim()}
          onPress={saveEmail}
        >
          E-Mail ändern
        </PPButton>
      </View>

      <SectionTitle title="Passwort" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Field icon="lock" label="Aktuelles Passwort" secure value={oldPw} onChangeText={setOldPw} />
        <Field icon="lock" label="Neues Passwort" secure value={newPw} onChangeText={setNewPw} />
        <PPButton
          size="m"
          variant="secondary"
          loading={busy === 'pw'}
          disabled={!oldPw || !newPw}
          onPress={savePassword}
        >
          Passwort ändern
        </PPButton>
      </View>

      {isStaff && (
        <>
          <SectionTitle title="Verwaltung" />
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <AdminLink icon="shirt" label="Teile-Inventar" onPress={() => router.push('/(visitor)/items')} />
            {isAdmin && <AdminLink icon="medal" label="Badges verwalten" onPress={() => router.push('/(visitor)/admin/badges')} />}
            {isAdmin && <AdminLink icon="sparkles" label="Aktionen (Doppelpunkte)" onPress={() => router.push('/(visitor)/admin/actions')} />}
            <AdminLink icon="search" label="Bedarf-Aushang" onPress={() => router.push('/(visitor)/admin/needs')} />
          </View>
        </>
      )}

      <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
        <PPButton variant="ghost" icon="arrow-left" onPress={logout}>
          Abmelden
        </PPButton>
      </View>
    </Screen>
  );
}
