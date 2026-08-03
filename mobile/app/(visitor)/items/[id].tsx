import { useState, useEffect } from 'react';
import { View, Image, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useItem, useCurrentUser } from '../../../lib/hooks/useData';
import { updateItem, setShowcase, archiveItem, approveItem } from '../../../lib/api';
import { itemThumb, groupLabel, typeLabel, conditionLabel } from '../../../lib/format';
import { pb } from '../../../lib/pb';
import {
  Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill, Toggle, Hint,
} from '../../../components/ui';

const CATEGORIES = [
  'damen-oberteil', 'damen-hose', 'damen-kleid', 'damen-schuhe',
  'herren-oberteil', 'herren-hose', 'herren-schuhe', 'kinder', 'accessoires', 'sonstiges',
];

export default function ItemDetail() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();

  // These screens live inside the tab navigator, so router.back() would pop to
  // the first tab (home) instead of the list we came from. Callers pass ?from=,
  // and we navigate there explicitly.
  const goBack = () => {
    if (from) router.replace(from as any);
    else if (router.canGoBack()) router.back();
    else router.replace('/(visitor)');
  };
  const { data: item, refetch } = useItem(id);
  const { data: me } = useCurrentUser();
  const isStaff = me?.role === 'volunteer' || me?.role === 'admin';

  const [title, setTitle] = useState('');
  const [size, setSize] = useState('');
  const [points, setPoints] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('sonstiges');
  const [staysExternal, setStaysExternal] = useState(false);
  const [showcase, setShow] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hydrate form once the item loads.
  useEffect(() => {
    if (!item) return;
    setTitle(item.title ?? '');
    setSize(item.size ?? '');
    setPoints(String(item.points ?? ''));
    setLocation(item.location ?? '');
    setCategory(item.category ?? 'sonstiges');
    setStaysExternal(!!item.stays_external);
    setShow(!!item.is_showcase);
  }, [item?.id]);

  if (!item) {
    return (
      <Screen padBottom={120}>
        <PPHeader subtitle="Teil" title="…" leading={<IconButton icon="chevron-left" onPress={goBack} />} />
      </Screen>
    );
  }

  // Read-only view for normal users — no editing, just the item as shown in the
  // shop. Staff fall through to the full editor below.
  if (!isStaff) {
    const uri = itemThumb(item);
    return (
      <Screen padBottom={120}>
        <PPHeader
          subtitle={item.sku}
          title={item.title}
          leading={<IconButton icon="chevron-left" onPress={goBack} />}
        />
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ height: 280, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(39,176,146,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            {uri ? (
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Icon name="shirt" size={48} color="rgba(39,176,146,0.5)" />
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 12 }}>
          <Card pad={16} style={{ gap: 14 }}>
            {/* Titel + Punkte */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <PPText weight="bold" size={PP.fontSizes.lg} color={PP.ink} style={{ flex: 1 }}>{item.title}</PPText>
              <Pill color={PP.teal} bg="rgba(39,176,146,0.12)">{item.points ?? 0} Punkte</Pill>
            </View>

            {/* Eigenschaften — klare Zeilen statt loser Pills. */}
            <View style={{ gap: 1, borderRadius: PP.rField, overflow: 'hidden' }}>
              {[
                { label: 'Für wen', value: groupLabel(item.category) },
                { label: 'Art', value: typeLabel(item.category) },
                { label: 'Größe', value: item.size },
                { label: 'Zustand', value: conditionLabel(item.condition) },
              ]
                .filter((r) => !!r.value)
                .map((r, i) => (
                  <View
                    key={r.label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: i % 2 === 0 ? 'rgba(26,46,44,0.035)' : 'transparent',
                    }}
                  >
                    <PPText size={PP.fontSizes.sm} color={PP.ink3}>{r.label}</PPText>
                    <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>{r.value}</PPText>
                  </View>
                ))}
            </View>

            {/* WICHTIG: item.location (Regal/Lagerplatz) ist INTERN und wird einem
                normalen Nutzer NIE gezeigt. Nur das Team sieht ihn im Editor. */}
            {!!item.note && (
              <PPText size={PP.fontSizes.sm} color={PP.ink2}>{item.note}</PPText>
            )}
          </Card>
          {item.stays_external ? (
            <Hint icon="map-pin" tone="info">
              Dieses Teil lagert extern — sprich uns im Laden an, wir stellen den Kontakt her.
            </Hint>
          ) : (
            <Hint icon="qr-scan" tone="info">
              Im Laden vorbeikommen und scannen, um es mitzunehmen.
            </Hint>
          )}
        </View>
      </Screen>
    );
  }

  const photoUri = newPhoto || itemThumb(item);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 5] });
    if (!res.canceled && res.assets[0]) setNewPhoto(res.assets[0].uri);
  };

  const done = async () => {
    await refetch();
    await qc.invalidateQueries({ queryKey: ['all_items'] });
    await qc.invalidateQueries({ queryKey: ['showcase'] });
    await qc.invalidateQueries({ queryKey: ['recent_items'] });
  };

  const save = async () => {
    setBusy(true);
    try {
      // Patch text fields via FormData if a new photo was chosen, else JSON.
      if (newPhoto) {
        const form = new FormData();
        form.append('title', title.trim());
        form.append('size', size.trim());
        form.append('points', String(parseInt(points, 10) || 0));
        form.append('location', location.trim());
        form.append('category', category);
        form.append('stays_external', staysExternal ? 'true' : 'false');
        const name = newPhoto.split('/').pop() || 'photo.jpg';
        const ext = (name.split('.').pop() || 'jpg').toLowerCase();
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        form.append('photo', { uri: newPhoto, name, type: mime } as any);
        await pb.collection('items').update(item.id, form);
      } else {
        await updateItem(item.id, {
          title: title.trim(),
          size: size.trim(),
          points: parseInt(points, 10) || 0,
          location: location.trim(),
          category,
          stays_external: staysExternal,
        });
      }
      setNewPhoto(null);
      await done();
      Alert.alert('Gespeichert', 'Änderungen übernommen.');
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte nicht speichern.');
    } finally {
      setBusy(false);
    }
  };

  const toggleShowcase = async (on: boolean) => {
    setShow(on);
    try { await setShowcase(item.id, on); await done(); } catch { setShow(!on); }
  };

  const doArchive = () => {
    Alert.alert('Archivieren?', `"${item.title}" archivieren?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Archivieren', style: 'destructive', onPress: async () => { await archiveItem(item.id); await done(); goBack(); } },
    ]);
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle={item.sku}
        title="Teil bearbeiten"
        leading={<IconButton icon="chevron-left" onPress={goBack} />}
      />

      <SectionTitle title="Foto" />
      <View style={{ paddingHorizontal: 20 }}>
        <Pressable onPress={pickPhoto}>
          <View style={{ height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(39,176,146,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Icon name="camera" size={32} color={PP.teal} />
            )}
          </View>
        </Pressable>
      </View>

      {item.status === 'pending' && (
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={{ backgroundColor: 'rgba(232,169,59,0.12)', borderRadius: PP.rField, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>Noch nicht freigegeben</PPText>
            </View>
            <PPButton size="s" fullWidth={false} onPress={async () => { await approveItem(item.id, false); await done(); }}>Freigeben</PPButton>
          </View>
        </View>
      )}

      <SectionTitle title="Details" />
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Field icon="shirt" label="Bezeichnung" value={title} onChangeText={setTitle} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Field label="Größe" value={size} onChangeText={setSize} /></View>
          <View style={{ flex: 1 }}><Field label="Punkte" value={points} onChangeText={setPoints} keyboardType="number-pad" /></View>
        </View>
        <Field icon="map-pin" label="Standort" value={location} onChangeText={setLocation} placeholder="z.B. Regal 3" />
      </View>

      <SectionTitle title="Kategorie" />
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)}>
            <Pill bg={category === c ? PP.teal : 'rgba(26,46,44,0.06)'} color={category === c ? '#fff' : PP.ink2}>{c}</Pill>
          </Pressable>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 12 }}>
        <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>Im Schaufenster</PPText>
          </View>
          <Toggle value={showcase} onChange={toggleShowcase} />
        </Card>
        <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>Wird extern gelagert</PPText>
          </View>
          <Toggle value={staysExternal} onChange={setStaysExternal} />
        </Card>
      </View>

      <SectionTitle title="QR-Code" />
      <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
        <Card pad={20} style={{ alignItems: 'center', gap: 10 }}>
          <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 12 }}>
            <QRCode value={item.qr_code || item.sku} size={160} color={PP.ink} backgroundColor="#fff" />
          </View>
          <PPText weight="semibold" size={PP.fontSizes.md} color={PP.ink}>{item.qr_code || item.sku}</PPText>
        </Card>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 10 }}>
        <PPButton icon="check" loading={busy} onPress={save}>Speichern</PPButton>
        <PPButton variant="ghost" onPress={doArchive}>Archivieren</PPButton>
      </View>
    </Screen>
  );
}
