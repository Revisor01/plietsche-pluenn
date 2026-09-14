import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useAllBadges, useCampaigns, useStore } from '../../../lib/hooks/useData';
import { badgeTierSlots, type TierStep } from '../../../lib/format';
import type { Campaign } from '../../../lib/types';
import { createBadge, updateBadge, deleteBadge, updateCampaign, type BadgeInput } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill, Toggle, IconPicker, Hint, ColorPicker } from '../../../components/ui';
import type { Badge } from '../../../lib/types';
import { useGoBack } from '../../../lib/hooks/useGoBack';
import { errorText } from '../../../lib/errors';

const TRIGGERS: { key: string; label: string; kinds: string[] }[] = [
  { key: 'visits', label: 'Besuche', kinds: ['tiered', 'single'] },
  { key: 'scans', label: 'Teile geholt', kinds: ['tiered', 'single'] },
  { key: 'items_brought', label: 'Teile gebracht', kinds: ['tiered', 'single'] },
  { key: 'streak_weeks', label: 'Streak-Wochen', kinds: ['tiered', 'single'] },
  { key: 'years_active', label: 'Jahre aktiv (Treue)', kinds: ['single'] },
  { key: 'action_participation', label: 'Aktions-Teilnahme', kinds: ['single', 'tiered'] },
];

// Farbe je Stufen-Slot. Die Namen kommen aus den Rängen, die Farben bleiben
// an der Stufe — daran hängen auch die Medaillons in der Sammlung.
const TIER_COLOR: Record<string, string> = {
  bronze: PP.bronze,
  silber: PP.silver,
  gold: PP.gold,
  platin: PP.platin,
  diamant: PP.diamant,
};

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
  is_secret: boolean;
  color: string;
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
    is_secret: b?.is_secret ?? false,
    color: b?.color ?? '',
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
    is_secret: d.is_secret,
    color: d.kind === 'single' ? d.color : '',
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

