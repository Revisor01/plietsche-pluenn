import { useState, useMemo, useCallback } from 'react';
import { View, Image, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

import { PP } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { useStoreItems } from '../../lib/hooks/useData';
import { itemThumb } from '../../lib/format';
import { Screen, PPHeader, PPText, Card, Pill } from '../../components/ui';
import type { Item } from '../../lib/types';

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

function StoreCard({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const uri = itemThumb(item);
  return (
    <Card pad={12}>
      <Pressable onPress={onOpen} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View
          style={{
            width: 64,
            height: 78,
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
            <Icon name="shirt" size={24} color="rgba(39,176,146,0.5)" />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <PPText weight="semibold" size={PP.fontSizes.md} color={PP.ink} numberOfLines={1}>
            {item.title}
          </PPText>
          <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 2 }}>
            {item.size ? `Gr. ${item.size} · ` : ''}{item.points ?? 0} P
          </PPText>
        </View>
        <Icon name="chevron-right" size={18} color={PP.ink3} />
      </Pressable>
    </Card>
  );
}

export default function Store() {
  const router = useRouter();
  const { data: items, refetch } = useStoreItems();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    for (const it of items ?? []) {
      if (it.size) set.add(it.size);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  }, [items]);

  const filtered = useMemo(() => {
    return (items ?? []).filter((it) => {
      if (selectedCategory && it.category !== selectedCategory) return false;
      if (selectedSize && it.size !== selectedSize) return false;
      return true;
    });
  }, [items, selectedCategory, selectedSize]);

  return (
    <Screen padBottom={120} refreshing={refreshing} onRefresh={onRefresh}>
      <PPHeader subtitle="Im Laden" title="Alles im Laden" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingBottom: 12 }}>
        <Pressable onPress={() => setSelectedCategory(null)}>
          <Pill bg={selectedCategory === null ? PP.teal : 'rgba(26,46,44,0.06)'} color={selectedCategory === null ? '#fff' : PP.ink2}>
            Alle
          </Pill>
        </Pressable>
        {CATEGORIES.map((c) => (
          <Pressable key={c.key} onPress={() => setSelectedCategory(c.key)}>
            <Pill bg={selectedCategory === c.key ? PP.teal : 'rgba(26,46,44,0.06)'} color={selectedCategory === c.key ? '#fff' : PP.ink2}>
              {c.label}
            </Pill>
          </Pressable>
        ))}
      </ScrollView>

      {sizes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingBottom: 12 }}>
          <Pressable onPress={() => setSelectedSize(null)}>
            <Pill bg={selectedSize === null ? PP.teal : 'rgba(26,46,44,0.06)'} color={selectedSize === null ? '#fff' : PP.ink2}>
              Alle Größen
            </Pill>
          </Pressable>
          {sizes.map((s) => (
            <Pressable key={s} onPress={() => setSelectedSize(s)}>
              <Pill bg={selectedSize === s ? PP.teal : 'rgba(26,46,44,0.06)'} color={selectedSize === s ? '#fff' : PP.ink2}>
                {s}
              </Pill>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {filtered.length ? (
          filtered.map((it) => (
            <StoreCard key={it.id} item={it} onOpen={() => router.push(`/(visitor)/items/${it.id}`)} />
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
