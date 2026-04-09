import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
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
      .catch(() => {});
  }, [loadBalance]);

  return (
    <LinearGradient
      colors={[...colors.gradientColors]}
      locations={[...colors.gradientLocations]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Punkte-Card: weiss/glass auf Gradient-Hintergrund */}
        <GlassCard style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>PlietschPunkte</Text>
          <Text style={styles.pointsValue}>{isLoading ? '...' : balance}</Text>
          <Text style={styles.pointsSubtitle}>Dein aktueller Stand</Text>
          {topAchievement && (
            <View style={styles.badgeLabel}>
              <FontAwesome6
                name={(topAchievement.iconName || 'trophy') as any}
                iconStyle="solid"
                size={18}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.badgeLabelText}>{topAchievement.name}</Text>
            </View>
          )}
          {achievementCount && (
            <Text style={styles.badgeCountText}>
              {achievementCount.completed} von {achievementCount.total} Badges erreicht
            </Text>
          )}
        </GlassCard>

        {/* Showcase */}
        {showcase.length > 0 && (
          <View style={styles.showcaseSection}>
            <View style={styles.showcaseHeader}>
              <FontAwesome6 name="eye" iconStyle="solid" size={16} color={colors.white} style={{ marginRight: spacing.xs }} />
              <Text style={styles.showcaseSectionTitle}>Schau mal rein</Text>
            </View>
            <Text style={styles.showcaseSectionSubtitle}>Ausgewaehlte Stuecke -- komm vorbei!</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.showcaseScroll}>
              {showcase.map((item) => (
                <GlassCard key={item.id} style={styles.showcaseCard} radius={12}>
                  <Text style={styles.showcaseCardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.showcaseCardCategory}>{item.category}</Text>
                  {item.size ? <Text style={styles.showcaseCardMeta}>Groesse: {item.size}</Text> : null}
                  {item.color ? (
                    <View style={styles.colorRow}>
                      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                      <Text style={styles.showcaseCardMeta}>Farbe</Text>
                    </View>
                  ) : null}
                </GlassCard>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Badges Button */}
        <GlassCard style={styles.badgesButtonCard} radius={12}>
          <TouchableOpacity
            style={styles.badgesButton}
            onPress={() => navigation.navigate('Badges' as never)}
          >
            <FontAwesome6 name="trophy" iconStyle="solid" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.badgesButtonText}>Alle Badges ansehen</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Willkommen */}
        <GlassCard style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Willkommen{user?.username ? `, ${user.username}` : ''}!
          </Text>
          <Text style={styles.welcomeText}>
            Scanne den QR-Code an Kleidungsstuecken oder checke ein, um PlietschPunkte zu sammeln.
          </Text>
        </GlassCard>

        {/* Abmelden */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>

        {/* Extra Padding fuer Floating Tab-Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingTop: 100 },
  pointsCard: {
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pointsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pointsValue: {
    fontSize: 64,
    fontFamily: fonts.bold,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  pointsSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  badgeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  badgeLabelText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  badgeCountText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  showcaseSection: {
    marginBottom: spacing.lg,
  },
  showcaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  showcaseSectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.white,
  },
  showcaseSectionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.sm,
  },
  showcaseScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  showcaseCard: {
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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  badgesButtonCard: {
    marginBottom: spacing.lg,
  },
  badgesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  badgesButtonText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  welcomeSection: {
    padding: spacing.md,
    marginBottom: spacing.md,
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
    padding: 14,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
  },
  logoutText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
});
