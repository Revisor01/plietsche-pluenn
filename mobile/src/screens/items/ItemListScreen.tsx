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
import { colors, fonts, spacing, borderRadius } from '../../theme';

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
      <View style={[styles.colorDot, { backgroundColor: item.color ?? colors.border }]} />
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
        placeholderTextColor={colors.textLight}
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
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchItems(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>Keine Items gefunden</Text>}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchInput: {
    margin: spacing.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  filterRow: { paddingHorizontal: spacing.md, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary },
  chipTextSelected: { color: colors.white, fontFamily: fonts.medium },
  loader: { marginTop: 40 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.text },
  itemMeta: { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.md,
    backgroundColor: '#D1FAE5',
  },
  statusTaken: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary },
  emptyText: { fontFamily: fonts.regular, color: colors.textSecondary, fontSize: 16, textAlign: 'center' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
});
