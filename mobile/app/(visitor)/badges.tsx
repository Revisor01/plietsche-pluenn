import { View } from 'react-native';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { PP } from '../../lib/theme';
import { useBadges, useUserBadges } from '../../lib/hooks/useData';
import { useAuth } from '../../lib/hooks/useAuth';
import { badgeTierInfo } from '../../lib/format';
import { Screen, PPHeader, PPText, BadgeMedallion, ProgressBar, Pill, Card, IconButton } from '../../components/ui';
import type { IconName } from '../../lib/icons';

export default function Badges() {
  const qc = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: badges } = useBadges();
  const { data: userBadges } = useUserBadges();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['user_badges'] });
    await qc.invalidateQueries({ queryKey: ['badges'] });
    setRefreshing(false);
  }, [qc]);

  const ubMap = new Map((userBadges ?? []).map((ub) => [ub.badge, ub]));

  return (
    <Screen padBottom={110} refreshing={refreshing} onRefresh={onRefresh}>
      <PPHeader
        subtitle="Sammlung"
        title="Watt'n Schatz"
        trailing={isAdmin ? <IconButton icon="gear" onPress={() => router.push('/(visitor)/admin/badges')} /> : undefined}
      />

      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {(badges ?? []).map((b) => {
          const ub = ubMap.get(b.id);
          const progress = ub?.progress ?? 0;
          const info = badgeTierInfo(b, progress);
          const earned = info.current !== 'none';

          return (
            <Card key={b.id} pad={14} radius={18} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <BadgeMedallion icon={b.icon as IconName} tier={info.current} earned={earned} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <PPText weight="semibold" size={14} color={PP.ink} numberOfLines={1} style={{ flex: 1 }}>
                    {b.name}
                  </PPText>
                  {earned && (
                    <PPText weight="semibold" size={10.5} color={PP.ink3} style={{ letterSpacing: 0.4 }}>
                      {info.currentName.toUpperCase()}
                    </PPText>
                  )}
                </View>
                <PPText size={11.5} color={PP.ink2} style={{ marginTop: 2, marginBottom: 8 }}>
                  {b.description}
                </PPText>

                {info.maxed ? (
                  <Pill icon="check" size="s">
                    Maximal erreicht
                  </Pill>
                ) : (
                  <View>
                    <ProgressBar value={info.barProgress} height={5} tier={info.current === 'none' ? undefined : info.current} />
                    <PPText size={10.5} color={PP.ink2} style={{ marginTop: 4 }}>
                      {progress}/{info.target} bis {info.nextName}
                    </PPText>
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
