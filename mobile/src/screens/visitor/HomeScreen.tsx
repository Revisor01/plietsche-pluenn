import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { usePointsStore } from '../../store/pointsStore';
import { useAuthStore } from '../../store/authStore';
import { colors, fonts, spacing, borderRadius } from '../../theme';
import { fetchShowcaseItems, type ShowcaseItem } from '../../api/items.api';
import { fetchMyAchievements, type AchievementWithProgress } from '../../api/badges.api';
import { GlassCard } from '../../components/GlassCard';

export default function HomeScreen() {
  const { balance, isLoading, loadBalance } = usePointsStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigation = useNavigation();
  const [showcase, setShowcase] = useState<ShowcaseItem[]>([]);
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [topAchievement, setTopAchievement] = useState<AchievementWithProgress | null>(null);
  const [achievementCount, setAchievementCount] = useState<{ completed: number; total: number } | null>(null);

  useEffect(() => {
    loadBalance();
    setShowcaseLoading(true);
    fetchShowcaseItems()
      .then(setShowcase)
      .catch(() => {})
      .finally(() => setShowcaseLoading(false));
    fetchMyAchievements()
      .then((achievements) => {
        const total = achievements.length;
        const completed = achievements.filter((a) => a.completed).length;
        setAchievementCount({ completed, total });
        const completedSorted = achievements
          .filter((a) => a.completed)
          .sort((a, b) => b.sortOrder - a.sortOrder);
        setTopAchievement(completedSorted[0] ?? null);
      })
      .catch(() => {}); // Stiller Fehler
  }, [loadBalance]);

  return (
    <LinearGradient
      colors={['#e8f7f4', '#edf5f9', '#f0f4f9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
          {topAchievement && (
            <View style={styles.badgeLabel}>
              <Icon
                name={topAchievement.iconName || 'trophy'}
                solid
                size={18}
                color={colors.white}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.badgeLabelText}>{topAchievement.name}</Text>
            </View>
          )}
          {achievementCount && (
            <Text style={styles.pointsToNextLabel}>
              {achievementCount.completed} von {achievementCount.total} Badges erreicht
            </Text>
          )}
        </LinearGradient>

        {showcase.length > 0 && (
          <View style={styles.showcaseSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <Icon name="eye" size={18} color={colors.text} style={{ marginRight: spacing.xs }} />
              <Text style={styles.showcaseSectionTitle}>Schau mal rein</Text>
            </View>
            <Text style={styles.showcaseSectionSubtitle}>Ausgewählte Stücke — komm vorbei!</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.showcaseScroll}>
              {showcase.map((item) => (
                <GlassCard key={item.id} style={styles.showcaseCard} radius={12}>
                  <Text style={styles.showcaseCardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.showcaseCardCategory}>{item.category}</Text>
                  {item.size ? <Text style={styles.showcaseCardMeta}>Größe: {item.size}</Text> : null}
                  {item.color ? <Text style={styles.showcaseCardMeta}>{item.color}</Text> : null}
                </GlassCard>
              ))}
            </ScrollView>
          </View>
        )}

        <GlassCard style={{ marginBottom: spacing.lg }} radius={12}>
          <TouchableOpacity
            style={styles.badgesButton}
            onPress={() => navigation.navigate('BadgeOverview' as never)}
          >
            <Icon name="medal" solid size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.badgesButtonText}>Alle Badges ansehen</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Willkommen{user?.username ? `, ${user.username}` : ''}!
          </Text>
          <Text style={styles.welcomeText}>
            Scanne den QR-Code an Kleidungsstücken oder checke ein, um PlietschPunkte zu sammeln.
          </Text>
        </GlassCard>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
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
  badgeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  badgeLabelText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
  pointsToNextLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
  },
  badgesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  badgesButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  welcomeSection: {
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
  showcaseSection: {
    marginBottom: spacing.lg,
  },
  showcaseSectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  showcaseSectionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  showcaseScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  showcaseCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    width: 140,
  },
  showcaseCardTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  showcaseCardCategory: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  showcaseCardMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});
