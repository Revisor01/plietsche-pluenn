import { View, Pressable, ScrollView } from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { useCurrentUser, usePointsLog, useStore } from '../../lib/hooks/useData';
import { formatPoints, relativeDay } from '../../lib/format';
import { nextTier } from '../../lib/format';
import { Screen, PPHeader, PPText, Card, Pill } from '../../components/ui';
import type { PointsLog } from '../../lib/types';

type Filter = 'all' | 'checkin' | 'scan' | 'badge';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'checkin', label: 'Check-Ins' },
  { key: 'scan', label: 'Teile' },
  { key: 'badge', label: 'Badges' },
];

function iconFor(kind: PointsLog['kind']): { icon: IconName; color: string } {
  switch (kind) {
    case 'badge':
      return { icon: 'medal', color: PP.gold };
    case 'streak':
      return { icon: 'flame', color: PP.warn };
    case 'checkin':
      return { icon: 'door', color: PP.sky };
    case 'scan':
      return { icon: 'shirt', color: PP.teal };
    default:
      return { icon: 'coins', color: PP.teal };
  }
}

export default function Points() {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: log } = usePointsLog(300);
  const { data: store } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['points_log'] });
    await qc.invalidateQueries({ queryKey: ['me'] });
    setRefreshing(false);
  }, [qc]);

  const filtered = useMemo(() => {
    const items = log ?? [];
    if (filter === 'all') return items;
    return items.filter((p) => p.kind === filter);
  }, [log, filter]);

  // Group by relative day.
  const groups = useMemo(() => {
    const map = new Map<string, PointsLog[]>();
    for (const p of filtered) {
      const day = relativeDay(p.created);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(p);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const total = user?.points_total ?? 0;
  const tier = nextTier(total, (store as any)?.tiers_json);

  // Points earned in last 7 days.
  const weekTotal = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    return (log ?? []).filter((p) => new Date(p.created).getTime() >= since).reduce((s, p) => s + p.points, 0);
  }, [log]);

  return (
    <Screen padBottom={110} refreshing={refreshing} onRefresh={onRefresh}>
      <PPHeader subtitle="Historie" title="Deine Punkte" />

      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <Card pad={16} radius={20}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <View>
              <PPText weight="semibold" size={11} color={PP.ink2} style={{ letterSpacing: 0.3 }}>
                GESAMT
              </PPText>
              <PPText weight="bold" size={30} color={PP.ink} style={{ letterSpacing: -0.6, marginTop: 2, lineHeight: 32 }}>
                {formatPoints(total)}
              </PPText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {weekTotal > 0 && (
                <Pill icon="arrow-up">+{formatPoints(weekTotal)} diese Woche</Pill>
              )}
              <PPText size={11} color={PP.ink2} style={{ marginTop: 4 }}>
                {tier.remaining > 0 ? `noch ${formatPoints(tier.remaining)} bis ${tier.name}` : `${tier.current} erreicht`}
              </PPText>
            </View>
          </View>
        </Card>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingBottom: 10 }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)}>
              <Pill
                bg={active ? PP.teal : 'rgba(26,46,44,0.06)'}
                color={active ? '#fff' : PP.ink2}
              >
                {f.label}
              </Pill>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, gap: 18 }}>
        {groups.length === 0 ? (
          <Card pad={16}>
            <PPText size={13} color={PP.ink2}>
              Noch keine Punkte in dieser Kategorie.
            </PPText>
          </Card>
        ) : (
          groups.map(([day, items]) => (
            <View key={day}>
              <PPText weight="semibold" size={11} color={PP.ink2} style={{ letterSpacing: 0.3, marginBottom: 8 }}>
                {day.toUpperCase()}
              </PPText>
              <Card pad={0} style={{ overflow: 'hidden' }}>
                {items.map((it, j) => {
                  const { icon, color } = iconFor(it.kind);
                  const time = new Date(it.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <View
                      key={it.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderTopWidth: j === 0 ? 0 : 1,
                        borderTopColor: PP.hairline,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 11,
                          backgroundColor: `${color}1a`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={icon} size={18} color={color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <PPText weight="medium" size={13} color={PP.ink} numberOfLines={1}>
                          {it.label || (it.kind === 'checkin' ? 'Check-In' : 'Punkte')}
                        </PPText>
                        <PPText size={11} color={PP.ink2} style={{ marginTop: 1 }}>
                          {time}
                        </PPText>
                      </View>
                      <PPText weight="bold" size={14} color={it.points >= 0 ? PP.teal : PP.err}>
                        {it.points >= 0 ? '+' : ''}
                        {it.points}
                      </PPText>
                    </View>
                  );
                })}
              </Card>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
