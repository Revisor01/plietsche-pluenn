import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { PP, alpha } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useCampaigns } from '../../../lib/hooks/useData';
import { createCampaign, updateCampaign, deleteCampaign } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Pill, DateField, formatDE, Hint, ColorPicker, IconTile } from '../../../components/ui';
import type { Campaign } from '../../../lib/types';
import { useGoBack } from '../../../lib/hooks/useGoBack';
import { errorText } from '../../../lib/errors';
import { invalidateCampaigns } from '../../../lib/queryClient';

const FACTORS = [1, 2, 3]; // 1 = kein Bonus. Ganze Zahlen: schnell zu erfassen,
// ×1,5 war in der Praxis weder nötig noch auf einen Blick lesbar.

// Kompakte Zusammenfassung der aktiven Typen für die Listendarstellung.
function factorLabel(m: number): string {
  return `${m}`.replace('.', ',');
}
// Faktoren als einzelne Marken für die Übersicht — kein Fließtext, damit auf
// einen Blick sichtbar ist, welche Werte eingetragen sind.
function campaignFactorRows(c: Campaign): { label: string; factor: number }[] {
  const { mult_visit: v, mult_take: t, mult_bring: b } = c;
  if (v == null && t == null && b == null) {
    return (c.multiplier ?? 1) > 1 ? [{ label: 'Punkte', factor: c.multiplier }] : [];
  }
  const out: { label: string; factor: number }[] = [];
  if ((v ?? 1) > 1) out.push({ label: 'Kommen', factor: v! });
  if ((t ?? 1) > 1) out.push({ label: 'Mitnehmen', factor: t! });
  if ((b ?? 1) > 1) out.push({ label: 'Bringen', factor: b! });
  return out;
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

function CampaignEditor({ campaign, onSaved }: { campaign?: Campaign; onSaved: () => void }) {
  const [name, setName] = useState(campaign?.name ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [multVisit, setMultVisit] = useState(campaign?.mult_visit ?? 1);
  const [multTake, setMultTake] = useState(campaign?.mult_take ?? 2);
  const [multBring, setMultBring] = useState(campaign?.mult_bring ?? 1);
  const [start, setStart] = useState<Date | null>(parseDate(campaign?.starts_at));
  const [end, setEnd] = useState<Date | null>(parseDate(campaign?.ends_at));
  // Nur mitgeführt, damit Speichern die Verknüpfung nicht löscht — gepflegt
  // wird sie im Abzeichen-Editor („Aktions-Teilnahme" → gekoppelte Aktion).
  const badgeId = campaign?.badge ?? '';
  const [color, setColor] = useState(campaign?.color ?? '');
  const [busy, setBusy] = useState(false);


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
      Alert.alert('Fehler', errorText(e, 'Konnte nicht speichern.'));
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
    <Card pad={14} style={{ gap: PP.space.md }}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="z.B. Winterkleidung" />
      <Field label="Beschreibung" value={description} onChangeText={setDescription} placeholder="Kurzer Hinweis" />
      <View style={{ flexDirection: 'row', gap: PP.space.sm }}>
        <View style={{ flex: 1 }}><DateField label="Von" value={start} onChange={setStart} /></View>
        <View style={{ flex: 1 }}><DateField label="Bis" value={end} onChange={setEnd} /></View>
      </View>

      {/* Farbe der Aushang-Karte — der Verlauf wird auf diese Farbe gezogen. */}
      <ColorPicker value={color} onChange={setColor} label="FARBE IM AUSHANG" />

      <View style={{ gap: PP.space.sm }}>
        {/* Eine Zeile je Typ: Beschriftung links, Faktoren rechts. Vorher drei
            gestapelte Blöcke mit eigener Überschrift — viel Platz für wenig Inhalt. */}
        {([
          { label: 'Vorbeikommen', value: multVisit, set: setMultVisit },
          { label: 'Mitnehmen', value: multTake, set: setMultTake },
          { label: 'Bringen', value: multBring, set: setMultBring },
        ] as const).map((row) => (
          <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
            <PPText
              weight="medium"
              size="sm"
              color={PP.ink2}
              style={{ width: 104 }}
              numberOfLines={1}
            >
              {row.label}
            </PPText>
            <View style={{ flexDirection: 'row', gap: PP.space.sm, flex: 1 }}>
              {FACTORS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => row.set(m)}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.label}: Faktor ${factorLabel(m)}`}
                  accessibilityState={{ selected: row.value === m }}
                  hitSlop={8}
                  style={{ flex: 1 }}
                >
                  <Pill
                    bg={row.value === m ? PP.teal : alpha(PP.ink, "subtle")}
                    color={row.value === m ? PP.onBrand : PP.ink2}
                  >
                    ×{factorLabel(m)}
                  </Pill>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Hint icon="info" tone="info">×1 = kein Bonus. Du kannst mehrere Typen gleichzeitig erhöhen.</Hint>
      </View>

      <View style={{ flexDirection: 'row', gap: PP.space.sm }}>
        <View style={{ flex: 1 }}><PPButton size="m" loading={busy} onPress={save}>{campaign ? 'Speichern' : 'Anlegen'}</PPButton></View>
        {campaign && (
          <PPButton size="m" variant="ghost" fullWidth={false} accessibilityLabel="Aktion löschen" onPress={remove}>
            Löschen
          </PPButton>
        )}
      </View>
    </Card>
  );
}

export default function ActionsAdmin() {
  const goBack = useGoBack();
  const qc = useQueryClient();
  const { data: campaigns, refetch } = useCampaigns();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onSaved = async () => {
    setOpenId(null); setCreating(false);
    await refetch();
    // Der Aushang auf der Startseite liest ['campaigns','active-list'] — ein
    // anderer Schlüssel als die Einzel-Aktion ['campaign','active'].
    await invalidateCampaigns(qc);
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
        leading={<IconButton icon="chevron-left" accessibilityLabel="Zurück" onPress={goBack} />}
        trailing={<IconButton icon="plus" accessibilityLabel="Neue Aktion anlegen" onPress={() => { setCreating(true); setOpenId(null); }} />}
      />

      <View style={{ paddingHorizontal: PP.space.xl, marginBottom: PP.space.xs }}>
        <Hint icon="info" tone="info">
          Aktionen sind Zeiträume mit Bonus-Punkten (z.B. „Winterkleidung, ×2"). Im Zeitraum zählt jeder Scan/Check-in mehrfach. Aktionen erscheinen automatisch als Aushang auf der Startseite.
        </Hint>
      </View>

      {creating && (
        <>
          <SectionTitle title="Neue Aktion" />
          <View style={{ paddingHorizontal: PP.space.xl }}>
            <CampaignEditor onSaved={onSaved} />
          </View>
        </>
      )}

      <SectionTitle title="Aktionen" />
      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
        {campaigns?.length ? (
          campaigns.map((c) => (
            <View key={c.id}>
              <Pressable
                onPress={() => setOpenId(openId === c.id ? null : c.id)}
                accessibilityRole="button"
                accessibilityLabel={c.name}
                accessibilityHint={openId === c.id ? 'Bearbeiten schließen' : 'Aktion bearbeiten'}
                accessibilityState={{ expanded: openId === c.id }}
              >
                <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
                  <IconTile icon="sparkles" tone="soft" size="s" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PPText weight="semibold" size="md" color={PP.ink}>{c.name}</PPText>
                    {/* Zeitraum und Boni in getrennten Zeilen — in einer Zeile
                        schnitt der Zeitraum die Faktoren regelmäßig ab. */}
                    <PPText size="sm" color={PP.ink2} numberOfLines={1}>
                      {formatDE(parseDate(c.starts_at))} – {formatDE(parseDate(c.ends_at))}
                    </PPText>
                    {campaignFactorRows(c).length > 0 && (
                      <PPText size="sm" color={PP.teal} numberOfLines={1} style={{ marginTop: 1 }}>
                        {campaignFactorRows(c)
                          .map((f) => `${f.label} ×${factorLabel(f.factor)}`)
                          .join(' · ')}
                      </PPText>
                    )}
                  </View>
                  {isActive(c) && <Pill size="s" color={PP.teal} bg={alpha(PP.teal, 'soft')}>aktiv</Pill>}
                  <Icon name={openId === c.id ? 'chevron-down' : 'chevron-right'} size={PP.iconSizes.md} color={PP.ink3} />
                </Card>
              </Pressable>
              {openId === c.id && (
                <View style={{ marginTop: PP.space.sm }}>
                  <CampaignEditor campaign={c} onSaved={onSaved} />
                </View>
              )}
            </View>
          ))
        ) : (
          <Card pad={16}><PPText size="base" color={PP.ink2}>Noch keine Aktionen.</PPText></Card>
        )}
      </View>
    </Screen>
  );
}
