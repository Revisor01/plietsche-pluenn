import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { fetchHistory, type PointTransaction } from '../../api/points.api';
import { colors, fonts, spacing } from '../../theme';

const SOURCE_LABELS: Record<string, string> = {
  item_scan: 'QR-Scan',
  checkin: 'Check-In',
  manual_items: 'Teile mitgenommen',
};

export default function PointsHistoryScreen() {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = async (refreshing = false) => {
    refreshing ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const { transactions: txs } = await fetchHistory();
      setTransactions(txs);
    } catch {
      /* stille Fehlerbehandlung */
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: PointTransaction }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.source}>{SOURCE_LABELS[item.source] ?? item.source}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('de-DE')}
        </Text>
      </View>
      <Text style={styles.points}>+{item.points}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Meine Punkte-Historie</Text>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Noch keine Aktivitäten</Text>
          }
          contentContainerStyle={
            transactions.length === 0 ? styles.emptyContainer : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowLeft: { flex: 1 },
  source: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.text },
  date: { fontSize: 13, fontFamily: fonts.regular, color: colors.textLight, marginTop: 2 },
  points: { fontSize: 18, fontFamily: fonts.bold, color: colors.primary },
  loader: { marginTop: 40 },
  empty: {
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
});
