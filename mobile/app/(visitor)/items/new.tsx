import { useState } from 'react';
import { View, Pressable, Image, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useCurrentUser } from '../../../lib/hooks/useData';
import { createItem } from '../../../lib/api';
import { CATEGORY_GROUPS, CATEGORY_TYPES, GROUPS_WITH_TYPE } from '../../../lib/format';
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
  Hint,
} from '../../../components/ui';

const CONDITIONS: { key: string; label: string }[] = [
  { key: 'neu', label: 'Neu' },
  { key: 'sehr-gut', label: 'Sehr gut' },
  { key: 'gut', label: 'Gut' },
  { key: 'gebraucht', label: 'Gebraucht' },
];

export default function NewItem() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isStaff = user?.role === 'volunteer' || user?.role === 'admin';

  const [title, setTitle] = useState('');
  // Kategorie = Gruppe (+ optionale Art bei Damen/Herren). Zusammengesetzt zum
  // gespeicherten category-Key "<group>" oder "<group>-<type>".
  const [group, setGroup] = useState('sonstiges');
  const [type, setType] = useState<string | null>(null);
  const category = group && GROUPS_WITH_TYPE.includes(group) && type ? `${group}-${type}` : group;
  const [condition, setCondition] = useState('gut');
  const [size, setSize] = useState('');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const [destination, setDestination] = useState<'store' | 'mine' | null>(null);
  const staysExternal = destination === 'mine';
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
    if (destination === null) {
      Alert.alert('Fehlt noch', 'Bitte wähle, wohin das Teil kommt.');
      return;
    }
    if (destination === 'mine' && location.trim() === '') {
      Alert.alert('Standort fehlt', 'Bitte gib an, wo das Teil bei dir zu finden ist.');
      return;
    }
    // Standort nur übernehmen, wenn er im Formular auch erfasst wurde:
    // bei "verbleibt bei mir" (Abholadresse) oder Staff im Laden (Regalplatz).
    const locationToSave =
      destination === 'mine' || (isStaff && destination === 'store') ? location.trim() || undefined : undefined;

    setBusy(true);
    try {
      await createItem({
        title: title.trim(),
        category,
        condition,
        size: size.trim() || undefined,
        note: note.trim() || undefined,
        location: locationToSave,
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
          <Hint icon="info" tone="warn">
            Dein Vorschlag wird von einem Helfer geprüft und dann freigegeben.
          </Hint>
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

      <SectionTitle title="Für wen" />
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CATEGORY_GROUPS.map((g) => (
          <Pressable
            key={g.key}
            onPress={() => { setGroup(g.key); if (!GROUPS_WITH_TYPE.includes(g.key)) setType(null); }}
          >
            <Pill bg={group === g.key ? PP.teal : 'rgba(26,46,44,0.06)'} color={group === g.key ? '#fff' : PP.ink2}>
              {g.label}
            </Pill>
          </Pressable>
        ))}
      </View>

      {GROUPS_WITH_TYPE.includes(group) && (
        <>
          <SectionTitle title="Art" />
          <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORY_TYPES.map((t) => (
              <Pressable key={t.key} onPress={() => setType(t.key)}>
                <Pill bg={type === t.key ? PP.teal : 'rgba(26,46,44,0.06)'} color={type === t.key ? '#fff' : PP.ink2}>
                  {t.label}
                </Pill>
              </Pressable>
            ))}
          </View>
        </>
      )}

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

      <SectionTitle title="Wohin kommt das Teil?" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setDestination('store')}>
            <View
              style={{
                minHeight: 112,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingHorizontal: 12,
                borderRadius: PP.rCard,
                backgroundColor: destination === 'store' ? PP.teal : '#fff',
                ...PP.shadowCard,
              }}
            >
              <Icon name="house" size={26} color={destination === 'store' ? '#fff' : PP.teal} />
              <PPText
                weight="semibold"
                size={PP.fontSizes.base}
                color={destination === 'store' ? '#fff' : PP.ink}
                style={{ textAlign: 'center' }}
              >
                Bringe ich in den Laden
              </PPText>
            </View>
          </Pressable>

          <Pressable style={{ flex: 1 }} onPress={() => setDestination('mine')}>
            <View
              style={{
                minHeight: 112,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingHorizontal: 12,
                borderRadius: PP.rCard,
                backgroundColor: destination === 'mine' ? PP.teal : '#fff',
                ...PP.shadowCard,
              }}
            >
              <Icon name="map-pin" size={26} color={destination === 'mine' ? '#fff' : PP.teal} />
              <PPText
                weight="semibold"
                size={PP.fontSizes.base}
                color={destination === 'mine' ? '#fff' : PP.ink}
                style={{ textAlign: 'center' }}
              >
                Verbleibt bei mir
              </PPText>
            </View>
          </Pressable>
        </View>

        {/* Standort nur, wenn das Teil beim Besitzer bleibt (Abhol-Adresse, Pflicht)
            oder wenn das Team einstellt (interner Regalplatz). Bringt ein Besucher
            das Teil selbst in den Laden, gibt es KEIN Standortfeld. */}
        {destination === 'mine' && (
          <Field
            icon="map-pin"
            label="Wo ist das Teil abzuholen? (Pflicht)"
            value={location}
            onChangeText={setLocation}
            placeholder="z.B. bei Fam. Meyer, Hauptstr. 1"
          />
        )}
        {isStaff && destination === 'store' && (
          <Field
            icon="map-pin"
            label="Regalplatz (optional, intern)"
            value={location}
            onChangeText={setLocation}
            placeholder="z.B. Regal 3"
          />
        )}

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
