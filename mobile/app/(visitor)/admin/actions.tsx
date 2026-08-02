import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useCampaigns, useAllBadges } from '../../../lib/hooks/useData';
import { createCampaign, updateCampaign, deleteCampaign } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill, DateField, formatDE, Hint, ColorPicker } from '../../../components/ui';
import type { Campaign, Badge } from '../../../lib/types';

const FACTORS = [1, 1.5, 2, 3]; // 1 = kein Bonus

// Kompakte Zusammenfassung der aktiven Typen für die Listendarstellung.
function factorLabel(m: number): string {
  return `${m}`.replace('.', ',');
}
function campaignTypesLabel(c: Campaign): string {
  const v = c.mult_visit, t = c.mult_take, b = c.mult_bring;
  // Alte Aktion ohne die neuen Felder → auf multiplier zurückfallen.
  if (v == null && t == null && b == null) return `×${factorLabel(c.multiplier)}`;
  const parts: string[] = [];
  if ((v ?? 1) > 1) parts.push(`Vorbeikommen ×${factorLabel(v!)}`);
  if ((t ?? 1) > 1) parts.push(`Mitnehmen ×${factorLabel(t!)}`);
  if ((b ?? 1) > 1) parts.push(`Bringen ×${factorLabel(b!)}`);
  return parts.length ? parts.join(' · ') : 'kein Bonus';
}

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
  const [multVisit, setMultVisit] = useState(campaign?.mult_visit ?? 1);
  const [multTake, setMultTake] = useState(campaign?.mult_take ?? 2);
  const [multBring, setMultBring] = useState(campaign?.mult_bring ?? 1);
  const [start, setStart] = useState<Date | null>(parseDate(campaign?.starts_at));
  const [end, setEnd] = useState<Date | null>(parseDate(campaign?.ends_at));
  const [badgeId, setBadgeId] = useState(campaign?.badge ?? '');
  const [color, setColor] = useState(campaign?.color ?? '');
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
        mult_visit: multVisit,
        mult_take: multTake,
        mult_bring: multBring,
        multiplier: Math.max(multVisit, multTake, multBring), // Leit-Faktor für Sortierung/Back-compat
        starts_at: dayStartIso(start),
        ends_at: dayEndIso(end),
        badge: badgeId || undefined,
        color,
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

      {/* Farbe der Aushang-Karte — der Verlauf wird auf diese Farbe gezogen. */}
      <ColorPicker value={color} onChange={setColor} label="FARBE IM AUSHANG" />

      <View style={{ gap: 12 }}>
        <View>
          <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>VORBEIKOMMEN (CHECK-IN)</PPText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FACTORS.map((m) => (
              <Pressable key={m} onPress={() => setMultVisit(m)}>
                <Pill bg={multVisit === m ? PP.teal : 'rgba(26,46,44,0.06)'} color={multVisit === m ? '#fff' : PP.ink2}>×{factorLabel(m)}</Pill>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>MITNEHMEN</PPText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FACTORS.map((m) => (
              <Pressable key={m} onPress={() => setMultTake(m)}>
                <Pill bg={multTake === m ? PP.teal : 'rgba(26,46,44,0.06)'} color={multTake === m ? '#fff' : PP.ink2}>×{factorLabel(m)}</Pill>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <PPText weight="semibold" size={PP.fontSizes.xs} color={PP.ink3} style={{ marginBottom: 6, letterSpacing: 0.3 }}>BRINGEN</PPText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FACTORS.map((m) => (
              <Pressable key={m} onPress={() => setMultBring(m)}>
                <Pill bg={multBring === m ? PP.teal : 'rgba(26,46,44,0.06)'} color={multBring === m ? '#fff' : PP.ink2}>×{factorLabel(m)}</Pill>
              </Pressable>
            ))}
          </View>
        </View>
        <Hint icon="info" tone="info">×1 = kein Bonus. Du kannst mehrere Typen gleichzeitig erhöhen.</Hint>
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
        <Hint icon="info" tone="info">
          Aktionen sind Zeiträume mit Bonus-Punkten (z.B. „Winterkleidung, ×2"). Im Zeitraum zählt jeder Scan/Check-in mehrfach. Aktionen erscheinen automatisch als Aushang auf der Startseite.
        </Hint>
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
                    <PPText size={PP.fontSizes.sm} color={PP.ink2} numberOfLines={1}>{campaignTypesLabel(c)} · {formatDE(parseDate(c.starts_at))} – {formatDE(parseDate(c.ends_at))}</PPText>
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
