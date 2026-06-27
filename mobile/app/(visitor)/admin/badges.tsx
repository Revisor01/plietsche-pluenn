import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useAllBadges } from '../../../lib/hooks/useData';
import { createBadge, updateBadge, deleteBadge, type BadgeInput } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill, Toggle } from '../../../components/ui';
import type { Badge } from '../../../lib/types';

const TRIGGERS: { key: string; label: string }[] = [
  { key: 'visits', label: 'Besuche' },
  { key: 'scans', label: 'Teile geholt' },
  { key: 'items_brought', label: 'Teile gebracht' },
  { key: 'streak_weeks', label: 'Streak-Wochen' },
];

const TIERS = [
  { key: 'bronze', label: 'Bronze', color: PP.bronze },
  { key: 'silber', label: 'Silber', color: PP.silver },
  { key: 'gold', label: 'Gold', color: PP.gold },
  { key: 'platin', label: 'Platin', color: PP.platin },
] as const;

type Draft = {
  name: string;
  description: string;
  icon: string;
  trigger_type: string;
  is_visible: boolean;
  tiers: Record<string, string>; // threshold per tier
  rewards: Record<string, string>; // reward per tier
};

function toDraft(b?: Badge): Draft {
  return {
    name: b?.name ?? '',
    description: b?.description ?? '',
    icon: b?.icon ?? 'medal',
    trigger_type: b?.trigger_type ?? 'visits',
    is_visible: b?.is_visible ?? true,
    tiers: {
      bronze: String(b?.tier_bronze ?? ''),
      silber: String(b?.tier_silber ?? ''),
      gold: String(b?.tier_gold ?? ''),
      platin: String(b?.tier_platin ?? ''),
    },
    rewards: {
      bronze: String(b?.reward_bronze ?? ''),
      silber: String(b?.reward_silber ?? ''),
      gold: String(b?.reward_gold ?? ''),
      platin: String(b?.reward_platin ?? ''),
    },
  };
}

function draftToInput(d: Draft): BadgeInput {
  const num = (v: string) => (v.trim() === '' ? 0 : parseInt(v, 10) || 0);
  return {
    name: d.name.trim(),
    description: d.description.trim(),
    icon: d.icon.trim() || 'medal',
    slug: d.name.trim().toLowerCase().replace(/\s+/g, '-'),
    trigger_type: d.trigger_type,
    is_visible: d.is_visible,
    tier_bronze: num(d.tiers.bronze),
    tier_silber: num(d.tiers.silber),
    tier_gold: num(d.tiers.gold),
    tier_platin: num(d.tiers.platin),
    reward_bronze: num(d.rewards.bronze),
    reward_silber: num(d.rewards.silber),
    reward_gold: num(d.rewards.gold),
    reward_platin: num(d.rewards.platin),
  } as BadgeInput;
}

