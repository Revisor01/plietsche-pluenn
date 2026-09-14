import { useState, useEffect } from 'react';
import { View, Image, Pressable, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';

import { PP, alpha } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useItem, useCurrentUser } from '../../../lib/hooks/useData';
import { useGoBack } from '../../../lib/hooks/useGoBack';
import { updateItem, setShowcase, archiveItem, approveItem } from '../../../lib/api';
import { itemThumb, groupLabel, typeLabel, conditionLabel } from '../../../lib/format';
import { pb } from '../../../lib/pb';
import { errorText } from '../../../lib/errors';
import { invalidateItems } from '../../../lib/queryClient';
import {
  Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill, Toggle, Hint,
} from '../../../components/ui';

const CATEGORIES = [
  'damen-oberteil', 'damen-hose', 'damen-kleid', 'damen-schuhe',
  'herren-oberteil', 'herren-hose', 'herren-schuhe', 'kinder', 'accessoires', 'sonstiges',
];

export default function ItemDetail() {
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useGoBack();
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
        <View style={{ paddingHorizontal: PP.space.xl }}>
          <View style={{ height: 280, borderRadius: PP.rTile, overflow: 'hidden', backgroundColor: alpha(PP.teal, "subtle"), alignItems: 'center', justifyContent: 'center' }}>
            {uri ? (
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Icon name="shirt" size={PP.iconSizes.hero} color={alpha(PP.teal, 'veil')} />
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: PP.space.xl, marginTop: PP.space.lg, gap: PP.space.md }}>
          <Card pad={16} style={{ gap: PP.space.lg }}>
            {/* Titel + Punkte */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: PP.space.md }}>
              <PPText weight="bold" size="lg" color={PP.ink} style={{ flex: 1 }}>{item.title}</PPText>
              <Pill color={PP.teal} bg={alpha(PP.teal, 'soft')}>{item.points ?? 0} Punkte</Pill>
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
                      paddingVertical: PP.space.md,
                      paddingHorizontal: PP.space.md,
                      backgroundColor: i % 2 === 0 ? alpha(PP.ink, "ghost") : 'transparent',
                    }}
                  >
                    <PPText size="sm" color={PP.ink3}>{r.label}</PPText>
                    <PPText weight="semibold" size="base" color={PP.ink}>{r.value}</PPText>
                  </View>
                ))}
            </View>

            {/* WICHTIG: item.location (Regal/Lagerplatz) ist INTERN und wird einem
                normalen Nutzer NIE gezeigt. Nur das Team sieht ihn im Editor. */}
            {!!item.note && (
              <PPText size="sm" color={PP.ink2}>{item.note}</PPText>
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
    await invalidateItems(qc);
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
      Alert.alert('Fehler', errorText(e, 'Konnte nicht speichern.'));
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
      <View style={{ paddingHorizontal: PP.space.xl }}>
        <Pressable onPress={pickPhoto}>
          <View style={{ height: 200, borderRadius: PP.rTile, overflow: 'hidden', backgroundColor: alpha(PP.teal, "subtle"), alignItems: 'center', justifyContent: 'center' }}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <Icon name="camera" size={PP.iconSizes.xl} color={PP.teal} />
            )}
          </View>
        </Pressable>
      </View>

      {item.status === 'pending' && (
        <View style={{ paddingHorizontal: PP.space.xl, marginTop: PP.space.md }}>
          <View style={{ backgroundColor: alpha(PP.warn, "soft"), borderRadius: PP.rField, padding: PP.space.md, flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
            <View style={{ flex: 1 }}>
              <PPText weight="semibold" size="base" color={PP.ink}>Noch nicht freigegeben</PPText>
            </View>
            <PPButton size="s" fullWidth={false} onPress={async () => { await approveItem(item.id, false); await done(); }}>Freigeben</PPButton>
          </View>
        </View>
      )}

      <SectionTitle title="Details" />
      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
        <Field icon="shirt" label="Bezeichnung" value={title} onChangeText={setTitle} />
        <View style={{ flexDirection: 'row', gap: PP.space.md }}>
          <View style={{ flex: 1 }}><Field label="Größe" value={size} onChangeText={setSize} /></View>
          <View style={{ flex: 1 }}><Field label="Punkte" value={points} onChangeText={setPoints} keyboardType="number-pad" /></View>
        </View>
        <Field icon="map-pin" label="Standort" value={location} onChangeText={setLocation} placeholder="z.B. Regal 3" />
      </View>

      <SectionTitle title="Kategorie" />
      <View style={{ paddingHorizontal: PP.space.xl, flexDirection: 'row', flexWrap: 'wrap', gap: PP.space.sm }}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)}>
            <Pill bg={category === c ? PP.teal : alpha(PP.ink, "subtle")} color={category === c ? PP.onBrand : PP.ink2}>{c}</Pill>
          </Pressable>
        ))}
      </View>

      <View style={{ paddingHorizontal: PP.space.xl, marginTop: PP.space.lg, gap: PP.space.md }}>
        <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
          <View style={{ flex: 1 }}>
            <PPText weight="semibold" size="base" color={PP.ink}>Im Schaufenster</PPText>
          </View>
          <Toggle value={showcase} onChange={toggleShowcase} />
        </Card>
        <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
          <View style={{ flex: 1 }}>
            <PPText weight="semibold" size="base" color={PP.ink}>Wird extern gelagert</PPText>
          </View>
          <Toggle value={staysExternal} onChange={setStaysExternal} />
        </Card>
      </View>

      <SectionTitle title="QR-Code" />
      <View style={{ paddingHorizontal: PP.space.xl, alignItems: 'center' }}>
        <Card pad={20} style={{ alignItems: 'center', gap: PP.space.md }}>
          <View style={{ padding: PP.space.md, backgroundColor: PP.surface, borderRadius: PP.rTile2 }}>
            <QRCode value={item.qr_code || item.sku} size={160} color={PP.ink} backgroundColor={PP.onBrand} />
          </View>
          <PPText weight="semibold" size="md" color={PP.ink}>{item.qr_code || item.sku}</PPText>
        </Card>
      </View>

      <View style={{ paddingHorizontal: PP.space.xl, marginTop: PP.space.xxl, gap: PP.space.md }}>
        <PPButton icon="check" loading={busy} onPress={save}>Speichern</PPButton>
        <PPButton variant="ghost" onPress={doArchive}>Archivieren</PPButton>
      </View>
    </Screen>
  );
}
