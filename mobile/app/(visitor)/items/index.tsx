import { useState, useMemo, useCallback } from 'react';
import { View, Image, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';

import { PP, alpha } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useAllItems } from '../../../lib/hooks/useData';
import { setShowcase, archiveItem, approveItem } from '../../../lib/api';
import { itemThumb } from '../../../lib/format';
import { printQrSheet } from '../../../lib/qrsheet';
import { errorText } from '../../../lib/errors';
import { invalidateItems } from '../../../lib/queryClient';
import { Screen, PPHeader, PPText, Card, Pill, IconButton, PPButton } from '../../../components/ui';
import type { Item } from '../../../lib/types';

type Filter = 'all' | 'showcase' | 'pending' | 'external' | 'taken';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'showcase', label: 'Schaufenster' },
  { key: 'pending', label: 'Zu prüfen' },
  { key: 'external', label: 'Extern' },
  { key: 'taken', label: 'Vergeben' },
];

function statusPill(item: Item) {
  if (item.taken_at) return { label: 'vergeben', color: PP.ink2, bg: alpha(PP.ink, "subtle") };
  if (item.status === 'pending') return { label: 'zu prüfen', color: PP.warn, bg: alpha(PP.warn, "soft") };
  if (item.is_showcase) return { label: 'Schaufenster', color: PP.teal, bg: alpha(PP.teal, "soft") };
  if (item.status === 'archived') return { label: 'archiviert', color: PP.err, bg: alpha(PP.err, "subtle") };
  return { label: 'im Laden', color: PP.ink2, bg: alpha(PP.ink, "subtle") };
}

function ItemRow({ item, onChange, onOpen }: { item: Item; onChange: () => void; onOpen: () => void }) {
  const uri = itemThumb(item);
  const [busy, setBusy] = useState(false);
  const st = statusPill(item);
  const submitter = (item as any).expand?.created_by?.name as string | undefined;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onChange();
    } catch (e: any) {
      Alert.alert('Fehler', errorText(e, 'Aktion fehlgeschlagen.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card pad={12} style={{ gap: PP.space.md }}>
      <Pressable onPress={onOpen} style={{ flexDirection: 'row', gap: PP.space.md }}>
        <View
          style={{
            width: 70,
            height: 84,
            borderRadius: PP.rTile2,
            overflow: 'hidden',
            backgroundColor: alpha(PP.teal, "subtle"),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Icon name="shirt" size={PP.iconSizes.xl} color={alpha(PP.teal, 'veil')} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PPText weight="semibold" size="md" color={PP.ink} numberOfLines={1}>
            {item.title}
          </PPText>
          <PPText size="sm" color={PP.ink2} style={{ marginTop: 2 }}>
            {item.sku}{item.size ? ` · Gr. ${item.size}` : ''} · {item.points ?? 0} P
          </PPText>
          <View style={{ flexDirection: 'row', gap: PP.space.sm, marginTop: PP.space.sm, flexWrap: 'wrap' }}>
            <Pill size="s" color={st.color} bg={st.bg}>{st.label}</Pill>
            {item.stays_external && (
              <Pill size="s" icon="map-pin" color={PP.warn} bg={alpha(PP.warn, 'soft')}>extern</Pill>
            )}
          </View>
          {!!item.location && (
            <PPText size="xs" color={PP.ink3} style={{ marginTop: PP.space.xs }}>
              {item.location}{submitter ? ` · von ${submitter}` : ''}
            </PPText>
          )}
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ padding: PP.space.xs, backgroundColor: PP.surface, borderRadius: PP.rMicro }}>
            <QRCode value={item.qr_code || item.sku} size={48} color={PP.ink} backgroundColor={PP.onBrand} />
          </View>
          <Icon name="chevron-right" size={PP.iconSizes.sm} color={PP.ink3} />
        </View>
      </Pressable>

      {!item.taken_at && (
        // Hauptaktion mit Text, Archivieren als roter Icon-Button — bricht
        // auch bei großer Schrift nicht um.
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.sm }}>
          {item.status === 'pending' ? (
            <View style={{ flex: 1 }}>
              <PPButton size="s" icon="check" loading={busy} onPress={() => run(() => approveItem(item.id, false))}>
                Freigeben
              </PPButton>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <PPButton
                size="s"
                icon="star"
                variant={item.is_showcase ? 'secondary' : 'primary'}
                loading={busy}
                onPress={() => run(() => setShowcase(item.id, !item.is_showcase))}
              >
                {item.is_showcase ? 'Aus Schaufenster' : 'Ins Schaufenster'}
              </PPButton>
            </View>
          )}
          <IconButton icon="trash" tint={PP.err} bg={alpha(PP.err, 'soft')} loading={busy} onPress={() => run(() => archiveItem(item.id))} />
        </View>
      )}
    </Card>
  );
}

