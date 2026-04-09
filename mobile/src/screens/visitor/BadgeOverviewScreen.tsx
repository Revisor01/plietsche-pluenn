import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { fetchMyAchievements, type AchievementWithProgress } from '../../api/badges.api';
import { colors, fonts, spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/GlassCard';

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silber: '#A8A9AD',
  gold: '#FFD700',
  custom: colors.primary,
};

const CATEGORY_MAP: Record<string, string> = {
  items_brought: 'Bringer',
  items_taken: 'Holer',
  visits: 'Besucher',
  streak_weeks: 'Streaks',
  season_items_brought: 'Saison',
  season_items_taken: 'Saison',
  milestone: 'Meilensteine',
};

const UNIT_MAP: Record<string, string> = {
  items_brought: 'gebracht',
  items_taken: 'geholt',
  visits: 'Besuche',
  streak_weeks: 'Wochen',
  season_items_brought: 'Teile',
  season_items_taken: 'Teile',
  milestone: '',
};

const CATEGORY_ORDER = ['Bringer', 'Holer', 'Besucher', 'Streaks', 'Saison', 'Meilensteine'];

export default function BadgeOverviewScreen() {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyAchievements();
      setAchievements(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      setError('Badges konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const grouped: Record<string, AchievementWithProgress[]> = {};
  for (const a of achievements) {
    const cat = CATEGORY_MAP[a.triggerType] ?? 'Sonstige';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  }

  const completedCount = achievements.filter((a) => a.completed).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meine Badges</Text>
        <Text style={styles.headerSubtitle}>
          {completedCount} von {achievements.length} erreicht
        </Text>
      </View>

      {CATEGORY_ORDER.filter((cat) => (grouped[cat]?.length ?? 0) > 0).map((category) => (
        <View key={category} style={styles.section}>
          <Text style={styles.sectionTitle}>{category}</Text>
          {grouped[category].map((achievement) => {
            const tierColor = TIER_COLORS[achievement.tier] ?? colors.primary;
            const unit = UNIT_MAP[achievement.triggerType] ?? '';
            const progressPercent = Math.min(
              100,
              Math.round((achievement.progress / achievement.triggerValue) * 100),
            );

            return (
              <GlassCard
                key={achievement.id}
                style={[
                  styles.badgeCard,
                  achievement.completed && { borderColor: tierColor, borderWidth: 2 },
                ]}
                radius={12}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: achievement.completed ? tierColor : colors.border },
                  ]}
                >
                  <Icon
                    name={achievement.iconName || 'trophy'}
                    solid
                    size={22}
                    color={achievement.completed ? '#fff' : colors.textSecondary}
                  />
                </View>
                <View style={styles.badgeContent}>
                  <View style={styles.badgeHeader}>
                    <Text
                      style={[
                        styles.badgeName,
                        achievement.completed && { color: tierColor },
                      ]}
                    >
                      {achievement.name}
                    </Text>
                    {achievement.completed && (
                      <Icon name="check-circle" solid size={16} color={tierColor} />
                    )}
                  </View>
                  <Text style={styles.badgeDescription}>{achievement.description}</Text>
                  {!achievement.completed && (
                    <>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${progressPercent}%` as unknown as number,
                              backgroundColor: tierColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {achievement.progress} von {achievement.triggerValue}
                        {unit ? ` ${unit}` : ''}
                      </Text>
                    </>
                  )}
                  {achievement.completed && achievement.completedAt && (
                    <Text style={styles.completedAt}>
                      Erreicht am{' '}
                      {new Date(achievement.completedAt).toLocaleDateString('de-DE')}
                    </Text>
                  )}
                </View>
              </GlassCard>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: { marginBottom: spacing.lg },
  headerTitle: { fontSize: 24, fontFamily: fonts.bold, color: colors.text },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  badgeContent: { flex: 1 },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  badgeName: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.xs,
  },
  badgeDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: { height: 5, borderRadius: borderRadius.full },
  progressText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  completedAt: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
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
  retryText: { color: '#fff', fontFamily: fonts.semiBold, fontSize: 14 },
});
