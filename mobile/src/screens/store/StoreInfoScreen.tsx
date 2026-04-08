import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { getStoreInfo, type StoreInfo } from '../../api/store.api';

export default function StoreInfoScreen() {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const data = await getStoreInfo();
      setStore(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler beim Laden';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchStore(); }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchStore(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.storeName}>{store?.name ?? 'Laden'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adresse</Text>
        <Text style={styles.sectionContent}>
          {store?.address ?? 'Keine Adresse hinterlegt'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Öffnungszeiten</Text>
        <Text style={styles.sectionContent}>
          {store?.openingHours ?? 'Keine Öffnungszeiten hinterlegt'}
        </Text>
      </View>

      {store?.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Über uns</Text>
          <Text style={styles.sectionContent}>{store.description}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 16, textAlign: 'center', padding: 24 },
  header: {
    backgroundColor: '#2563EB', padding: 24, alignItems: 'center',
  },
  storeName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  section: {
    backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 12,
    borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' },
  sectionContent: { fontSize: 16, color: '#111827', lineHeight: 24 },
});
