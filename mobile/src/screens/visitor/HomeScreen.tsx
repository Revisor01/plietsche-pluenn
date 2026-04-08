import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { usePointsStore } from '../../store/pointsStore';
import { useAuthStore } from '../../store/authStore';
import { colors, fonts, spacing, borderRadius } from '../../theme';

export default function HomeScreen() {
  const { balance, isLoading, loadBalance } = usePointsStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[...colors.gradientColors]}
        locations={[...colors.gradientLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pointsCard}
      >
        <Text style={styles.pointsLabel}>PlietschPunkte</Text>
        <Text style={styles.pointsValue}>{isLoading ? '...' : balance}</Text>
        <Text style={styles.pointsSubtitle}>Dein aktueller Stand</Text>
      </LinearGradient>

      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>
          Willkommen{user?.username ? `, ${user.username}` : ''}!
        </Text>
        <Text style={styles.welcomeText}>
          Scanne den QR-Code an Kleidungsstücken oder checke ein, um PlietschPunkte zu sammeln.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  pointsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pointsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: fonts.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pointsValue: {
    fontSize: 72,
    fontFamily: fonts.bold,
    color: colors.white,
    marginVertical: spacing.xs,
  },
  pointsSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.7)',
  },
  welcomeSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  welcomeTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: spacing.lg,
    padding: 14,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
});
