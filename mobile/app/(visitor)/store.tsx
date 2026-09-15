import { useState, useMemo, useCallback } from 'react';
import { View, Image, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PP, alpha } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { useStoreItems } from '../../lib/hooks/useData';
import {
  itemThumb,
  CATEGORY_GROUPS as GROUPS,
  CATEGORY_TYPES as TYPES,
  GROUPS_WITH_TYPE,
  categoryGroup as groupOf,
  categoryType as typeOf,
} from '../../lib/format';
import { Screen, PPHeader, PPText, Card, PPButton } from '../../components/ui';
import type { Item } from '../../lib/types';

// "Neu" = in den letzten 14 Tagen eingestellt (Feld `created`).
//
// Die Startseite ("Neu im Laden", useRecentItems) nimmt stattdessen eine feste
// Anzahl der zuletzt eingestellten Teile. Das passt dort, weil der Abschnitt eine
// Zeile mit fester Breite füllt — er soll nie leer und nie endlos sein.
// Ein Filter kann das nicht übernehmen: "die neuesten sechs" wäre unabhängig davon,
// ob sie von gestern oder aus dem Frühjahr stammen, und ließe sich mit Größe oder
// Kategorie nicht sinnvoll kombinieren. Deshalb hier ein Zeitraum.
// 14 Tage, weil der Laden nicht täglich geöffnet ist: Wer alle zwei Wochen
// vorbeikommt, soll genau das sehen, was seit dem letzten Besuch dazugekommen ist.
const NEW_DAYS = 14;

// Image-forward grid card — the photo is the hero, text sits below.
function StoreCard({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const uri = itemThumb(item);
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={{ flex: 1 }}
    >
      <View
        style={{
          width: '100%',
          aspectRatio: 4 / 5,
          borderRadius: PP.rTile,
          overflow: 'hidden',
          backgroundColor: alpha(PP.teal, "subtle"),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Icon name="shirt" size={PP.iconSizes.hero} color={alpha(PP.teal, 'veil')} />
        )}
        {item.stays_external && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: PP.space.xs,
              paddingVertical: PP.space.xs,
              paddingHorizontal: PP.space.sm,
              borderRadius: PP.rTile2,
              backgroundColor: PP.onBrandMuted,
            }}
          >
            <Icon name="map-pin" size={PP.iconSizes.xs} color={PP.warn} />
            <PPText weight="semibold" size="xs" color={PP.ink}>
              extern gelagert
            </PPText>
          </View>
        )}
      </View>
      <PPText weight="semibold" size="base" color={PP.ink} style={{ marginTop: PP.space.sm }} numberOfLines={1}>
        {item.title}
      </PPText>
      <PPText size="sm" color={PP.ink2} style={{ marginTop: 1 }}>
        {item.size ? `Gr. ${item.size} · ` : ''}{item.points ?? 0} P
      </PPText>
    </Pressable>
  );
}

// A labelled row of selectable options inside the filter sheet.
function FilterRow({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: { key: string; label: string }[];
  value: string | null;
  onSelect: (key: string | null) => void;
}) {
  return (
    <View style={{ gap: PP.space.sm }}>
      <PPText weight="semibold" size="xs" color={PP.ink3} style={{ letterSpacing: PP.tracking.label }}>
        {title.toUpperCase()}
      </PPText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: PP.space.sm }}>
        {/* Mehrere Zeilen haben ein "Alle" — für die Sprachausgabe die Zeile dazusagen. */}
        <SelectChip
          label="Alle"
          a11yLabel={`Alle — ${title}`}
          active={value === null}
          onPress={() => onSelect(null)}
        />
        {options.map((o) => (
          <SelectChip key={o.key} label={o.label} active={value === o.key} onPress={() => onSelect(o.key)} />
        ))}
      </View>
    </View>
  );
}

function SelectChip({
  label,
  a11yLabel,
  active,
  onPress,
}: {
  label: string;
  a11yLabel?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected: active }}
      // Die Chips sind rund 36 pt hoch — knapp unter der empfohlenen Trefferfläche.
      // hitSlop nur vertikal, damit nebeneinanderliegende Chips sich nicht überlappen.
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        paddingVertical: PP.space.sm,
        paddingHorizontal: PP.space.lg,
        borderRadius: PP.rTile2,
        backgroundColor: active ? PP.teal : alpha(PP.ink, "ghost"),
        borderWidth: 1,
        borderColor: active ? PP.teal : alpha(PP.ink, "subtle"),
      }}
    >
      <PPText weight={active ? 'semibold' : 'medium'} size="base" color={active ? PP.onBrand : PP.ink}>
        {label}
      </PPText>
    </Pressable>
  );
}

