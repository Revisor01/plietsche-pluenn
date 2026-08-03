import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

import { PP } from '../../lib/theme';
import { useCurrentUser, useShowcase, useActiveCampaigns, usePointsLog, usePendingItems, useRecentItems, useActiveNeeds, useStore } from '../../lib/hooks/useData';
import {
  nextTier,
  formatPoints,
  relativeDay,
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
import { ActivityRow } from '../../components/ActivityRow';
import { ShowcaseCard } from '../../components/ShowcaseCard';

export default function Home() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const isStaff = user?.role === 'volunteer' || user?.role === 'admin';
  const { data: showcase } = useShowcase();
  const { data: campaigns } = useActiveCampaigns();
  const { data: points } = usePointsLog(3);
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
          <Pressable onPress={() => router.push('/(visitor)/settings/account')} hitSlop={8}>
            <Avatar initials={initials(user?.name)} gradient />
          </Pressable>
        }
        trailing={<IconButton icon="bell" badge onPress={() => router.push('/(visitor)/settings/push')} />}
      />

      <View style={{ paddingHorizontal: 20 }}>
        <Card pad={22} radius={26} style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <GradientRing size={120} stroke={11} progress={tier.progress}>
            <PPText weight="medium" size={11} color={PP.ink2} style={{ letterSpacing: 0.3 }}>
              PUNKTE
            </PPText>
            <PPText weight="bold" size={32} color={PP.ink} style={{ letterSpacing: -0.8, lineHeight: 34 }}>
              {formatPoints(total)}
            </PPText>
            <PPText
              weight="semibold"
              size={10.5}
              color={tierColor(tier.current)}
              style={{ marginTop: 1, letterSpacing: 0.3 }}
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
            <PPText size={13.5} color={PP.ink} style={{ marginTop: 12, lineHeight: 19 }}>
              {motivation.text}
            </PPText>
            {/* Nur zeigen, wenn der Motivationstext den Rang nicht schon nennt. */}
            {tier.remaining > 0 && !motivation.text.includes(tier.name) && (
              <PPText size={12} color={PP.ink2} style={{ marginTop: 10 }}>
                Noch <PPText weight="semibold" size={12} color={PP.teal}>{formatPoints(tier.remaining)}</PPText> bis {tier.name}.
              </PPText>
            )}
          </View>
        </Card>
      </View>

      {(!!campaigns?.length || !!visibleNeeds.length) && (
        <>
          <SectionTitle title="Aushang" />
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {/* Laufende Aktionen (Doppelpunkte) — hervorgehoben. */}
            {campaigns?.map((c) => {
              // Every boosted type gets its own badge — an action can raise
              // coming, taking and bringing by different factors.
              const factors = campaignFactors(c);
              return (
                <GradientCard key={c.id} pad={16} radius={20} colors={accentGradient(c.color)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="sparkles" size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <PPText weight="semibold" size={PP.fontSizes.md} color="#fff">{c.name}</PPText>
                      {!!c.description && (
                        <PPText size={PP.fontSizes.sm} color="rgba(255,255,255,0.85)" style={{ marginTop: 1 }}>
                          {c.description}
                        </PPText>
                      )}
                    </View>
                  </View>
                  {/* Was es dem User bringt — jeder erhöhte Typ einzeln. */}
                  {!!factors.length && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {factors.map((f) => (
                        <View
                          key={f.label}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 999,
                            backgroundColor: 'rgba(255,255,255,0.22)',
                          }}
                        >
                          <Icon name="flame" size={13} color="#fff" />
                          <PPText weight="bold" size={PP.fontSizes.sm} color="#fff">
                            {f.label} ×{f.factor.toLocaleString('de-DE')}
                          </PPText>
                        </View>
                      ))}
                    </View>
                  )}
                </GradientCard>
              );
            })}
            {/* Freie Ankündigungen vom Laden — ohne die, die eine laufende
                Aktion bereits abdeckt (sonst stünde dasselbe Thema doppelt). */}
            {visibleNeeds.map((n) => {
              const accent = normalizeHex(n.color) ?? PP.sky;
              return (
              <Card key={n.id} pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: withAlpha(accent, 0.16), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="megaphone" size={18} color={accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>{n.title}</PPText>
                  {!!n.detail && <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 1 }}>{n.detail}</PPText>}
                </View>
              </Card>
              );
            })}
          </View>
        </>
      )}

      <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 12 }}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/(visitor)/items/new')}>
          <Card pad={14} style={{ alignItems: 'flex-start', gap: 8 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: 'rgba(39,176,146,0.10)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="plus" size={18} color={PP.teal} />
            </View>
            <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>
              Teil einstellen
            </PPText>
            <PPText size={PP.fontSizes.sm} color={PP.ink2}>
              {isStaff ? 'Direkt im Laden' : 'Vorschlag einreichen'}
            </PPText>
          </Card>
        </Pressable>

        {isStaff && (
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(visitor)/items/review')}>
            {/* Offene Freigaben sind eine Aufgabe, keine Statuszeile: bei
                Wartenden färbt sich die ganze Karte und trägt einen Zähler. */}
            <Card
              pad={14}
              style={{
                alignItems: 'flex-start',
                gap: 8,
                ...(openCount
                  ? { backgroundColor: 'rgba(232,169,59,0.12)', borderWidth: 1, borderColor: 'rgba(232,169,59,0.45)' }
                  : null),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: openCount ? PP.warn : 'rgba(232,169,59,0.14)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={openCount ? 'bell' : 'check'} size={18} color={openCount ? '#fff' : PP.warn} />
                </View>
                {!!openCount && (
                  <View
                    style={{
                      marginLeft: 'auto',
                      minWidth: 24,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: PP.warn,
                      alignItems: 'center',
                    }}
                  >
                    <PPText weight="bold" size={PP.fontSizes.sm} color="#fff">{openCount}</PPText>
                  </View>
                )}
              </View>
              <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>
                Freigaben
              </PPText>
              <PPText
                weight={openCount ? 'semibold' : 'regular'}
                size={PP.fontSizes.sm}
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
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
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
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
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

      <SectionTitle title="Watt's neu" />
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {points?.length ? (
          points.map((p) => (
            <ActivityRow
              key={p.id}
              icon={p.kind === 'badge' ? 'medal' : p.kind === 'scan' ? 'shirt' : p.kind === 'streak' ? 'flame' : 'coins'}
              tone={p.kind === 'badge' ? 'gold' : 'teal'}
              title={p.label || (p.kind === 'checkin' ? 'Check-In im Laden' : 'Punkte gutgeschrieben')}
              subtitle={`${relativeDay(p.created)} · ${p.points >= 0 ? '+' : ''}${p.points} Punkte`}
            />
          ))
        ) : (
          <Card pad={16}>
            <PPText size={13} color={PP.ink2}>
              Noch nichts passiert. Dein erster Check-In wartet auf dich.
            </PPText>
          </Card>
        )}
      </View>
    </Screen>
  );
}
