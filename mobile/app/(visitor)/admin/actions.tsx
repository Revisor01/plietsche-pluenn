import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useCampaigns, useAllBadges } from '../../../lib/hooks/useData';
import { createCampaign, updateCampaign, deleteCampaign } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill, DateField, formatDE } from '../../../components/ui';
import type { Campaign, Badge } from '../../../lib/types';

const MULTIPLIERS = [1.5, 2, 3];

// Parse a PB datetime string into a local Date (for the picker).
function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}
// Local day → UTC ISO. Start = local 00:00, end = local 23:59:59. The device's
// timezone (Europe/Berlin) is applied by the Date constructor, so a campaign
// "1.12.–31.12." covers the full local days incl. the right offset.
function dayStartIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
}
function dayEndIso(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
}

function CampaignEditor({ campaign, badges, onSaved }: { campaign?: Campaign; badges: Badge[]; onSaved: () => void }) {
  const [name, setName] = useState(campaign?.name ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [multiplier, setMultiplier] = useState(campaign?.multiplier ?? 2);
  const [start, setStart] = useState<Date | null>(parseDate(campaign?.starts_at));
  const [end, setEnd] = useState<Date | null>(parseDate(campaign?.ends_at));
  const [badgeId, setBadgeId] = useState(campaign?.badge ?? '');
  const [busy, setBusy] = useState(false);

  // Only single, action-participation badges make sense to link.
  const actionBadges = badges.filter((b) => b.trigger_type === 'action_participation');

  const save = async () => {
    if (!name.trim() || !start || !end) {
      Alert.alert('Fehlt noch', 'Bitte Name und Zeitraum angeben.');
      return;
    }
    if (end < start) {
      Alert.alert('Zeitraum', 'Das Enddatum muss nach dem Startdatum liegen.');
      return;
    }
    setBusy(true);
    try {
      const payload: Partial<Campaign> = {
        name: name.trim(),
        description: description.trim(),
        multiplier,
        starts_at: dayStartIso(start),
        ends_at: dayEndIso(end),
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
        <View style={{ flex: 1 }}><DateField label="Von" value={start} onChange={setStart} /></View>
        <View style={{ flex: 1 }}><DateField label="Bis" value={end} onChange={setEnd} /></View>
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

      <View>
        <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>TEILNAHME-BADGE (optional)</PPText>
        {actionBadges.length > 0 ? (
          <>
            <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginBottom: 6 }}>
              Wer während der Aktion aktiv ist, bekommt nach Aktionsende dieses Badge.
            </PPText>
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
          </>
        ) : (
          <PPText size={PP.fontSizes.sm} color={PP.ink2}>
            Noch kein passendes Badge. Lege zuerst unter „Badges" ein Einzel-Abzeichen mit Auslöser „Aktions-Teilnahme" an — dann kannst du es hier verknüpfen.
          </PPText>
        )}
      </View>

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

  const isActive = (c: Campaign) => {
    const s = parseDate(c.starts_at), e = parseDate(c.ends_at), n = new Date();
    return !!s && !!e && s <= n && e >= n;
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Admin"
        title="Aktionen"
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
        trailing={<IconButton icon="plus" onPress={() => { setCreating(true); setOpenId(null); }} />}
      />

      <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
        <Card pad={12} style={{ backgroundColor: 'rgba(39,176,146,0.07)' }}>
          <PPText size={PP.fontSizes.sm} color={PP.ink2}>
            Aktionen sind Zeiträume mit Bonus-Punkten (z.B. „Winterkleidung, ×2"). Im Zeitraum zählt jeder Scan/Check-in mehrfach. Aktionen erscheinen automatisch als Aushang auf der Startseite.
          </PPText>
        </Card>
      </View>

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
                    <PPText size={PP.fontSizes.sm} color={PP.ink2}>×{c.multiplier} · {formatDE(parseDate(c.starts_at))} – {formatDE(parseDate(c.ends_at))}</PPText>
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