export default function Store() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: items, refetch } = useStoreItems();
  const [refreshing, setRefreshing] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  // Aufbewahrung: im Laden vs. extern gelagert (große Teile bleiben bei der einreichenden Person).
  const [loc, setLoc] = useState<string | null>(null);
  // "Neu" und "Schaufenster" sind eigene Zeilen statt Optionen der Aufbewahrungs-Zeile:
  // Aufbewahrung beantwortet "wo liegt das Teil" und ist damit eine andere Frage. Wer
  // "Schaufenster" in dieselbe Zeile packt, schließt außerdem "Im Laden + Schaufenster" aus,
  // obwohl sich beides kombinieren lässt. Zwei eigene Ja/Nein-Zeilen bleiben kombinierbar.
  const [showcase, setShowcase] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Sizes available within the current group/type selection (so the size list
  // is never cluttered with sizes that can't be reached).
  const sizes = useMemo(() => {
    const set = new Set<string>();
    for (const it of items ?? []) {
      if (group && groupOf(it.category) !== group) continue;
      if (type && typeOf(it.category) !== type) continue;
      if (it.size) set.add(it.size);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  }, [items, group, type]);

  const filtered = useMemo(() => {
    const freshSince = Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000;
    return (items ?? []).filter((it) => {
      if (group && groupOf(it.category) !== group) return false;
      if (type && typeOf(it.category) !== type) return false;
      if (size && it.size !== size) return false;
      if (loc === 'store' && it.stays_external) return false;
      if (loc === 'external' && !it.stays_external) return false;
      if (showcase === 'only' && !it.is_showcase) return false;
      if (fresh === 'only') {
        const at = Date.parse(it.created);
        if (!Number.isFinite(at) || at < freshSince) return false;
      }
      return true;
    });
  }, [items, group, type, size, loc, showcase, fresh]);

  // Reset type/size when leaving a group that supported them.
  const selectGroup = (g: string | null) => {
    setGroup(g);
    if (!g || !GROUPS_WITH_TYPE.includes(g)) setType(null);
    setSize(null);
  };

  const activeCount = [group, type, size, loc, showcase, fresh].filter((v) => v !== null).length;
  const showType = group !== null && GROUPS_WITH_TYPE.includes(group);

  const sizeOptions = sizes.map((s) => ({ key: s, label: s }));

  return (
    <Screen padBottom={120} refreshing={refreshing} onRefresh={onRefresh}>
      <PPHeader
        subtitle="Im Laden"
        title="Alles im Laden"
        trailing={
          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={activeCount > 0 ? `Filter, ${activeCount} aktiv` : 'Filter'}
            accessibilityHint="Öffnet die Filterauswahl."
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: PP.space.sm,
              paddingVertical: PP.space.sm,
              paddingHorizontal: PP.space.lg,
              borderRadius: PP.rTile2,
              backgroundColor: activeCount > 0 ? PP.teal : alpha(PP.ink, "ghost"),
            }}
          >
            <Icon name="filter" size={PP.iconSizes.sm} color={activeCount > 0 ? PP.onBrand : PP.ink2} />
            <PPText weight="semibold" size="sm" color={activeCount > 0 ? PP.onBrand : PP.ink2}>
              Filter{activeCount > 0 ? ` (${activeCount})` : ''}
            </PPText>
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: PP.space.xl }}>
        {filtered.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: PP.space.lg }}>
            {filtered.map((it) => (
              <View key={it.id} style={{ width: '47%', flexGrow: 1 }}>
                <StoreCard item={it} onOpen={() => router.push(`/(visitor)/items/${it.id}?from=/(visitor)/store`)} />
              </View>
            ))}
            {filtered.length % 2 === 1 && <View style={{ width: '47%', flexGrow: 1 }} />}
          </View>
        ) : (
          <Card pad={16}>
            <PPText size="base" color={PP.ink2}>
              Keine Teile in dieser Ansicht.
            </PPText>
          </Card>
        )}
      </View>

      {/* Filter sheet */}
      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{ flex: 1, backgroundColor: alpha(PP.inkDeep, "veil") }}
            onPress={() => setSheetOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Filter schließen"
          />
          <View
            style={{
              backgroundColor: PP.bg,
              borderTopLeftRadius: PP.rSheet,
              borderTopRightRadius: PP.rSheet,
              paddingHorizontal: PP.space.xxl,
              paddingTop: PP.space.md,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              gap: PP.space.xxl,
              ...PP.shadowCard,
            }}
          >
            {/* Grabber */}
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: alpha(PP.ink, "medium") }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <PPText weight="bold" size="xl" color={PP.ink} style={{ letterSpacing: PP.tracking.title }}>
                Filter
              </PPText>
              <Pressable
                onPress={() => setSheetOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Filter schließen"
                hitSlop={10}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: alpha(PP.ink, "ghost"), alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="x" size={PP.iconSizes.sm} color={PP.ink2} />
              </Pressable>
            </View>

            <FilterRow
              title="Neu"
              options={[{ key: 'only', label: `Neu (${NEW_DAYS} Tage)` }]}
              value={fresh}
              onSelect={setFresh}
            />

            <FilterRow
              title="Schaufenster"
              options={[{ key: 'only', label: 'Nur Schaufenster' }]}
              value={showcase}
              onSelect={setShowcase}
            />

            <FilterRow title="Für wen" options={GROUPS} value={group} onSelect={selectGroup} />

            {showType && (
              <FilterRow title="Art" options={TYPES} value={type} onSelect={setType} />
            )}

            {sizeOptions.length > 0 && (
              <FilterRow title="Größe" options={sizeOptions} value={size} onSelect={setSize} />
            )}

            <FilterRow
              title="Aufbewahrung"
              options={[
                { key: 'store', label: 'Im Laden' },
                { key: 'external', label: 'Extern' },
              ]}
              value={loc}
              onSelect={setLoc}
            />

            <View style={{ flexDirection: 'row', gap: PP.space.md, marginTop: 2 }}>
              {activeCount > 0 && (
                <PPButton
                  size="m"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => { setGroup(null); setType(null); setSize(null); setLoc(null); setShowcase(null); setFresh(null); }}
                >
                  Zurücksetzen
                </PPButton>
              )}
              <View style={{ flex: 1 }}>
                <PPButton size="m" onPress={() => setSheetOpen(false)}>
                  {filtered.length} {filtered.length === 1 ? 'Teil' : 'Teile'} zeigen
                </PPButton>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
