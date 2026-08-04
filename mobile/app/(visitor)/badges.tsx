import { View, useWindowDimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../lib/theme';
import { useBadges, useUserBadges, useStore } from '../../lib/hooks/useData';
import { badgeTierInfo } from '../../lib/format';
import { Screen, PPHeader, PPText, BadgeMedallion, TIER_COLORS, GradientRing, Card } from '../../components/ui';
import type { IconName } from '../../lib/icons';

export default function Badges() {
  const qc = useQueryClient();
  const { data: badges } = useBadges();
  const { data: userBadges } = useUserBadges();
  const { data: store } = useStore();
  // Stufennamen kommen aus den Rängen unter „Punkte & Ränge".
  const ranks = (store as any)?.tiers_json as { name: string; at: number }[] | undefined;
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['user_badges'] });
    await qc.invalidateQueries({ queryKey: ['badges'] });
    setRefreshing(false);
  }, [qc]);

  const ubMap = new Map((userBadges ?? []).map((ub) => [ub.badge, ub]));

  // Zwei Spalten: 20 Außenabstand je Seite, 12 zwischen den Kacheln.
  const colWidth = (width - 20 * 2 - 12) / 2;
  const ring = Math.min(96, colWidth - 44);

  return (
    <Screen padBottom={110} refreshing={refreshing} onRefresh={onRefresh}>
      {/* Bewusst ohne Admin-Zahnrad: Die Verwaltung sitzt gebündelt unter
          Konto → Verwaltung. Das Team sieht hier dieselbe Ansicht wie alle. */}
      <PPHeader subtitle="Sammlung" title="Watt'n Schatz" />

      {/* Zweispaltiges Raster — bei vielen Badges (jede Aktion bringt eins)
          wurde die einspaltige Liste zu lang zum Überblicken. */}
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {(badges ?? []).map((b) => {
          const ub = ubMap.get(b.id);
          const progress = ub?.progress ?? 0;
          const info = badgeTierInfo(b, progress, ranks);
          const earned = info.current !== 'none';
          // Ungelöste Badges bleiben sichtbar und grau — auch nach Aktionsende,
          // dann eben als Leerstelle in der Sammlung.
          const tierC = earned && info.current !== 'none' ? TIER_COLORS[info.current] : null;
          // Geheim: bis zur ersten Stufe weder Name noch Fortschritt verraten.
          const veiled = !!b.is_secret && !earned;

          return (
            <Card key={b.id} pad={14} radius={18} style={{ width: colWidth, alignItems: 'center' }}>
              <GradientRing
                size={ring}
                stroke={6}
                progress={veiled ? 0 : info.maxed ? 1 : info.barProgress}
                gradientKey={b.id}
                colors={tierC ? [tierC.base, tierC.light, tierC.base] : ['rgba(26,46,44,0.18)', 'rgba(26,46,44,0.12)', 'rgba(26,46,44,0.18)']}
              >
                <BadgeMedallion
                  icon={(veiled ? 'lock' : b.icon) as IconName}
                  tier={info.current}
                  earned={earned}
                  size={ring - 18}
                />
              </GradientRing>

              <PPText
                weight="semibold"
                size={13}
                color={earned ? PP.ink : PP.ink2}
                numberOfLines={1}
                style={{ marginTop: 10, textAlign: 'center' }}
              >
                {veiled ? 'Geheim' : b.name}
              </PPText>

              {veiled ? (
                <PPText size={10.5} color={PP.ink3} style={{ marginTop: 3, textAlign: 'center' }}>
                  Noch nicht entdeckt
                </PPText>
              ) : info.maxed ? (
                <PPText weight="semibold" size={10} color={PP.ink3} style={{ marginTop: 3, letterSpacing: 0.4 }}>
                  {info.currentName.toUpperCase()}
                </PPText>
              ) : (
                <PPText size={10.5} color={PP.ink2} style={{ marginTop: 3, textAlign: 'center' }}>
                  {progress}/{info.target} bis {info.nextName}
                </PPText>
              )}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
