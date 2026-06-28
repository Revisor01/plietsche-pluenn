import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useAllBadges, useCampaigns } from '../../../lib/hooks/useData';
import type { Campaign } from '../../../lib/types';
import { createBadge, updateBadge, deleteBadge, type BadgeInput } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill, Toggle, IconPicker } from '../../../components/ui';
import type { Badge } from '../../../lib/types';

const TRIGGERS: { key: string; label: string; kinds: string[] }[] = [
  { key: 'visits', label: 'Besuche', kinds: ['tiered', 'single'] },
  { key: 'scans', label: 'Teile geholt', kinds: ['tiered', 'single'] },
  { key: 'items_brought', label: 'Teile gebracht', kinds: ['tiered', 'single'] },
  { key: 'streak_weeks', label: 'Streak-Wochen', kinds: ['tiered', 'single'] },
  { key: 'years_active', label: 'Jahre aktiv (Treue)', kinds: ['single'] },
  { key: 'action_participation', label: 'Aktions-Teilnahme', kinds: ['single', 'tiered'] },
];

const TIERS = [
  { key: 'bronze', label: 'Bronze', color: PP.bronze },
  { key: 'silber', label: 'Silber', color: PP.silver },
  { key: 'gold', label: 'Gold', color: PP.gold },
  { key: 'platin', label: 'Platin', color: PP.platin },
  { key: 'diamant', label: 'Diamant', color: PP.diamant },
] as const;

type Draft = {
  name: string;
  description: string;
  icon: string;
  kind: 'tiered' | 'single';
  trigger_type: string;
  trigger_value: string; // single: threshold
  points_reward: string; // single: one-off bonus
  campaign: string; // action_participation: linked campaign id
  is_visible: boolean;
  tiers: Record<string, string>; // threshold per tier
  rewards: Record<string, string>; // reward per tier
};

function toDraft(b?: Badge): Draft {
  return {
    name: b?.name ?? '',
    description: b?.description ?? '',
    icon: b?.icon ?? 'medal',
    kind: b?.kind ?? 'tiered',
    trigger_type: b?.trigger_type ?? 'visits',
    trigger_value: String(b?.trigger_value ?? ''),
    points_reward: String(b?.points_reward ?? ''),
    campaign: b?.campaign ?? '',
    is_visible: b?.is_visible ?? true,
    tiers: {
      bronze: String(b?.tier_bronze ?? ''),
      silber: String(b?.tier_silber ?? ''),
      gold: String(b?.tier_gold ?? ''),
      platin: String(b?.tier_platin ?? ''),
      diamant: String(b?.tier_diamant ?? ''),
    },
    rewards: {
      bronze: String(b?.reward_bronze ?? ''),
      silber: String(b?.reward_silber ?? ''),
      gold: String(b?.reward_gold ?? ''),
      platin: String(b?.reward_platin ?? ''),
      diamant: String(b?.reward_diamant ?? ''),
    },
  };
}

function draftToInput(d: Draft): BadgeInput {
  const num = (v: string) => (v.trim() === '' ? 0 : parseInt(v, 10) || 0);
  const base: any = {
    name: d.name.trim(),
    description: d.description.trim(),
    icon: d.icon.trim() || 'medal',
    slug: d.name.trim().toLowerCase().replace(/\s+/g, '-'),
    kind: d.kind,
    trigger_type: d.trigger_type,
    campaign: d.trigger_type === 'action_participation' ? (d.campaign || null) : null,
    is_visible: d.is_visible,
  };
  if (d.kind === 'single') {
    base.trigger_value = num(d.trigger_value || '1') || 1;
    base.points_reward = num(d.points_reward);
    // zero out tier fields for single badges
    base.tier_bronze = 0; base.tier_silber = 0; base.tier_gold = 0; base.tier_platin = 0;
    base.reward_bronze = 0; base.reward_silber = 0; base.reward_gold = 0; base.reward_platin = 0;
  } else {
    base.tier_bronze = num(d.tiers.bronze);
    base.tier_silber = num(d.tiers.silber);
    base.tier_gold = num(d.tiers.gold);
    base.tier_platin = num(d.tiers.platin);
    base.tier_diamant = num(d.tiers.diamant);
    base.reward_bronze = num(d.rewards.bronze);
    base.reward_silber = num(d.rewards.silber);
    base.reward_gold = num(d.rewards.gold);
    base.reward_platin = num(d.rewards.platin);
    base.reward_diamant = num(d.rewards.diamant);
  }
  return base as BadgeInput;
}

