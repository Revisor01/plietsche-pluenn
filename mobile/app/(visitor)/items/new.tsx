import { useState } from 'react';
import { View, Pressable, Image, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useAuth } from '../../../lib/hooks/useAuth';
import { createItem } from '../../../lib/api';
import {
  Screen,
  PPHeader,
  PPText,
  Card,
  Field,
  PPButton,
  SectionTitle,
  IconButton,
  Pill,
  Toggle,
} from '../../../components/ui';

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'damen-oberteil', label: 'Damen Oberteil' },
  { key: 'damen-hose', label: 'Damen Hose' },
  { key: 'damen-kleid', label: 'Damen Kleid' },
  { key: 'damen-schuhe', label: 'Damen Schuhe' },
  { key: 'herren-oberteil', label: 'Herren Oberteil' },
  { key: 'herren-hose', label: 'Herren Hose' },
  { key: 'herren-schuhe', label: 'Herren Schuhe' },
  { key: 'kinder', label: 'Kinder' },
  { key: 'accessoires', label: 'Accessoires' },
  { key: 'sonstiges', label: 'Sonstiges' },
];

const CONDITIONS: { key: string; label: string }[] = [
  { key: 'neu', label: 'Neu' },
  { key: 'sehr-gut', label: 'Sehr gut' },
  { key: 'gut', label: 'Gut' },
  { key: 'gebraucht', label: 'Gebraucht' },
];

export default function NewItem() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isStaff = user?.role === 'volunteer' || user?.role === 'admin';

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('sonstiges');
  const [condition, setCondition] = useState('gut');
  const [size, setSize] = useState('');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const [staysExternal, setStaysExternal] = useState(false);
  const [showcase, setShowcase] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Kein Zugriff', 'Bitte erlaube den Fotozugriff in den Einstellungen.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 5],
    });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('Fehlt noch', 'Bitte gib dem Teil einen Namen.');
      return;
    }
    setBusy(true);
    try {
      await createItem({
        title: title.trim(),
        category,
        condition,
        size: size.trim() || undefined,
        note: note.trim() || undefined,
        location: location.trim() || undefined,
        stays_external: staysExternal,
        is_showcase: isStaff ? showcase : false,
        photoUri,
      });
      await qc.invalidateQueries({ queryKey: ['my_items'] });
      await qc.invalidateQueries({ queryKey: ['pending_items'] });
      Alert.alert(
        'Danke!',
        isStaff
          ? 'Das Teil ist eingestellt und freigegeben.'
          : 'Das Teil wurde eingereicht und wird von einem Helfer freigegeben.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte das Teil nicht einstellen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle={isStaff ? 'Neues Teil' : 'Teil vorschlagen'}
        title="Teil einstellen"
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
      />

      {!isStaff && (
        <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
          <Card pad={12} style={{ backgroundColor: 'rgba(232,169,59,0.10)' }}>
            <PPText size={PP.fontSizes.sm} color={PP.ink2}>
              Dein Vorschlag wird von einem Helfer geprüft und dann freigegeben.
            </PPText>
          </Card>
        </View>
      )}

      <SectionTitle title="Foto" />
      <View style={{ paddingHorizontal: 20 }}>
        <Pressable onPress={pickPhoto}>
          <View
            style={{
              height: 180,
              borderRadius: 18,
              backgroundColor: 'rgba(39,176,146,0.08)',
              borderWidth: 1.5,
              borderColor: 'rgba(39,176,146,0.25)',
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <>
                <Icon name="camera" size={32} color={PP.teal} />
                <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 8 }}>
                  Foto auswählen
                </PPText>
              </>
            )}
          </View>
        </Pressable>
      </View>

      <SectionTitle title="Was ist es?" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Field icon="shirt" label="Bezeichnung" value={title} onChangeText={setTitle} placeholder="z.B. Blaue Jeansjacke" />
        <Field label="Größe (optional)" value={size} onChangeText={setSize} placeholder="z.B. M / 38 / 134" />
      </View>

      <SectionTitle title="Kategorie" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.key} onPress={() => setCategory(c.key)}>
            <Pill bg={category === c.key ? PP.teal : 'rgba(26,46,44,0.06)'} color={category === c.key ? '#fff' : PP.ink2}>
              {c.label}
            </Pill>
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle title="Zustand" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}>
        {CONDITIONS.map((c) => (
          <Pressable key={c.key} onPress={() => setCondition(c.key)}>
            <Pill bg={condition === c.key ? PP.teal : 'rgba(26,46,44,0.06)'} color={condition === c.key ? '#fff' : PP.ink2}>
              {c.label}
            </Pill>
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle title="Standort" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Field
          icon="map-pin"
          label="Wo liegt das Teil?"
          value={location}
          onChangeText={setLocation}
          placeholder="z.B. Regal 3 oder bei Fam. Meyer"
        />
        <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>
              Verbleibt beim Besitzer
            </PPText>
            <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 2 }}>
              Für große Teile, die nicht im Laden stehen.
            </PPText>
          </View>
          <Toggle value={staysExternal} onChange={setStaysExternal} />
        </Card>

        {isStaff && (
          <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>
                Ins Schaufenster
              </PPText>
              <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 2 }}>
                Sofort öffentlich auf der Startseite zeigen.
              </PPText>
            </View>
            <Toggle value={showcase} onChange={setShowcase} />
          </Card>
        )}
      </View>

      <SectionTitle title="Notiz (optional)" />
      <View style={{ paddingHorizontal: 20 }}>
        <Field label="Notiz" value={note} onChangeText={setNote} placeholder="Besonderheiten, Marke, …" />
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
        <PPButton icon="check" loading={busy} onPress={submit}>
          {isStaff ? 'Teil einstellen' : 'Vorschlag einreichen'}
        </PPButton>
      </View>
    </Screen>
  );
}
