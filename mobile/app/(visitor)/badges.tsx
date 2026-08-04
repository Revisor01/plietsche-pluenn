import { View, Pressable, Modal, useWindowDimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../lib/theme';
import { useBadges, useUserBadges, useStore } from '../../lib/hooks/useData';
import { badgeTierInfo, badgeTierSlots, normalizeHex, withAlpha } from '../../lib/format';
import { Screen, PPHeader, PPText, BadgeMedallion, TIER_COLORS, GradientRing, Card, PPButton } from '../../components/ui';
import type { IconName } from '../../lib/icons';
import type { Badge, UserBadge } from '../../lib/types';
import type { TierStep } from '../../lib/format';

/**
 * Was ein Abzeichen bedeutet und wie weit man ist — die Beschreibung hat in
 * der Kachel keinen Platz, verschwinden soll sie deshalb aber nicht.
 * Bei geheimen Abzeichen bleibt sie verdeckt, bis die erste Stufe steht.
 */
function BadgeSheet({
  badge,
  ub,
  ranks,
  onClose,
}: {
  badge: Badge | null;
  ub?: UserBadge;
  ranks?: TierStep[];
  onClose: () => void;
}) {
  if (!badge) return null;
  const progress = ub?.progress ?? 0;
  const info = badgeTierInfo(badge, progress, ranks);
  const earned = info.current !== 'none';
  const veiled = !!badge.is_secret && !earned;
  const single = badge.kind === 'single';
  const accent = normalizeHex(badge.color);
  const tierC = earned ? TIER_COLORS[info.current as Exclude<typeof info.current, 'none'>] : null;
  // Einzel-Abzeichen tragen ihre eigene Farbe, sobald sie verdient sind.
  const ringColors: [string, string, string] =
    single && earned && accent
      ? [accent, accent, accent]
      : tierC
        ? [tierC.base, tierC.light, tierC.base]
        : ['rgba(26,46,44,0.18)', 'rgba(26,46,44,0.12)', 'rgba(26,46,44,0.18)'];

  const slots = single ? [] : badgeTierSlots(ranks);
  const stepValues: Record<string, number> = {
    bronze: badge.tier_bronze,
    silber: badge.tier_silber,
    gold: badge.tier_gold,
    platin: badge.tier_platin,
    diamant: badge.tier_diamant ?? 0,
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(10,26,24,0.45)', justifyContent: 'center', padding: 24 }}
      >
        {/* Klicks auf die Karte sollen sie nicht schließen. */}
        <Pressable onPress={() => {}}>
          <Card pad={20} radius={24} style={{ alignItems: 'center' }}>
            <GradientRing
              size={112}
              stroke={7}
              progress={veiled ? 0 : single ? (earned ? 1 : 0) : info.maxed ? 1 : info.barProgress}
              gradientKey={`sheet-${badge.id}`}
              colors={ringColors}
            >
              <BadgeMedallion
                icon={(veiled ? 'lock' : badge.icon) as IconName}
                tier={info.current}
                earned={earned}
                size={94}
                color={single && earned ? accent ?? undefined : undefined}
              />
            </GradientRing>

            <PPText weight="bold" size={19} color={PP.ink} style={{ marginTop: 14, textAlign: 'center' }}>
              {veiled ? 'Geheimes Abzeichen' : badge.name}
            </PPText>

            <PPText size={13.5} color={PP.ink2} style={{ marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
              {veiled
                ? 'Was es dafür gibt, verraten wir noch nicht. Es taucht auf, sobald du es dir verdient hast.'
                : badge.description || 'Keine Beschreibung hinterlegt.'}
            </PPText>

            {!veiled && (
              <View style={{ marginTop: 14, width: '100%' }}>
                {single ? (
                  <View
                    style={{
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: earned
                        ? withAlpha(accent ?? PP.teal, 0.12)
                        : 'rgba(26,46,44,0.05)',
                    }}
                  >
                    <PPText weight="semibold" size={13} color={earned ? (accent ?? PP.teal) : PP.ink2}>
                      {earned ? 'Geschafft' : 'Noch offen'}
                    </PPText>
                  </View>
                ) : (
                  <>
                    {slots
                      .filter((s) => (stepValues[s.tier] ?? 0) > 0)
                      .map((s) => {
                        const at = stepValues[s.tier];
                        const done = progress >= at;
                        const c = TIER_COLORS[s.tier];
                        return (
                          <View
                            key={s.tier}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              paddingVertical: 7,
                            }}
                          >
                            <View
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: done ? c.base : 'rgba(26,46,44,0.12)',
                              }}
                            />
                            <PPText
                              size={13}
                              weight={done ? 'semibold' : 'regular'}
                              color={done ? PP.ink : PP.ink2}
                              style={{ flex: 1 }}
                            >
                              {s.name}
                            </PPText>
                            <PPText size={12.5} color={done ? PP.ink2 : PP.ink3}>
                              {Math.min(progress, at)}/{at}
                            </PPText>
                          </View>
                        );
                      })}
                    {info.maxed && (
                      <PPText size={12.5} color={PP.ink2} style={{ marginTop: 6, textAlign: 'center' }}>
                        Alle Stufen geschafft.
                      </PPText>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={{ marginTop: 16, width: '100%' }}>
              <PPButton size="m" variant="secondary" onPress={onClose}>Schließen</PPButton>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function Badges() {
  const qc = useQueryClient();
  const { data: badges } = useBadges();
  const { data: userBadges } = useUserBadges();
  const { data: store } = useStore();
  // Stufennamen kommen aus den Rängen unter „Punkte & Ränge".
  const ranks = (store as any)?.tiers_json as { name: string; at: number }[] | undefined;
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<Badge | null>(null);
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

          // Einzel-Abzeichen kennen keine Stufen — "0/1 bis Gold" wäre dort
          // irreführend. Sie zeigen offen/erreicht, nicht einen Zählerstand.
          const single = b.kind === 'single';
          // Eigene Farbe für Einzel-Abzeichen: Sie stehen außerhalb der
          // Stufenlogik und sollen sich auch optisch davon abheben.
          const accent = normalizeHex(b.color);
          const ringColors: [string, string, string] =
            single && earned && accent
              ? [accent, accent, accent]
              : tierC
                ? [tierC.base, tierC.light, tierC.base]
                : ['rgba(26,46,44,0.18)', 'rgba(26,46,44,0.12)', 'rgba(26,46,44,0.18)'];

          return (
            <Pressable key={b.id} onPress={() => setOpen(b)} style={{ width: colWidth }}>
            <Card pad={14} radius={18} style={{ alignItems: 'center' }}>
              <GradientRing
                size={ring}
                stroke={6}
                progress={veiled ? 0 : single ? (earned ? 1 : 0) : info.maxed ? 1 : info.barProgress}
                gradientKey={b.id}
                colors={ringColors}
              >
                <BadgeMedallion
                  icon={(veiled ? 'lock' : b.icon) as IconName}
                  tier={info.current}
                  earned={earned}
                  size={ring - 18}
                  color={single && earned ? accent ?? undefined : undefined}
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
              ) : single ? (
                // Offen oder geschafft — dazwischen gibt es bei Einzeln nichts.
                <PPText
                  weight={earned ? 'semibold' : 'regular'}
                  size={10.5}
                  color={earned ? PP.ink3 : PP.ink2}
                  style={{ marginTop: 3, textAlign: 'center', letterSpacing: earned ? 0.4 : 0 }}
                >
                  {earned ? 'GESCHAFFT' : 'Noch offen'}
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
            </Pressable>
          );
        })}
      </View>

      <BadgeSheet
        badge={open}
        ub={open ? ubMap.get(open.id) : undefined}
        ranks={ranks}
        onClose={() => setOpen(null)}
      />
    </Screen>
  );
}
