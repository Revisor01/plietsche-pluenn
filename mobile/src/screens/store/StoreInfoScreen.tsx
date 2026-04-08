import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getStoreInfo, type StoreInfo } from '../../api/store.api';
import { colors, fonts, spacing, borderRadius } from '../../theme';

export default function StoreInfoScreen() {
  const navigation = useNavigation();
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
      <LinearGradient
        colors={[...colors.gradientColors]}
        locations={[...colors.gradientLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.storeName}>{store?.name ?? 'Laden'}</Text>
      </LinearGradient>

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

      <TouchableOpacity onPress={() => (navigation as any).navigate('Privacy')}>
        <Text style={styles.privacyLink}>Datenschutzerklärung</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontFamily: fonts.regular, color: colors.error, fontSize: 16, textAlign: 'center', padding: spacing.lg },
  header: { padding: spacing.lg, alignItems: 'center' },
  storeName: { fontSize: 24, fontFamily: fonts.bold, color: colors.white },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionContent: { fontSize: 16, fontFamily: fonts.regular, color: colors.text, lineHeight: 24 },
  privacyLink: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
    marginTop: spacing.lg,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