export default function ItemsInventory() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: items, refetch } = useAllItems();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const onChange = useCallback(async () => {
    await refetch();
    await invalidateItems(qc);
  }, [refetch, qc]);

  const filtered = useMemo(() => {
    const all = items ?? [];
    switch (filter) {
      case 'showcase':
        return all.filter((i) => i.is_showcase && !i.taken_at);
      case 'pending':
        return all.filter((i) => i.status === 'pending');
      case 'external':
        return all.filter((i) => i.stays_external && !i.taken_at);
      case 'taken':
        return all.filter((i) => !!i.taken_at);
      default:
        return all;
    }
  }, [items, filter]);

  // Etiketten für die gerade gefilterte Auswahl — sonst wären es bei „Alle"
  // schnell hunderte Seiten. Bereits mitgenommene Teile brauchen kein Etikett.
  const printSheet = useCallback(async () => {
    const list = filtered.filter((i) => !i.taken_at);
    if (!list.length) {
      Alert.alert('Nichts zu drucken', 'In dieser Auswahl gibt es keine Teile, die ein Etikett brauchen.');
      return;
    }
    setPrinting(true);
    try {
      const name = FILTERS.find((f) => f.key === filter)?.label ?? 'Teile';
      await printQrSheet(list, `${name} (${list.length})`);
    } catch (e: any) {
      Alert.alert('Fehler', errorText(e, 'Der Bogen konnte nicht erzeugt werden.'));
    } finally {
      setPrinting(false);
    }
  }, [filtered, filter]);

  return (
    <Screen padBottom={120} refreshing={refreshing} onRefresh={onRefresh}>
      <PPHeader
        subtitle="Inventar"
        title="Teile"
        trailing={<IconButton icon="plus" onPress={() => router.push('/(visitor)/items/new')} />}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PP.space.xl, gap: PP.space.sm, paddingBottom: PP.space.md }}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)}>
            <Pill bg={filter === f.key ? PP.teal : alpha(PP.ink, "subtle")} color={filter === f.key ? PP.onBrand : PP.ink2}>
              {f.label}
            </Pill>
          </Pressable>
        ))}
      </ScrollView>

      {/* Etiketten zum Anheften — das PDF geht in den Teilen-Dialog und von
          dort an den Drucker. */}
      {filtered.some((i) => !i.taken_at) && (
        <View style={{ paddingHorizontal: PP.space.xl, paddingBottom: PP.space.md }}>
          <PPButton size="s" variant="secondary" icon="tag" loading={printing} onPress={printSheet}>
            QR-Etiketten drucken
          </PPButton>
        </View>
      )}

      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
        {filtered.length ? (
          filtered.map((it) => (
            <ItemRow key={it.id} item={it} onChange={onChange} onOpen={() => router.push(`/(visitor)/items/${it.id}?from=/(visitor)/items`)} />
          ))
        ) : (
          <Card pad={16}>
            <PPText size="base" color={PP.ink2}>
              Keine Teile in dieser Ansicht.
            </PPText>
          </Card>
        )}
      </View>
    </Screen>
  );
}
