import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

import { PP, alpha } from '../../lib/theme';
import { useCurrentUser, useShowcase, useActiveCampaigns, usePendingItems, useRecentItems, useActiveNeeds, useStore } from '../../lib/hooks/useData';
import {
  nextTier,
  formatPoints,
  initials,
  tierColor,
  campaignBonusLabel,
  campaignFactors,
  motivationFor,
  accentGradient,
  normalizeHex,
  withAlpha,
} from '../../lib/format';
import {
  Screen,
  PPHeader,
  Avatar,
  Card,
  GradientCard,
  GradientRing,
  Pill,
  PPText,
  SectionTitle,
  IconButton,
} from '../../components/ui';
import { Icon } from '../../lib/icons';
import { ShowcaseCard } from '../../components/ShowcaseCard';

export default function Home() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isStaff = user?.role === 'volunteer' || user?.role === 'admin';
  const { data: showcase } = useShowcase();
  const { data: campaigns } = useActiveCampaigns();
  const { data: pending } = usePendingItems();
  const openCount = pending?.length ?? 0;
  const { data: recentItems } = useRecentItems(6);
  const { data: needs } = useActiveNeeds();
  const { data: store } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  }, [qc]);

  const total = user?.points_total ?? 0;
  const tier = nextTier(total, (store as any)?.tiers_json);

  // Ankündigungen, die eine laufende Aktion bereits abdeckt, werden von der
  // Aktions-Karte geschluckt — sonst stünde dasselbe Thema doppelt im Aushang.
  const activeCampaignIds = new Set((campaigns ?? []).map((c) => c.id));
  const visibleNeeds = (needs ?? []).filter((n) => !n.campaign || !activeCampaignIds.has(n.campaign));

  // Motivationstext passt sich der Lage an (Rang, Aktion, Streak, Abwesenheit).
  const leadCampaign = campaigns?.[0];
  const daysSinceVisit = user?.streak_last_visit
    ? Math.floor((Date.now() - new Date(user.streak_last_visit).getTime()) / 86400000)
    : null;
  const motivation = motivationFor({
    streakWeeks: user?.streak_weeks ?? 0,
    tierRemaining: tier.remaining,
    tierName: tier.name,
    campaignName: leadCampaign?.name,
    campaignBonus: campaignBonusLabel(leadCampaign?.multiplier),
    daysSinceVisit,
    totalPoints: total,
  });
  const motivationColor =
    motivation.tone === 'warn' ? PP.warn : motivation.tone === 'sky' ? PP.sky : PP.teal;

  return (
    <Screen padBottom={110} refreshing={refreshing} onRefresh={onRefresh}>
      <PPHeader
        subtitle="Plietsche Plünn"
        title={`Moin, ${user?.name?.split(' ')[0] ?? 'du'}!`}
        leading={
          <Pressable
            onPress={() => router.push('/(visitor)/settings/account?from=/(visitor)')}
            accessibilityRole="button"
            accessibilityLabel="Mein Konto"
            hitSlop={8}
          >
            <Avatar initials={initials(user?.name)} gradient />
          </Pressable>
        }
        trailing={<IconButton icon="bell" badge accessibilityLabel="Benachrichtigungen" onPress={() => router.push('/(visitor)/settings/push?from=/(visitor)')} />}
      />

      {/* Erinnerung an die offene E-Mail-Bestätigung. Sie steht bewusst oben,
          verschwindet aber von selbst, sobald bestätigt wurde — und sie
          versperrt nichts: Ohne Bestätigung lässt sich die App voll nutzen.
          Der Weg führt ins Profil, dort sitzt der Knopf zum erneuten Senden. */}
      {user && !user?.verified && (
        <View style={{ paddingHorizontal: PP.space.xl, marginBottom: PP.space.lg }}>
          <Pressable
            onPress={() => router.push('/(visitor)/settings/account?from=/(visitor)')}
            accessibilityRole="button"
            accessibilityLabel="E-Mail-Adresse bestätigen"
            accessibilityHint="Öffnet dein Profil, dort kannst du die Mail erneut anfordern."
          >
            <Card
              pad={14}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: PP.space.md,
                backgroundColor: alpha(PP.warn, 'ghost'),
                borderWidth: 1,
                borderColor: alpha(PP.warn, 'soft'),
              }}
            >
              <Icon name="mail" size={PP.iconSizes.md} color={PP.warn} />
              <View style={{ flex: 1 }}>
                <PPText weight="semibold" size="sm" color={PP.ink}>
                  E-Mail-Adresse noch nicht bestätigt
                </PPText>
                <PPText size="sm" color={PP.ink2} style={{ marginTop: 2 }}>
                  Schau in dein Postfach — auch im Spam-Ordner.
                </PPText>
              </View>
              <Icon name="chevron-right" size={PP.iconSizes.md} color={PP.ink3} />
            </Card>
          </Pressable>
        </View>
      )}

      {/* Die Fortschrittskarte führt in die Punkte-Übersicht — der Verlauf
          stand vorher doppelt als "Watt's neu" unter dem Dashboard. */}
      <Pressable
        style={{ paddingHorizontal: PP.space.xl }}
        onPress={() => router.push('/(visitor)/points')}
        accessibilityRole="button"
        accessibilityLabel={`${formatPoints(total)} Punkte, Rang ${tier.name}`}
        accessibilityHint="Öffnet die Punkte-Übersicht."
      >
        <Card pad={22} radius={26} style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.lg }}>
          <GradientRing size={120} stroke={11} progress={tier.progress}>
            <PPText weight="medium" size="xs" color={PP.ink2} style={{ letterSpacing: PP.tracking.label }}>
              PUNKTE
            </PPText>
            <PPText weight="bold" size="hero" color={PP.ink} style={{ letterSpacing: PP.tracking.hero, lineHeight: PP.fontSizes.hero * PP.leading.tight }}>
              {formatPoints(total)}
            </PPText>
            <PPText
              weight="semibold"
              size="xs"
              color={tierColor(tier.current)}
              style={{ marginTop: 1, letterSpacing: PP.tracking.label }}
            >
              {tier.current.toUpperCase()}
            </PPText>
          </GradientRing>
          <View style={{ flex: 1 }}>
            <Pill
              icon={motivation.icon as any}
              color={motivationColor}
              bg={withAlpha(motivationColor, 0.14)}
            >
              {motivation.pill}
            </Pill>
            <PPText size="base" color={PP.ink} style={{ marginTop: PP.space.md, lineHeight: PP.fontSizes.base * PP.leading.normal }}>
              {motivation.text}
            </PPText>
            {/* Nur zeigen, wenn der Motivationstext den Rang nicht schon nennt. */}
            {tier.remaining > 0 && !motivation.text.includes(tier.name) && (
              <PPText size="sm" color={PP.ink2} style={{ marginTop: PP.space.md }}>
                Noch <PPText weight="semibold" size="sm" color={PP.teal}>{formatPoints(tier.remaining)}</PPText> bis {tier.name}.
              </PPText>
            )}
          </View>
        </Card>
      </Pressable>

      {(!!campaigns?.length || !!visibleNeeds.length) && (
        <>
          <SectionTitle title="Aushang" />
          {/* Freie Ankündigungen zuerst: dort stehen Dinge wie Öffnungszeiten,
              die immer obenauf gehören. Aktionen laufen befristet darunter. */}
          <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
            {visibleNeeds.map((n) => {
              const accent = normalizeHex(n.color) ?? PP.sky;
              return (
              // Die gewählte Farbe trägt die ganze Karte (Kante + getönte
              // Fläche) — nur im Icon war sie gegen den Standard nicht zu
              // unterscheiden. Text bleibt dunkel, die Tönung ist schwach genug.
              <Card
                key={n.id}
                pad={14}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: PP.space.md,
                  backgroundColor: withAlpha(accent, 0.08),
                  borderLeftWidth: 4,
                  borderLeftColor: accent,
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: PP.rTile2, backgroundColor: withAlpha(accent, 0.18), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="megaphone" size={PP.iconSizes.md} color={accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PPText weight="semibold" size="base" color={PP.ink}>{n.title}</PPText>
                  {!!n.detail && <PPText size="sm" color={PP.ink2} style={{ marginTop: 1 }}>{n.detail}</PPText>}
                </View>
              </Card>
              );
            })}
            {/* Laufende Aktionen — hervorgehoben. */}
            {campaigns?.map((c) => {
              // Every boosted type gets its own badge — an action can raise
              // coming, taking and bringing by different factors.
              const factors = campaignFactors(c);
              return (
                <GradientCard key={c.id} pad={16} radius={20} colors={accentGradient(c.color)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
                    <View style={{ width: 44, height: 44, borderRadius: PP.rField, backgroundColor: alpha(PP.onBrand, "medium"), alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="sparkles" size={PP.iconSizes.lg} color={PP.onBrand} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <PPText weight="semibold" size="md" color={PP.onBrand}>{c.name}</PPText>
                      {!!c.description && (
                        <PPText size="sm" color={PP.onBrandMuted} style={{ marginTop: 1 }}>
                          {c.description}
                        </PPText>
                      )}
                    </View>
                  </View>
                  {/* Was es dem User bringt — jeder erhöhte Typ einzeln. */}
                  {!!factors.length && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: PP.space.sm, marginTop: PP.space.md }}>
                      {factors.map((f) => (
                        <View
                          key={f.label}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: PP.space.sm,
                            paddingVertical: PP.space.sm,
                            paddingHorizontal: PP.space.md,
                            borderRadius: PP.rPill,
                            backgroundColor: alpha(PP.onBrand, "medium"),
                          }}
                        >
                          <Icon name="flame" size={PP.iconSizes.xs} color={PP.onBrand} />
                          <PPText weight="bold" size="sm" color={PP.onBrand}>
                            {f.label} ×{f.factor.toLocaleString('de-DE')}
                          </PPText>
                        </View>
                      ))}
                    </View>
                  )}
                </GradientCard>
              );
            })}
          </View>
        </>
      )}

      <View style={{ paddingHorizontal: PP.space.xl, paddingTop: PP.space.lg, flexDirection: 'row', gap: PP.space.md }}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => router.push('/(visitor)/items/new')}
          accessibilityRole="button"
          accessibilityLabel="Teil einstellen"
        >
          <Card pad={14} style={{ alignItems: 'flex-start', gap: PP.space.sm }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: PP.rTile2,
                backgroundColor: alpha(PP.teal, "subtle"),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="plus" size={PP.iconSizes.md} color={PP.teal} />
            </View>
            <PPText weight="semibold" size="base" color={PP.ink}>
              Teil einstellen
            </PPText>
            <PPText size="sm" color={PP.ink2}>
              {isStaff ? 'Direkt im Laden' : 'Vorschlag einreichen'}
            </PPText>
          </Card>
        </Pressable>

        {isStaff && (
          <Pressable
            style={{ flex: 1 }}
            onPress={() => router.push('/(visitor)/items/review')}
            accessibilityRole="button"
            accessibilityLabel={openCount ? `Freigaben, ${openCount} offen` : 'Freigaben, nichts offen'}
          >
            {/* Offene Freigaben sind eine Aufgabe, keine Statuszeile: bei
                Wartenden färbt sich die ganze Karte und trägt einen Zähler. */}
            <Card
              pad={14}
              style={{
                alignItems: 'flex-start',
                gap: PP.space.sm,
                ...(openCount
                  ? { backgroundColor: alpha(PP.warn, "soft"), borderWidth: 1, borderColor: alpha(PP.warn, "veil") }
                  : null),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: PP.rTile2,
                    backgroundColor: openCount ? PP.warn : alpha(PP.warn, "soft"),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={openCount ? 'bell' : 'check'} size={PP.iconSizes.md} color={openCount ? PP.onBrand : PP.warn} />
                </View>
                {!!openCount && (
                  <View
                    style={{
                      marginLeft: 'auto',
                      minWidth: 24,
                      paddingHorizontal: PP.space.sm,
                      paddingVertical: 2,
                      borderRadius: PP.rPill,
                      backgroundColor: PP.warn,
                      alignItems: 'center',
                    }}
                  >
                    <PPText weight="bold" size="sm" color={PP.onBrand}>{openCount}</PPText>
                  </View>
                )}
              </View>
              <PPText weight="semibold" size="base" color={PP.ink}>
                Freigaben
              </PPText>
              <PPText
                weight={openCount ? 'semibold' : 'regular'}
                size="sm"
                color={openCount ? PP.warn : PP.ink2}
              >
                {openCount
                  ? `${openCount} ${openCount === 1 ? 'Teil wartet' : 'Teile warten'}`
                  : 'Nichts offen'}
              </PPText>
            </Card>
          </Pressable>
        )}
      </View>

      {/* Schaufenster — kuratierte Highlights für alle Nutzer. */}
      {!!showcase?.length && (
        <>
          <SectionTitle
            title="Schaufenster"
            action="Alles ansehen"
            onAction={() => router.push('/(visitor)/store' as any)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: PP.space.xl, gap: PP.space.md, paddingBottom: PP.space.xs }}
          >
            {showcase.map((item) => (
              <ShowcaseCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/(visitor)/items/${item.id}?from=/(visitor)`)}
              />
            ))}
          </ScrollView>
        </>
      )}

      {!!recentItems?.length && (
        <>
          <SectionTitle
            title="Neu im Laden"
            action="Alles ansehen"
            onAction={() => router.push('/(visitor)/store' as any)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: PP.space.xl, gap: PP.space.md, paddingBottom: PP.space.xs }}
          >
            {recentItems.map((it) => (
              <ShowcaseCard
                key={it.id}
                item={it}
                onPress={() => router.push(`/(visitor)/items/${it.id}?from=/(visitor)`)}
              />
            ))}
          </ScrollView>
        </>
      )}

    </Screen>
  );
}
