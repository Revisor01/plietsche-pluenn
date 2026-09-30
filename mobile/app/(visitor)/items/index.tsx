import { useState, useMemo, useCallback } from 'react';
import { View, Image, Pressable, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';

import { PP, alpha } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useAllItems, useCurrentUser } from '../../../lib/hooks/useData';
import { setShowcase, archiveItem, approveItem, restoreItem, deleteItem } from '../../../lib/api';
import { filterItems, isArchived, type InventoryFilter } from '../../../lib/itemState';
import { itemThumb } from '../../../lib/format';
import { printQrSheet } from '../../../lib/qrsheet';
import { errorText } from '../../../lib/errors';
import { invalidateItems } from '../../../lib/queryClient';
import { Screen, PPHeader, PPText, Card, Pill, IconButton, PPButton } from '../../../components/ui';
import type { Item } from '../../../lib/types';

const FILTERS: { key: InventoryFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'showcase', label: 'Schaufenster' },
  { key: 'pending', label: 'Zu prüfen' },
  { key: 'external', label: 'Extern' },
  { key: 'taken', label: 'Vergeben' },
  { key: 'archived', label: 'Archiv' },
];

function statusPill(item: Item) {
  // Archiv zuerst: ein archiviertes Teil ist aus dem Bestand, egal was es
  // vorher war.
  if (isArchived(item)) return { label: 'archiviert', color: PP.err, bg: alpha(PP.err, "subtle") };
  if (item.taken_at) return { label: 'vergeben', color: PP.ink2, bg: alpha(PP.ink, "subtle") };
  if (item.status === 'pending') return { label: 'zu prüfen', color: PP.warn, bg: alpha(PP.warn, "soft") };
  if (item.is_showcase) return { label: 'Schaufenster', color: PP.teal, bg: alpha(PP.teal, "soft") };
  return { label: 'im Laden', color: PP.ink2, bg: alpha(PP.ink, "subtle") };
}

function ItemRow({ item, isAdmin, onChange, onOpen }: { item: Item; isAdmin: boolean; onChange: () => void; onOpen: () => void }) {
  const uri = itemThumb(item);
  const [busy, setBusy] = useState(false);
  const st = statusPill(item);
  const submitter = item.expand?.created_by?.name;
  const archived = isArchived(item);

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

  const confirmDelete = () => {
    Alert.alert('Endgültig löschen?', `"${item.title}" wird mit Foto und QR-Code gelöscht. Das lässt sich nicht rückgängig machen.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => run(() => deleteItem(item.id)) },
    ]);
  };

  // Der Mülleimer archivierte früher ohne Rückfrage — und bei einem schon
  // archivierten Teil tat er gar nichts. Jetzt fragt er, was passieren soll;
  // Löschen darf nur ein Admin (items.deleteRule). Ein Dialog, kein zweiter
  // daraus heraus: verschachtelte Alerts gehen auf iOS gern verloren.
  const onTrash = () => {
    if (archived) {
      confirmDelete();
      return;
    }
    Alert.alert(
      `"${item.title}" entfernen?`,
      isAdmin
        ? 'Archivierte Teile lassen sich unter „Archiv" zurückholen. Endgültig Gelöschtes nicht.'
        : 'Archivierte Teile lassen sich unter „Archiv" zurückholen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Archivieren', onPress: () => run(() => archiveItem(item.id)) },
        ...(isAdmin
          ? [{ text: 'Endgültig löschen', style: 'destructive' as const, onPress: () => run(() => deleteItem(item.id)) }]
          : []),
      ],
    );
  };

  return (
    <Card pad={12} style={{ gap: PP.space.md }}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${st.label}`}
        style={{ flexDirection: 'row', gap: PP.space.md }}
      >
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
        </View>
      </Pressable>

      {(archived || !item.taken_at) && (
        // Hauptaktion mit Text, Entfernen als roter Icon-Button — bricht
        // auch bei großer Schrift nicht um.
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.sm }}>
          {archived ? (
            <View style={{ flex: 1 }}>
              <PPButton size="s" variant="secondary" icon="arrow-left" loading={busy} onPress={() => run(() => restoreItem(item))}>
                Zurückholen
              </PPButton>
            </View>
          ) : item.status === 'pending' ? (
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
                // Kräftig, solange das Teil im Schaufenster ist — die Farbe
                // markiert den Zustand, nicht die Aufforderung. Vorher war es
                // umgekehrt: Das kräftige Teal stand an den Teilen, die gerade
                // NICHT im Schaufenster sind.
                variant={item.is_showcase ? 'primary' : 'secondary'}
                loading={busy}
                onPress={() => run(() => setShowcase(item.id, !item.is_showcase))}
              >
                {item.is_showcase ? 'Aus Schaufenster' : 'Ins Schaufenster'}
              </PPButton>
            </View>
          )}
          {(!archived || isAdmin) && (
            <IconButton
              icon="trash"
              accessibilityLabel={archived ? `${item.title} endgültig löschen` : `${item.title} entfernen`}
              accessibilityHint={
                archived
                  ? 'Das Teil wird nach einer Rückfrage gelöscht.'
                  : isAdmin
                    ? 'Fragt, ob das Teil archiviert oder gelöscht werden soll.'
                    : 'Das Teil wird nach einer Rückfrage archiviert.'
              }
              tint={PP.err}
              bg={alpha(PP.err, 'soft')}
              loading={busy}
              onPress={onTrash}
            />
          )}
        </View>
      )}
    </Card>
  );
}

export default function ItemsInventory() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: items, refetch } = useAllItems();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === 'admin';
  const [filter, setFilter] = useState<InventoryFilter>('all');
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

  const filtered = useMemo(() => filterItems(items ?? [], filter), [items, filter]);

  // Archivierte und mitgenommene Teile brauchen kein Etikett.
  const needsLabel = (i: Item) => !i.taken_at && !isArchived(i);

  // Etiketten für die gerade gefilterte Auswahl — sonst wären es bei „Alle"
  // schnell hunderte Seiten. Bereits mitgenommene Teile brauchen kein Etikett.
  const printSheet = useCallback(async () => {
    const list = filtered.filter(needsLabel);
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
        trailing={<IconButton icon="plus" accessibilityLabel="Neues Teil anlegen" onPress={() => router.push('/(visitor)/items/new')} />}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PP.space.xl, gap: PP.space.sm, paddingBottom: PP.space.md }}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            accessibilityRole="button"
            accessibilityLabel={f.label}
            accessibilityState={{ selected: filter === f.key }}
            hitSlop={8}
          >
            <Pill bg={filter === f.key ? PP.teal : alpha(PP.ink, "subtle")} color={filter === f.key ? PP.onBrand : PP.ink2}>
              {f.label}
            </Pill>
          </Pressable>
        ))}
      </ScrollView>

      {/* Etiketten zum Anheften — das PDF geht in den Teilen-Dialog und von
          dort an den Drucker. */}
      {filtered.some(needsLabel) && (
        <View style={{ paddingHorizontal: PP.space.xl, paddingBottom: PP.space.md }}>
          <PPButton size="s" variant="secondary" icon="tag" loading={printing} onPress={printSheet}>
            QR-Etiketten drucken
          </PPButton>
        </View>
      )}

      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
        {filtered.length ? (
          filtered.map((it) => (
            <ItemRow key={it.id} item={it} isAdmin={isAdmin} onChange={onChange} onOpen={() => router.push(`/(visitor)/items/${it.id}?from=/(visitor)/items`)} />
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
