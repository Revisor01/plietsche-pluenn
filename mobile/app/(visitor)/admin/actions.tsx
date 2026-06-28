import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useCampaigns, useAllBadges } from '../../../lib/hooks/useData';
import { createCampaign, updateCampaign, deleteCampaign } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill } from '../../../components/ui';
import type { Campaign, Badge } from '../../../lib/types';

const MULTIPLIERS = [1.5, 2, 3];

// ISO date helper: yyyy-mm-dd → PB date string.
function isoDay(d: string, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return '';
  return `${d.trim()} ${end ? '23:59:59' : '00:00:00'}.000Z`;
}
function fmtDay(s?: string) {
  return s ? s.slice(0, 10) : '';
}

function CampaignEditor({ campaign, badges, onSaved }: { campaign?: Campaign; badges: Badge[]; onSaved: () => void }) {
  const [name, setName] = useState(campaign?.name ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [multiplier, setMultiplier] = useState(campaign?.multiplier ?? 2);
  const [start, setStart] = useState(fmtDay(campaign?.starts_at));
  const [end, setEnd] = useState(fmtDay(campaign?.ends_at));
  const [badgeId, setBadgeId] = useState(campaign?.badge ?? '');
  const [busy, setBusy] = useState(false);

  // Only single, action-participation badges make sense to link.
  const actionBadges = badges.filter((b) => b.trigger_type === 'action_participation');

  const save = async () => {
    if (!name.trim() || !isoDay(start) || !isoDay(end, true)) {
      Alert.alert('Fehlt noch', 'Name und Zeitraum (JJJJ-MM-TT) angeben.');
      return;
    }
    setBusy(true);
    try {
      const payload: Partial<Campaign> = {
        name: name.trim(),
        description: description.trim(),
        multiplier,
        starts_at: isoDay(start),
        ends_at: isoDay(end, true),
        badge: badgeId || undefined,
      };
      if (campaign) await updateCampaign(campaign.id, payload);
      else await createCampaign(payload);
      onSaved();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte nicht speichern.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!campaign) return;
    Alert.alert('Aktion löschen?', name, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteCampaign(campaign.id); onSaved(); } },
    ]);
  };

  return (
    <Card pad={14} style={{ gap: 12 }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="z.B. Winterkleidung" />
      <Field label="Beschreibung" value={description} onChangeText={setDescription} placeholder="Kurzer Hinweis" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Von (JJJJ-MM-TT)" value={start} onChangeText={setStart} placeholder="2026-12-01" /></View>
        <View style={{ flex: 1 }}><Field label="Bis (JJJJ-MM-TT)" value={end} onChangeText={setEnd} placeholder="2026-12-31" /></View>
      </View>

      <View>
        <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>PUNKTE-MULTIPLIKATOR</PPText>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {MULTIPLIERS.map((m) => (
            <Pressable key={m} onPress={() => setMultiplier(m)}>
              <Pill bg={multiplier === m ? PP.teal : 'rgba(26,46,44,0.06)'} color={multiplier === m ? '#fff' : PP.ink2}>×{m}</Pill>
            </Pressable>
          ))}
        </View>
      </View>

      {actionBadges.length > 0 && (
        <View>
          <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>TEILNAHME-BADGE (optional)</PPText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pressable onPress={() => setBadgeId('')}>
              <Pill bg={!badgeId ? PP.teal : 'rgba(26,46,44,0.06)'} color={!badgeId ? '#fff' : PP.ink2}>keins</Pill>
            </Pressable>
            {actionBadges.map((b) => (
              <Pressable key={b.id} onPress={() => setBadgeId(b.id)}>
                <Pill bg={badgeId === b.id ? PP.teal : 'rgba(26,46,44,0.06)'} color={badgeId === b.id ? '#fff' : PP.ink2}>{b.name}</Pill>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><PPButton size="m" loading={busy} onPress={save}>{campaign ? 'Speichern' : 'Anlegen'}</PPButton></View>
        {campaign && <PPButton size="m" variant="ghost" fullWidth={false} onPress={remove}>Löschen</PPButton>}
      </View>
    </Card>
  );
}

export default function ActionsAdmin() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: campaigns, refetch } = useCampaigns();
  const { data: badges } = useAllBadges();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onSaved = async () => {
    setOpenId(null); setCreating(false);
    await refetch();
    await qc.invalidateQueries({ queryKey: ['campaign', 'active'] });
  };

  const now = '2026-06-28';
  const isActive = (c: Campaign) => fmtDay(c.starts_at) <= now && fmtDay(c.ends_at) >= now;

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Admin"
        title="Aktionen"
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
        trailing={<IconButton icon="plus" onPress={() => { setCreating(true); setOpenId(null); }} />}
      />

      {creating && (
        <>
          <SectionTitle title="Neue Aktion" />
          <View style={{ paddingHorizontal: 20 }}>
            <CampaignEditor badges={badges ?? []} onSaved={onSaved} />
          </View>
        </>
      )}

      <SectionTitle title="Aktionen" />
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {campaigns?.length ? (
          campaigns.map((c) => (
            <View key={c.id}>
              <Pressable onPress={() => setOpenId(openId === c.id ? null : c.id)}>
                <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(39,176,146,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="sparkles" size={20} color={PP.teal} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PPText weight="semibold" size={PP.fontSizes.md} color={PP.ink}>{c.name}</PPText>
                    <PPText size={PP.fontSizes.sm} color={PP.ink2}>×{c.multiplier} · {fmtDay(c.starts_at)} – {fmtDay(c.ends_at)}</PPText>
                  </View>
                  {isActive(c) && <Pill size="s" color={PP.teal} bg="rgba(39,176,146,0.12)">aktiv</Pill>}
                  <Icon name={openId === c.id ? 'chevron-down' : 'chevron-right'} size={18} color={PP.ink3} />
                </Card>
              </Pressable>
              {openId === c.id && (
                <View style={{ marginTop: 8 }}>
                  <CampaignEditor campaign={c} badges={badges ?? []} onSaved={onSaved} />
                </View>
              )}
            </View>
          ))
        ) : (
          <Card pad={16}><PPText size={PP.fontSizes.base} color={PP.ink2}>Noch keine Aktionen.</PPText></Card>
        )}
      </View>
    </Screen>
  );
}
