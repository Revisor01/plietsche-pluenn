import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

import { PP } from '../../lib/theme';
import { useCurrentUser, useShowcase, useActiveCampaign, usePointsLog, usePendingItems, useRecentItems } from '../../lib/hooks/useData';
import { useAuth } from '../../lib/hooks/useAuth';
import { nextTier, formatPoints, relativeDay, initials, itemThumb } from '../../lib/format';
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
  const { user: authUser } = useAuth();
  const isStaff = authUser?.role === 'volunteer' || authUser?.role === 'admin';
  const { data: showcase } = useShowcase();
  const { data: campaign } = useActiveCampaign();
  const { data: points } = usePointsLog(3);
  const { data: pending } = usePendingItems();
  const { data: recentItems } = useRecentItems(6);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
  }, [qc]);

  const total = user?.points_total ?? 0;
  const tier = nextTier(total);
  const streak = user?.streak_weeks ?? 0;

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
              color={tier.current === 'Gold' ? PP.gold : tier.current === 'Silber' ? PP.silver : PP.bronze}
              style={{ marginTop: 1, letterSpacing: 0.3 }}
            >
              {tier.current.toUpperCase()}
            </PPText>
          </GradientRing>
          <View style={{ flex: 1 }}>
            {streak > 0 ? (
              <>
                <Pill icon="flame" color={PP.warn} bg="rgba(232,169,59,0.14)">
                  {streak} {streak === 1 ? 'Woche' : 'Wochen'} Streak
                </Pill>
                <PPText size={13.5} color={PP.ink} style={{ marginTop: 12, lineHeight: 19 }}>
                  Watt'n Lauf! Komm diese Woche vorbei, dann hältst du dein Streak.
                </PPText>
              </>
            ) : (
              <>
                <Pill icon="sparkles" color={PP.teal}>
                  Leg los
                </Pill>
                <PPText size={13.5} color={PP.ink} style={{ marginTop: 12, lineHeight: 19 }}>
                  Check beim nächsten Besuch ein und sammle deine ersten Punkte.
                </PPText>
              </>
            )}
            {tier.remaining > 0 && (
              <PPText size={12} color={PP.ink2} style={{ marginTop: 10 }}>
                Noch <PPText weight="semibold" size={12} color={PP.teal}>{formatPoints(tier.remaining)}</PPText> bis {tier.name}.
              </PPText>
            )}
          </View>
        </Card>
      </View>

      {campaign && (
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <GradientCard pad={16} radius={20}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="sparkles" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <PPText weight="semibold" size={14} color="#fff">
                  {campaign.name}
                </PPText>
                <PPText size={11.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 1 }}>
                  alles ×{campaign.multiplier}
                </PPText>
              </View>
              <Icon name="chevron-right" size={18} color="#fff" />
            </View>
          </GradientCard>
        </View>
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
            <Card pad={14} style={{ alignItems: 'flex-start', gap: 8 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: 'rgba(232,169,59,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={18} color={PP.warn} />
              </View>
              <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>
                Freigaben
              </PPText>
              <PPText size={PP.fontSizes.sm} color={PP.ink2}>
                {pending?.length ? `${pending.length} warten` : 'Nichts offen'}
              </PPText>
            </Card>
          </Pressable>
        )}
      </View>

      {!!showcase?.length && (
        <>
          <SectionTitle
            title="Schaufenster"
            action="Alles ansehen"
            onAction={() => router.push('/(visitor)/showcase')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
          >
            {showcase.map((item) => (
              <ShowcaseCard key={item.id} item={item} />
            ))}
          </ScrollView>
        </>
      )}

      {!!recentItems?.length && (
        <>
          <SectionTitle title="Neu im Laden" />
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {recentItems.map((it) => (
              <ActivityRow
                key={it.id}
                icon="shirt"
                tone="teal"
                imageUri={itemThumb(it)}
                title={it.title}
                subtitle={`${it.size ? `Größe ${it.size} · ` : ''}${relativeDay(it.created)}`}
              />
            ))}
          </View>
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
