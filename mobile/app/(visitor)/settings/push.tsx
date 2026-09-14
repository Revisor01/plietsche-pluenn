import { View } from 'react-native';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { type IconName } from '../../../lib/icons';
import { pb } from '../../../lib/pb';
import { useCurrentUser } from '../../../lib/hooks/useData';
import { Screen, PPHeader, PPText, Card, Toggle, IconButton, IconTile } from '../../../components/ui';
import { useGoBack } from '../../../lib/hooks/useGoBack';

type PrefKey = 'push_streak_enabled' | 'push_campaign_enabled' | 'push_badge_enabled' | 'push_other_enabled';

const ROWS: { key: PrefKey; icon: IconName; title: string; sub: string }[] = [
  { key: 'push_streak_enabled', icon: 'flame', title: 'Streak-Erinnerung', sub: 'Freitags, wenn dein Streak zu reißen droht.' },
  { key: 'push_campaign_enabled', icon: 'megaphone', title: 'Aktionen & Kampagnen', sub: 'Doppelpunkte, Saison-Aktionen.' },
  { key: 'push_badge_enabled', icon: 'medal', title: 'Neue Badges', sub: 'Bei einer Freischaltung.' },
  { key: 'push_other_enabled', icon: 'bell', title: 'Sonstiges aus dem Laden', sub: 'Selten — nur was wichtig ist.' },
];

export default function PushSettings() {
  const goBack = useGoBack();
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    push_streak_enabled: true,
    push_campaign_enabled: true,
    push_badge_enabled: true,
    push_other_enabled: false,
  });

  useEffect(() => {
    if (user) {
      setPrefs({
        push_streak_enabled: user.push_streak_enabled,
        push_campaign_enabled: user.push_campaign_enabled,
        push_badge_enabled: user.push_badge_enabled,
        push_other_enabled: user.push_other_enabled,
      });
    }
  }, [user]);

  const toggle = async (key: PrefKey, val: boolean) => {
    setPrefs((p) => ({ ...p, [key]: val }));
    try {
      if (user) await pb.collection('users').update(user.id, { [key]: val });
      qc.invalidateQueries({ queryKey: ['me'] });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !val })); // revert on failure
    }
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Einstellungen"
        title="Benachrichtigungen"
        leading={<IconButton icon="chevron-left" onPress={goBack} />}
      />

      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.lg }}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {ROWS.map((row, i) => (
            <View
              key={row.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: PP.space.lg,
                paddingHorizontal: PP.space.lg,
                paddingVertical: PP.space.lg,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: PP.hairline,
              }}
            >
              <IconTile icon={row.icon} size="s" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <PPText weight="semibold" size="base" color={PP.ink}>
                  {row.title}
                </PPText>
                <PPText size="sm" color={PP.ink2} style={{ marginTop: 2, lineHeight: PP.fontSizes.sm * PP.leading.normal }}>
                  {row.sub}
                </PPText>
              </View>
              <Toggle value={prefs[row.key]} onChange={(v) => toggle(row.key, v)} />
            </View>
          ))}
        </Card>
        <PPText size="sm" color={PP.ink2} style={{ paddingHorizontal: PP.space.sm, lineHeight: PP.fontSizes.sm * PP.leading.normal }}>
          Wir benachrichtigen so wenig wie möglich. Versprochen. Watt zu viel ist, ist zu viel.
        </PPText>
      </View>
    </Screen>
  );
}
