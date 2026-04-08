import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { usePointsStore } from '../../store/pointsStore';
import { useAuthStore } from '../../store/authStore';

export default function HomeScreen() {
  const { balance, isLoading, loadBalance } = usePointsStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Prominente Punktestand-Anzeige — Locked Decision PUNKT-01 */}
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>PlietschPunkte</Text>
        <Text style={styles.pointsValue}>{isLoading ? '...' : balance}</Text>
        <Text style={styles.pointsSubtitle}>Dein aktueller Stand</Text>
      </View>

      {/* Begrüßung */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>
          Willkommen{user?.username ? `, ${user.username}` : ''}!
        </Text>
        <Text style={styles.welcomeText}>
          Scanne den QR-Code an Kleidungsstücken oder checke ein, um PlietschPunkte zu sammeln.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  pointsCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#BFDBFE',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pointsValue: { fontSize: 72, fontWeight: '800', color: '#FFFFFF', marginVertical: 4 },
  pointsSubtitle: { fontSize: 13, color: '#93C5FD' },
  welcomeSection: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  welcomeTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  welcomeText: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});
