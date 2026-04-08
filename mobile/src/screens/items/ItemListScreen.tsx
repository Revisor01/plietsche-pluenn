import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { listItems, type ItemRow } from '../../api/items.api';

const CATEGORY_FILTERS = ['Alle', 'Oberteil', 'Hose', 'Jacke', 'Schuhe', 'Kleid', 'Accessoire'];
const STATUS_FILTERS = ['Alle', 'active', 'taken'];

function ScrollableChipFilter({
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <FlatList
      horizontal
      data={options}
      keyExtractor={(o) => o}
      showsHorizontalScrollIndicator={false}
      style={styles.filterRow}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.chip, selected === item && styles.chipSelected]}
          onPress={() => onSelect(item)}
        >
          <Text style={[styles.chipText, selected === item && styles.chipTextSelected]}>{item}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

export default function ItemListScreen() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Alle');
  const [status, setStatus] = useState('Alle');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchItems = useCallback(
    async (refreshing = false) => {
      if (refreshing) { setIsRefreshing(true); }
      else { setIsLoading(true); }
      try {
        const result = await listItems({
          category: category !== 'Alle' ? category : undefined,
          status: status !== 'Alle' ? (status as 'active' | 'taken') : undefined,
          search: search.trim() || undefined,
        });
        setItems(result.items);
      } catch (err) {
        console.error('listItems error', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [category, status, search],
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const renderItem = ({ item }: { item: ItemRow }) => (
    <View style={styles.itemRow}>
      <View style={[styles.colorDot, { backgroundColor: item.color ?? '#D1D5DB' }]} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemMeta}>
          {item.category}
          {item.size ? ` · ${item.size}` : ''}
        </Text>
      </View>
      <View style={[styles.statusBadge, item.status === 'taken' && styles.statusTaken]}>
        <Text style={styles.statusText}>{item.status === 'taken' ? 'Mitgenommen' : 'Verfügbar'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Suchen..."
        placeholderTextColor="#9CA3AF"
        returnKeyType="search"
        onSubmitEditing={() => fetchItems()}
      />

      <ScrollableChipFilter
        label="Kategorie"
        options={CATEGORY_FILTERS}
        selected={category}
        onSelect={setCategory}
      />
      <ScrollableChipFilter
        label="Status"
        options={STATUS_FILTERS}
        selected={status}
        onSelect={setStatus}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchItems(true)} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Keine Items gefunden</Text>}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchInput: {
    margin: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  filterRow: { paddingHorizontal: 12, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextSelected: { color: '#FFFFFF' },
  loader: { marginTop: 40 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  statusTaken: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '500', color: '#374151' },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 16 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
});
