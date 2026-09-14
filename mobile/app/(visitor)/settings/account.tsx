import { useState, useEffect } from 'react';
import { View, Alert, Pressable, Platform, AccessibilityInfo } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

import { PP, alpha } from '../../../lib/theme';
import { Icon, type IconName } from '../../../lib/icons';
import { useCurrentUser } from '../../../lib/hooks/useData';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useGoBack } from '../../../lib/hooks/useGoBack';
import { errorText } from '../../../lib/errors';
import {
  Screen,
  PPHeader,
  PPText,
  Card,
  Field,
  PPButton,
  SectionTitle,
  IconButton,
  IconTile,
} from '../../../components/ui';

function AdminLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
        <IconTile icon={icon} size="s" />
        <PPText weight="semibold" size="base" color={PP.ink} style={{ flex: 1 }}>{label}</PPText>
        <Icon name="chevron-right" size={PP.iconSizes.md} color={PP.ink3} />
      </Card>
    </Pressable>
  );
}

// Diagnose für den Admin: zeigt, warum Liquid Glass greift oder eben nicht.
// Die drei Bedingungen (iOS 26, Glass-API vorhanden, Transparenz nicht
// reduziert) lassen sich sonst nur auf dem Gerät selbst auseinanderhalten.
function SystemInfo() {
  const [reduceTransparency, setReduceTransparency] = useState<boolean | null>(null);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then(setReduceTransparency)
      .catch(() => setReduceTransparency(null));
  }, []);

  let glassAvailable: boolean | null = null;
  try {
    glassAvailable = isLiquidGlassAvailable();
  } catch {
    glassAvailable = null;
  }

  const rows: { label: string; value: string }[] = [
    { label: 'System', value: `${Platform.OS} ${Platform.Version}` },
    { label: 'App-Version', value: `${Constants.expoConfig?.version ?? '–'}` },
    {
      label: 'Liquid Glass',
      value:
        Platform.OS !== 'ios' ? 'nur iOS'
        : glassAvailable === null ? 'Modul nicht erreichbar'
        : glassAvailable ? 'verfügbar'
        : 'nicht verfügbar (braucht iOS 26)',
    },
    {
      label: 'Transparenz reduziert',
      value: reduceTransparency === null ? '–' : reduceTransparency ? 'ja — Glas ist abgeschaltet' : 'nein',
    },
  ];

  return (
    <Card pad={0} style={{ overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <View
          key={r.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: PP.space.md,
            paddingHorizontal: PP.space.lg,
            paddingVertical: PP.space.md,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: PP.hairline,
          }}
        >
          <PPText size="sm" color={PP.ink3}>{r.label}</PPText>
          <PPText weight="semibold" size="sm" color={PP.ink} style={{ flexShrink: 1, textAlign: 'right' }}>
            {r.value}
          </PPText>
        </View>
      ))}
    </Card>
  );
}

export default function Account() {
  const router = useRouter();
  const goBack = useGoBack();
  const { data: user, refetch } = useCurrentUser();
  const { updateName, updateEmail, updatePassword, logout } = useAuth();
  const isStaff = user?.role === 'volunteer' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const [busy, setBusy] = useState<null | 'name' | 'email' | 'pw'>(null);

  // useCurrentUser loads async; hydrate the name field once the user arrives.
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.id]);

  const saveName = async () => {
    if (!name.trim() || name.trim() === user?.name) return;
    setBusy('name');
    try {
      await updateName(name.trim());
      await refetch();
      Alert.alert('Gespeichert', 'Dein Name wurde aktualisiert.');
    } catch (e: any) {
      Alert.alert('Fehler', errorText(e, 'Name konnte nicht gespeichert werden.'));
    } finally {
      setBusy(null);
    }
  };

  const saveEmail = async () => {
    const next = email.trim().toLowerCase();
    if (!next || next === user?.email?.toLowerCase()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      Alert.alert('E-Mail', 'Bitte eine gültige E-Mail-Adresse eingeben.');
      return;
    }
    setBusy('email');
    try {
      await updateEmail(next);
      setEmail('');
      Alert.alert(
        'Bestätigung nötig',
        `Wir haben eine E-Mail an ${next} geschickt. Bestätige den Link, um die Adresse zu ändern.`,
      );
    } catch (e: any) {
      Alert.alert('Fehler', errorText(e, 'E-Mail konnte nicht geändert werden.'));
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
        leading={<IconButton icon="chevron-left" accessibilityLabel="Zurück" onPress={goBack} />}
      />

      <SectionTitle title="Name" />
      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
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
      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
        <Card pad={12}>
          <PPText size="sm" color={PP.ink2}>Aktuell</PPText>
          <PPText weight="semibold" size="base" color={PP.ink} style={{ marginTop: 2 }}>
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
          loading={busy === 'email'}
          disabled={!email.trim()}
          onPress={saveEmail}
        >
          E-Mail ändern
        </PPButton>
      </View>

      <SectionTitle title="Passwort" />
      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
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
          <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
            {/* Alle Verwaltungswege sitzen hier gebündelt. Die Tabs selbst
                zeigen dem Team dieselbe Ansicht wie allen anderen — Sonder-
                funktionen gehören in diesen Bereich, nicht in die Kopfzeilen. */}
            <AdminLink icon="search" label="Aushang & Ankündigungen" onPress={() => router.push('/(visitor)/admin/needs?from=/(visitor)/settings/account')} />
            {isAdmin && <AdminLink icon="medal" label="Abzeichen" onPress={() => router.push('/(visitor)/admin/badges?from=/(visitor)/settings/account')} />}
            {isAdmin && <AdminLink icon="sparkles" label="Aktionen" onPress={() => router.push('/(visitor)/admin/actions?from=/(visitor)/settings/account')} />}
            {isAdmin && <AdminLink icon="gauge" label="Punkte-Ränge" onPress={() => router.push('/(visitor)/admin/tiers?from=/(visitor)/settings/account')} />}
          </View>
        </>
      )}

      {isAdmin && (
        <>
          <SectionTitle title="System" />
          <View style={{ paddingHorizontal: PP.space.xl }}>
            <SystemInfo />
          </View>
        </>
      )}

      {/* Abmelden ist eine ernste, aber keine zerstörerische Aktion: als Karte
          abgesetzt und rot beschriftet, damit sie auffindbar ist — jedoch ohne
          die volle Signalwirkung eines Lösch-Buttons. Der vorherige Geister-
          Button mit Zurück-Pfeil las sich wie "eine Ebene zurück". */}
      <View style={{ paddingHorizontal: PP.space.xl, marginTop: PP.space.huge }}>
        <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="Abmelden">
          <Card
            pad={14}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: PP.space.md,
              backgroundColor: alpha(PP.err, "ghost"),
              borderWidth: 1,
              borderColor: alpha(PP.err, "medium"),
            }}
          >
            <IconTile icon="arrow-left" tint={PP.err} tone="soft" size="s" />
            <PPText weight="semibold" size="base" color={PP.err} style={{ flex: 1 }}>
              Abmelden
            </PPText>
          </Card>
        </Pressable>
      </View>
    </Screen>
  );
}
