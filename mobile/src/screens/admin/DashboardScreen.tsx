import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import { fetchDashboardStats, DashboardStats } from '../../api/dashboard.api';
import { colors, fonts, spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/GlassCard';

type Period = 'today' | 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Heute',
  week: 'Woche',
  month: 'Monat',
  year: 'Jahr',
};

function getDateRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  let from: Date;

  switch (period) {
    case 'today': {
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'week': {
      from = new Date(now);
      const day = from.getDay();
      // Monday as start of week
      const diff = (day === 0 ? -6 : 1 - day);
      from.setDate(from.getDate() + diff);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    case 'year': {
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    }
  }

  return { from, to };
}

interface StatCardProps {
  label: string;
  value: number;
  bgColor: string;
  accentColor: string;
}

function StatCard({ label, value, bgColor, accentColor }: StatCardProps) {
  return (
    <GlassCard style={[styles.card, { borderColor: accentColor + '40' }]} radius={12}>
      <Text style={[styles.cardValue, { color: accentColor }]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </GlassCard>
  );
}

export default function DashboardScreen() {
  const [period, setPeriod] = useState<Period>('week');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { from, to } = getDateRange(period);
      const data = await fetchDashboardStats(from, to);
      setStats(data);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && !e.response) {
        setError('Keine Internetverbindung');
      } else {
        setError('Daten konnten nicht geladen werden');
      }
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <LinearGradient
      colors={['#e8f7f4', '#edf5f9', '#f0f4f9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>

      {/* Zeitraum-Auswahl */}
      <View style={styles.segmentRow}>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.segmentButton, period === p && styles.segmentButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.segmentText, period === p && styles.segmentTextActive]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Error */}
      {!isLoading && error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Grid */}
      {!isLoading && !error && stats && (
        <View style={styles.grid}>
          <StatCard
            label="BESUCHE"
            value={stats.visits}
            bgColor="#EFF6FF"
            accentColor="#2563EB"
          />
          <StatCard
            label="ITEMS MITGENOMMEN"
            value={stats.itemsTaken}
            bgColor="#F0FDF4"
            accentColor="#16A34A"
          />
          <StatCard
            label="NEUE ITEMS"
            value={stats.newItems}
            bgColor="#FFFBEB"
            accentColor="#D97706"
          />
          <StatCard
            label="AKTIVE ITEMS"
            value={stats.activeItems}
            bgColor="#F5F3FF"
            accentColor="#7C3AED"
          />
        </View>
      )}
    </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: spacing.md },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.white,
    fontFamily: fonts.semiBold,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: borderRadius.md,
    padding: 16,
  },
  cardValue: {
    fontSize: 40,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
