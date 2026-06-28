import { useState, useMemo, useCallback } from 'react';
import { View, Image, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useAllItems } from '../../../lib/hooks/useData';
import { setShowcase, archiveItem, approveItem } from '../../../lib/api';
import { itemThumb } from '../../../lib/format';
import { Screen, PPHeader, PPText, Card, Pill, IconButton, PPButton } from '../../../components/ui';
import type { Item } from '../../../lib/types';

type Filter = 'all' | 'showcase' | 'pending' | 'taken';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'showcase', label: 'Schaufenster' },
  { key: 'pending', label: 'Zu prüfen' },
  { key: 'taken', label: 'Vergeben' },
];

function statusPill(item: Item) {
  if (item.taken_at) return { label: 'vergeben', color: PP.ink2, bg: 'rgba(26,46,44,0.08)' };
  if (item.status === 'pending') return { label: 'zu prüfen', color: PP.warn, bg: 'rgba(232,169,59,0.14)' };
  if (item.is_showcase) return { label: 'Schaufenster', color: PP.teal, bg: 'rgba(39,176,146,0.12)' };
  if (item.status === 'archived') return { label: 'archiviert', color: PP.err, bg: 'rgba(217,83,79,0.10)' };
  return { label: 'im Laden', color: PP.ink2, bg: 'rgba(26,46,44,0.06)' };
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
      Alert.alert('Fehler', e?.message ?? 'Aktion fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card pad={12} style={{ gap: 10 }}>
      <Pressable onPress={onOpen} style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            width: 70,
            height: 84,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: 'rgba(39,176,146,0.10)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Icon name="shirt" size={26} color="rgba(39,176,146,0.5)" />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PPText weight="semibold" size={PP.fontSizes.md} color={PP.ink} numberOfLines={1}>
            {item.title}
          </PPText>
          <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 2 }}>
            {item.sku}{item.size ? ` · Gr. ${item.size}` : ''} · {item.points ?? 0} P
          </PPText>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <Pill size="s" color={st.color} bg={st.bg}>{st.label}</Pill>
            {item.stays_external && (
              <Pill size="s" icon="map-pin" color={PP.warn} bg="rgba(232,169,59,0.14)">extern</Pill>
            )}
          </View>
          {!!item.location && (
            <PPText size={PP.fontSizes.xs} color={PP.ink3} style={{ marginTop: 4 }}>
              {item.location}{submitter ? ` · von ${submitter}` : ''}
            </PPText>
          )}
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ padding: 5, backgroundColor: '#fff', borderRadius: 7 }}>
            <QRCode value={item.qr_code || item.sku} size={48} color={PP.ink} backgroundColor="#fff" />
          </View>
          <Icon name="chevron-right" size={16} color={PP.ink3} />
        </View>
      </Pressable>

      {!item.taken_at && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {item.status === 'pending' ? (
            <View style={{ flex: 1 }}>
              <PPButton size="s" loading={busy} onPress={() => run(() => approveItem(item.id, false))}>
                Freigeben
              </PPButton>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <PPButton
                size="s"
                variant={item.is_showcase ? 'secondary' : 'primary'}
                loading={busy}
                onPress={() => run(() => setShowcase(item.id, !item.is_showcase))}
              >
                {item.is_showcase ? 'Aus Schaufenster' : 'Ins Schaufenster'}
              </PPButton>
            </View>
          )}
          <PPButton size="s" variant="ghost" fullWidth={false} loading={busy} onPress={() => run(() => archiveItem(item.id))}>
            Archivieren
          </PPButton>
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const onChange = useCallback(async () => {
    await refetch();
    await qc.invalidateQueries({ queryKey: ['showcase'] });
    await qc.invalidateQueries({ queryKey: ['pending_items'] });
  }, [refetch, qc]);

  const filtered = useMemo(() => {
    const all = items ?? [];
    switch (filter) {
      case 'showcase':
        return all.filter((i) => i.is_showcase && !i.taken_at);
      case 'pending':
        return all.filter((i) => i.status === 'pending');
      case 'taken':
        return all.filter((i) => !!i.taken_at);
      default:
        return all;
    }
  }, [items, filter]);

  return (
    <Screen padBottom={120} refreshing={refreshing} onRefresh={onRefresh}>
      <PPHeader
        subtitle="Inventar"
        title="Teile"
        trailing={<IconButton icon="plus" onPress={() => router.push('/(visitor)/items/new')} />}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingBottom: 12 }}>
        {FILTERS.map((f) => (
          <Pressable key={f.key} onPress={() => setFilter(f.key)}>
            <Pill bg={filter === f.key ? PP.teal : 'rgba(26,46,44,0.06)'} color={filter === f.key ? '#fff' : PP.ink2}>
              {f.label}
            </Pill>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {filtered.length ? (
          filtered.map((it) => (
            <ItemRow key={it.id} item={it} onChange={onChange} onOpen={() => router.push(`/(visitor)/items/${it.id}`)} />
          ))
        ) : (
          <Card pad={16}>
            <PPText size={PP.fontSizes.base} color={PP.ink2}>
              Keine Teile in dieser Ansicht.
            </PPText>
          </Card>
        )}
      </View>
    </Screen>
  );
}
