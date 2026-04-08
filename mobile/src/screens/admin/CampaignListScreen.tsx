import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import { fetchCampaigns, deleteCampaign, type Campaign } from '../../api/campaigns.api';
import { colors, fonts, spacing, borderRadius } from '../../theme';

type RootStackParamList = {
  CampaignCreate: { onCreated: () => void };
};

type NavProp = StackNavigationProp<RootStackParamList>;

function isActive(campaign: Campaign): boolean {
  const now = new Date();
  return new Date(campaign.startsAt) <= now && new Date(campaign.endsAt) >= now;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface CampaignCardProps {
  campaign: Campaign;
  onDelete: (id: string) => void;
}

function CampaignCard({ campaign, onDelete }: CampaignCardProps) {
  const active = isActive(campaign);

  const handleDelete = () => {
    Alert.alert(
      'Kampagne löschen',
      `"${campaign.title}" wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => onDelete(campaign.id),
        },
      ],
    );
  };

  return (
    <View style={[styles.card, active && styles.cardActive]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{campaign.title}</Text>
          {active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>AKTIV</Text>
            </View>
          )}
        </View>
        <Text style={styles.multiplierText}>{campaign.multiplier}x Punkte</Text>
      </View>
      {campaign.description ? (
        <Text style={styles.description}>{campaign.description}</Text>
      ) : null}
      <Text style={styles.dateRange}>
        {formatDate(campaign.startsAt)} – {formatDate(campaign.endsAt)}
      </Text>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Löschen</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CampaignListScreen() {
  const navigation = useNavigation<NavProp>();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCampaigns();
      setCampaigns(data);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && !e.response) {
        setError('Keine Internetverbindung');
      } else {
        setError('Kampagnen konnten nicht geladen werden');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      Alert.alert('Fehler', 'Kampagne konnte nicht gelöscht werden');
    }
  }, []);

  const handleCreate = useCallback(() => {
    navigation.navigate('CampaignCreate', { onCreated: load });
  }, [navigation, load]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CampaignCard campaign={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Keine Kampagnen</Text>
            <Text style={styles.emptySubtitle}>
              Erstelle eine Kampagne, um Punkte-Multiplikatoren für bestimmte Zeiträume zu aktivieren.
            </Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={handleCreate}>
        <Text style={styles.fabText}>+ Neue Kampagne</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  listContent: { padding: spacing.md, paddingBottom: 80 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  activeBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  multiplierText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateRange: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteButtonText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
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
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
});