function BadgeEditor({ badge, campaigns, ranks, onSaved }: { badge?: Badge; campaigns: Campaign[]; ranks?: TierStep[]; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(toDraft(badge));
  const [busy, setBusy] = useState(false);

  // Stufen kommen aus den Rängen unter „Punkte & Ränge" — Anzahl und Namen.
  const slots = badgeTierSlots(ranks);
  const slotNames = slots.map((s) => s.name).join('→');
  const isAction = draft.trigger_type === 'action_participation';

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setTier = (tier: string, v: string) => setDraft((d) => ({ ...d, tiers: { ...d.tiers, [tier]: v } }));
  const setReward = (tier: string, v: string) => setDraft((d) => ({ ...d, rewards: { ...d.rewards, [tier]: v } }));

  const save = async () => {
    if (!draft.name.trim()) {
      Alert.alert('Fehlt noch', 'Bitte gib dem Badge einen Namen.');
      return;
    }
    if (isAction && !draft.campaign) {
      Alert.alert('Aktion fehlt', 'Bitte wähle die Aktion, zu der dieses Abzeichen gehört.');
      return;
    }
    setBusy(true);
    try {
      const saved = badge
        ? await updateBadge(badge.id, draftToInput(draft))
        : await createBadge(draftToInput(draft));
      // Die Kopplung steht in zwei Feldern: badges.campaign (Fortschritt) und
      // campaigns.badge (Vergabe-Cron). Nur eins zu pflegen ließ Abzeichen
      // stumm ausfallen — deshalb wird die Gegenseite hier mitgesetzt.
      if (isAction && draft.campaign) {
        const camp = campaigns.find((c) => c.id === draft.campaign);
        if (camp && camp.badge !== saved.id) {
          await updateCampaign(camp.id, { badge: saved.id });
        }
      }
      onSaved();
    } catch (e: any) {
      Alert.alert('Fehler', errorText(e, 'Konnte nicht speichern.'));
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
            Alert.alert('Fehler', errorText(e, 'Konnte nicht löschen.'));
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

      {/* Art: gestuft oder einmalig. Bei Aktionsbadges anders benannt — dort
          ist „Teilnahme" der geläufige Fall, nicht „Einzel-Abzeichen". */}
      <View>
        <PPText weight="semibold" size="xs" color={PP.ink3} style={{ marginBottom: 6, letterSpacing: PP.tracking.label }}>
          ART
        </PPText>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={() => set({ kind: 'tiered', trigger_type: isAction ? 'action_participation' : 'visits' })}>
            <Pill bg={draft.kind === 'tiered' ? PP.teal : 'rgba(26,46,44,0.06)'} color={draft.kind === 'tiered' ? '#fff' : PP.ink2}>
              Stufen
            </Pill>
          </Pressable>
          <Pressable onPress={() => set({ kind: 'single' })}>
            <Pill bg={draft.kind === 'single' ? PP.teal : 'rgba(26,46,44,0.06)'} color={draft.kind === 'single' ? '#fff' : PP.ink2}>
              Einzel
            </Pill>
          </Pressable>
        </View>
        <PPText size="sm" color={PP.ink2} style={{ marginTop: 6 }}>
          {isAction
            ? draft.kind === 'single'
              ? 'Einmal im Aktionszeitraum dabei gewesen — fertig.'
              : 'Nach Anzahl der Beiträge zur Aktion. Ziele unten eintragen.'
            : draft.kind === 'single'
              ? 'Gibt es genau einmal.'
              : `Zählt hoch: ${slotNames}.`}
        </PPText>
      </View>

      <View>
        <PPText weight="semibold" size="xs" color={PP.ink3} style={{ marginBottom: 6, letterSpacing: PP.tracking.label }}>
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
          <PPText weight="semibold" size="xs" color={PP.ink3} style={{ marginBottom: 6, letterSpacing: PP.tracking.label }}>GEKOPPELTE AKTION</PPText>
          {campaigns.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {campaigns.map((c) => (
                <Pressable key={c.id} onPress={() => set({ campaign: c.id })}>
                  <Pill bg={draft.campaign === c.id ? PP.teal : 'rgba(26,46,44,0.06)'} color={draft.campaign === c.id ? '#fff' : PP.ink2}>{c.name}</Pill>
                </Pressable>
              ))}
            </View>
          ) : (
            <PPText size="sm" color={PP.ink2}>Lege zuerst eine Aktion an, dann kannst du sie hier koppeln.</PPText>
          )}
          <PPText size="sm" color={PP.ink2} style={{ marginTop: 6 }}>
            Beim Freigeben markiert der Helfer, ob ein Teil zu dieser Aktion zählt. Bei „Stufen" steigt das Abzeichen ab den unten gesetzten Zielen.
          </PPText>
        </View>
      )}

      {draft.kind === 'single' ? (
        <View style={{ gap: 8 }}>
          {draft.trigger_type === 'years_active' && (
            <PPText size="sm" color={PP.ink2}>
              Wird am 31.12. rückwirkend vergeben — nur wenn im Jahr aktiv. „ab" = ab welchem aktiven Jahr (1 = erstes Jahr).
            </PPText>
          )}
          {isAction && (
            <PPText size="sm" color={PP.ink2}>
              Wer während der Aktion dabei war, bekommt es — einmal, ohne Schwelle.
            </PPText>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Bei Teilnahme wertet der Server keine Schwelle aus (die Vergabe
                läuft über die Aktion selbst). Das Feld hier zu zeigen, hätte
                eine Einstellung vorgetäuscht, die es nicht gibt. */}
            {!isAction && (
              <View style={{ flex: 1 }}>
                <Field label="ab (Schwelle)" value={draft.trigger_value} onChangeText={(v) => set({ trigger_value: v })} keyboardType="number-pad" placeholder="1" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Field label="Bonus-Punkte" value={draft.points_reward} onChangeText={(v) => set({ points_reward: v })} keyboardType="number-pad" placeholder="0" />
            </View>
          </View>
          {/* Eigene Farbe nur bei Einzel-Abzeichen: Gestufte tragen die Farbe
              der erreichten Stufe, da wäre eine zweite Farbe irreführend. */}
          <ColorPicker value={draft.color} onChange={(hex) => set({ color: hex })} label="FARBE, WENN ERREICHT" />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <PPText weight="semibold" size="xs" color={PP.ink3} style={{ letterSpacing: PP.tracking.label }}>
            STUFEN — „ab" = ab wie vielen, Bonus = einmalige Punkte
          </PPText>
          <PPText size="sm" color={PP.ink2} style={{ marginTop: -2 }}>
            Stufen und Namen kommen aus „Punkte & Ränge". Leer lassen heißt: Die
            Stufe gibt es bei diesem Abzeichen nicht.
          </PPText>
          {slots.map((s) => (
            <View key={s.tier} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 78, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TIER_COLOR[s.tier] }} />
                <PPText size="sm" color={PP.ink} numberOfLines={1}>{s.name}</PPText>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="ab" value={draft.tiers[s.tier]} onChangeText={(v) => setTier(s.tier, v)} keyboardType="number-pad" placeholder="0" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Bonus" value={draft.rewards[s.tier]} onChangeText={(v) => setReward(s.tier, v)} keyboardType="number-pad" placeholder="0" />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <PPText weight="semibold" size="base" color={PP.ink}>Sichtbar für Nutzer</PPText>
          <PPText size="sm" color={PP.ink2} style={{ marginTop: 2 }}>
            Aus: Das Badge ist komplett aus der App genommen.
          </PPText>
        </View>
        <Toggle value={draft.is_visible} onChange={(v) => set({ is_visible: v })} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <PPText weight="semibold" size="base" color={PP.ink}>Geheim</PPText>
          <PPText size="sm" color={PP.ink2} style={{ marginTop: 2 }}>
            Steht grau als „Geheim" in der Sammlung — Name und Fortschritt
            erscheinen erst mit der ersten Stufe.
          </PPText>
        </View>
        <Toggle value={draft.is_secret} onChange={(v) => set({ is_secret: v })} />
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
  const goBack = useGoBack();
  const qc = useQueryClient();
  const { data: badges, refetch } = useAllBadges();
  const { data: campaigns } = useCampaigns();
  const { data: store } = useStore();
  const ranks = (store as any)?.tiers_json as TierStep[] | undefined;
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onSaved = async () => {
    setOpenId(null);
    setCreating(false);
    await refetch();
    await qc.invalidateQueries({ queryKey: ['badges'] });
    await qc.invalidateQueries({ queryKey: ['all_badges'] });
    // Der Editor pflegt die Gegenseite der Kopplung mit (campaigns.badge) —
    // die Aktions-Listen tragen den alten Stand, bis sie neu geladen werden.
    await qc.invalidateQueries({ queryKey: ['campaigns'] });
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Admin"
        title="Badges"
        leading={<IconButton icon="chevron-left" onPress={goBack} />}
        trailing={<IconButton icon="plus" onPress={() => { setCreating(true); setOpenId(null); }} />}
      />

      <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
        <Hint icon="info" tone="info">
          Abzeichen belohnen Aktivität. „Stufen" steigen mit jedem Ziel und geben dabei einen Bonus; „Einzel" gibt es genau einmal — etwa für Jahres-Treue oder die Teilnahme an einer Aktion. Die Stufen kommen aus „Punkte & Ränge".
        </Hint>
      </View>

      {creating && (
        <>
          <SectionTitle title="Neues Badge" />
          <View style={{ paddingHorizontal: 20 }}>
            <BadgeEditor campaigns={campaigns ?? []} ranks={ranks} onSaved={onSaved} />
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
                    <Icon name="medal" size={PP.iconSizes.lg} color={PP.gold} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PPText weight="semibold" size="md" color={PP.ink}>{b.name}</PPText>
                    <PPText size="sm" color={PP.ink2}>
                      {TRIGGERS.find((t) => t.key === b.trigger_type)?.label ?? b.trigger_type} · {b.tier_bronze}/{b.tier_silber}/{b.tier_gold}/{b.tier_platin}
                    </PPText>
                  </View>
                  {b.is_secret && <Pill size="s" icon="lock" color={PP.ink2} bg="rgba(26,46,44,0.08)">geheim</Pill>}
                  {!b.is_visible && <Pill size="s" color={PP.ink2} bg="rgba(26,46,44,0.08)">versteckt</Pill>}
                  <Icon name={openId === b.id ? 'chevron-down' : 'chevron-right'} size={PP.iconSizes.md} color={PP.ink3} />
                </Card>
              </Pressable>
              {openId === b.id && (
                <View style={{ marginTop: 8 }}>
                  <BadgeEditor badge={b} campaigns={campaigns ?? []} ranks={ranks} onSaved={onSaved} />
                </View>
              )}
            </View>
          ))
        ) : (
          <Card pad={16}><PPText size="base" color={PP.ink2}>Noch keine Badges.</PPText></Card>
        )}
      </View>
    </Screen>
  );
}