function BadgeEditor({ badge, onSaved }: { badge?: Badge; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(toDraft(badge));
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setTier = (tier: string, v: string) => setDraft((d) => ({ ...d, tiers: { ...d.tiers, [tier]: v } }));
  const setReward = (tier: string, v: string) => setDraft((d) => ({ ...d, rewards: { ...d.rewards, [tier]: v } }));

  const save = async () => {
    if (!draft.name.trim()) {
      Alert.alert('Fehlt noch', 'Bitte gib dem Badge einen Namen.');
      return;
    }
    setBusy(true);
    try {
      if (badge) await updateBadge(badge.id, draftToInput(draft));
      else await createBadge(draftToInput(draft));
      onSaved();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte nicht speichern.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!badge) return;
    Alert.alert('Badge löschen?', `"${badge.name}" wirklich löschen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBadge(badge.id);
            onSaved();
          } catch (e: any) {
            Alert.alert('Fehler', e?.message ?? 'Konnte nicht löschen.');
          }
        },
      },
    ]);
  };

  return (
    <Card pad={14} style={{ gap: 12 }}>
      <Field label="Name" value={draft.name} onChangeText={(v) => set({ name: v })} placeholder="z.B. Stammgast" />
      <Field label="Beschreibung" value={draft.description} onChangeText={(v) => set({ description: v })} placeholder="Kurzer Text" />
      <Field label="Icon (FA6-Name)" value={draft.icon} onChangeText={(v) => set({ icon: v })} placeholder="medal" />

      <View>
        <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>
          AUSLÖSER
        </PPText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {TRIGGERS.map((t) => (
            <Pressable key={t.key} onPress={() => set({ trigger_type: t.key })}>
              <Pill bg={draft.trigger_type === t.key ? PP.teal : 'rgba(26,46,44,0.06)'} color={draft.trigger_type === t.key ? '#fff' : PP.ink2}>
                {t.label}
              </Pill>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ letterSpacing: 0.3 }}>
          STUFEN — SCHWELLE & PUNKTE
        </PPText>
        {TIERS.map((t) => (
          <View key={t.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 64, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color }} />
              <PPText size={PP.fontSizes.sm} color={PP.ink}>{t.label}</PPText>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="ab" value={draft.tiers[t.key]} onChangeText={(v) => setTier(t.key, v)} keyboardType="number-pad" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Punkte" value={draft.rewards[t.key]} onChangeText={(v) => setReward(t.key, v)} keyboardType="number-pad" placeholder="0" />
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>Sichtbar für Nutzer</PPText>
        </View>
        <Toggle value={draft.is_visible} onChange={(v) => set({ is_visible: v })} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <PPButton size="m" loading={busy} onPress={save}>{badge ? 'Speichern' : 'Anlegen'}</PPButton>
        </View>
        {badge && (
          <PPButton size="m" variant="ghost" fullWidth={false} onPress={remove}>Löschen</PPButton>
        )}
      </View>
    </Card>
  );
}

export default function BadgeAdmin() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: badges, refetch } = useAllBadges();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onSaved = async () => {
    setOpenId(null);
    setCreating(false);
    await refetch();
    await qc.invalidateQueries({ queryKey: ['badges'] });
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Admin"
        title="Badges"
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
        trailing={<IconButton icon="plus" onPress={() => { setCreating(true); setOpenId(null); }} />}
      />

      {creating && (
        <>
          <SectionTitle title="Neues Badge" />
          <View style={{ paddingHorizontal: 20 }}>
            <BadgeEditor onSaved={onSaved} />
          </View>
        </>
      )}

      <SectionTitle title="Bestehende Badges" />
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {badges?.length ? (
          badges.map((b) => (
            <View key={b.id}>
              <Pressable onPress={() => setOpenId(openId === b.id ? null : b.id)}>
                <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(232,185,35,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="medal" size={20} color={PP.gold} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PPText weight="semibold" size={PP.fontSizes.md} color={PP.ink}>{b.name}</PPText>
                    <PPText size={PP.fontSizes.sm} color={PP.ink2}>
                      {TRIGGERS.find((t) => t.key === b.trigger_type)?.label ?? b.trigger_type} · {b.tier_bronze}/{b.tier_silber}/{b.tier_gold}/{b.tier_platin}
                    </PPText>
                  </View>
                  {!b.is_visible && <Pill size="s" color={PP.ink2} bg="rgba(26,46,44,0.08)">versteckt</Pill>}
                  <Icon name={openId === b.id ? 'chevron-down' : 'chevron-right'} size={18} color={PP.ink3} />
                </Card>
              </Pressable>
              {openId === b.id && (
                <View style={{ marginTop: 8 }}>
                  <BadgeEditor badge={b} onSaved={onSaved} />
                </View>
              )}
            </View>
          ))
        ) : (
          <Card pad={16}><PPText size={PP.fontSizes.base} color={PP.ink2}>Noch keine Badges.</PPText></Card>
        )}
      </View>
    </Screen>
  );
}