function BadgeEditor({ badge, campaigns, onSaved }: { badge?: Badge; campaigns: Campaign[]; onSaved: () => void }) {
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
      <IconPicker value={draft.icon} onChange={(ic) => set({ icon: ic })} />

      {/* Art: Tier-Badge (Bronze→Platin) oder einfaches Abzeichen */}
      <View>
        <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>
          ART
        </PPText>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={() => set({ kind: 'tiered', trigger_type: 'visits' })}>
            <Pill bg={draft.kind === 'tiered' ? PP.teal : 'rgba(26,46,44,0.06)'} color={draft.kind === 'tiered' ? '#fff' : PP.ink2}>
              Stufen (Bronze→Platin)
            </Pill>
          </Pressable>
          <Pressable onPress={() => set({ kind: 'single' })}>
            <Pill bg={draft.kind === 'single' ? PP.teal : 'rgba(26,46,44,0.06)'} color={draft.kind === 'single' ? '#fff' : PP.ink2}>
              Einzel-Abzeichen
            </Pill>
          </Pressable>
        </View>
      </View>

      <View>
        <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>
          AUSLÖSER — WOFÜR ES VERGEBEN WIRD
        </PPText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {TRIGGERS.filter((t) => t.kinds.includes(draft.kind)).map((t) => (
            <Pressable key={t.key} onPress={() => set({ trigger_type: t.key })}>
              <Pill bg={draft.trigger_type === t.key ? PP.teal : 'rgba(26,46,44,0.06)'} color={draft.trigger_type === t.key ? '#fff' : PP.ink2}>
                {t.label}
              </Pill>
            </Pressable>
          ))}
        </View>
      </View>

      {draft.trigger_type === 'action_participation' && (
        <View>
          <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>GEKOPPELTE AKTION</PPText>
          {campaigns.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {campaigns.map((c) => (
                <Pressable key={c.id} onPress={() => set({ campaign: c.id })}>
                  <Pill bg={draft.campaign === c.id ? PP.teal : 'rgba(26,46,44,0.06)'} color={draft.campaign === c.id ? '#fff' : PP.ink2}>{c.name}</Pill>
                </Pressable>
              ))}
            </View>
          ) : (
            <PPText size={PP.fontSizes.sm} color={PP.ink2}>Lege zuerst eine Aktion an, dann kannst du sie hier koppeln.</PPText>
          )}
          <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 6 }}>
            Beim Freigeben markiert der Helfer, ob ein Teil zu dieser Aktion zählt. Bei „Stufen" gibt es Bronze/Silber/… ab den unten gesetzten Schwellen.
          </PPText>
        </View>
      )}

      {draft.kind === 'single' ? (
        <View style={{ gap: 8 }}>
          {draft.trigger_type === 'years_active' && (
            <PPText size={PP.fontSizes.sm} color={PP.ink2}>
              Wird am 31.12. rückwirkend vergeben — nur wenn im Jahr aktiv. „ab" = ab welchem aktiven Jahr (1 = erstes Jahr).
            </PPText>
          )}
          {draft.trigger_type === 'action_participation' && (
            <PPText size={PP.fontSizes.sm} color={PP.ink2}>
              Wird vergeben, wer während der gekoppelten Aktion aktiv war. Verknüpfe das Badge in der Aktion.
            </PPText>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="ab (Schwelle)" value={draft.trigger_value} onChangeText={(v) => set({ trigger_value: v })} keyboardType="number-pad" placeholder="1" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Bonus-Punkte" value={draft.points_reward} onChangeText={(v) => set({ points_reward: v })} keyboardType="number-pad" placeholder="0" />
            </View>
          </View>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ letterSpacing: 0.3 }}>
            STUFEN — „ab" = ab wie vielen, Punkte = einmaliger Bonus
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
                <Field label="Bonus" value={draft.rewards[t.key]} onChangeText={(v) => setReward(t.key, v)} keyboardType="number-pad" placeholder="0" />
              </View>
            </View>
          ))}
        </View>
      )}

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
  const { data: campaigns } = useCampaigns();
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

      <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
        <Card pad={12} style={{ backgroundColor: 'rgba(39,176,146,0.07)' }}>
          <PPText size={PP.fontSizes.sm} color={PP.ink2}>
            Badges belohnen Aktivität. „Stufen" (Bronze→Diamant) vergeben bei jeder Schwelle einen Bonus; „Einzel-Abzeichen" sind einmalig (z.B. Jahres-Treue oder Aktions-Teilnahme). „ab" = wie oft, „Bonus" = einmalige Punkte beim Erreichen.
          </PPText>
        </Card>
      </View>

      {creating && (
        <>
          <SectionTitle title="Neues Badge" />
          <View style={{ paddingHorizontal: 20 }}>
            <BadgeEditor campaigns={campaigns ?? []} onSaved={onSaved} />
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
                  <BadgeEditor badge={b} campaigns={campaigns ?? []} onSaved={onSaved} />
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
