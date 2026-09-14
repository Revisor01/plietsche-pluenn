import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { PP, alpha } from '../../../lib/theme';
import { Icon, type IconName } from '../../../lib/icons';
import { useAllNeeds, useActiveCampaigns, useCurrentUser } from '../../../lib/hooks/useData';
import { createNeed, updateNeed, deleteNeed, sendPushNow } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Toggle, Pill, ColorPicker, Hint, IconTile } from '../../../components/ui';
import type { Need } from '../../../lib/types';
import { useGoBack } from '../../../lib/hooks/useGoBack';
import { errorText } from '../../../lib/errors';

// Quick-action templates — one tap pre-fills the editor with a common notice.
const TEMPLATES: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'door', title: 'Wir haben jetzt geöffnet', detail: 'Komm vorbei!' },
  { icon: 'clock', title: 'Heute geschlossen', detail: '' },
  { icon: 'shirt', title: 'Neue Ware ist da', detail: 'Frisch eingetroffen — schau rein.' },
  { icon: 'sparkles', title: 'Aktion läuft', detail: 'Jetzt mehr Punkte sammeln.' },
];

function NeedEditor({ need, onSaved }: { need?: Need; onSaved: () => void }) {
  const [title, setTitle] = useState(need?.title ?? '');
  const [detail, setDetail] = useState(need?.detail ?? '');
  const [active, setActive] = useState(need?.is_active ?? true);
  const [color, setColor] = useState(need?.color ?? '');
  const [campaign, setCampaign] = useState(need?.campaign ?? '');
  // Push only offered for new entries (a one-off broadcast, not on every edit)
  // and nur für Admins: push_messages.createRule lässt im Backend
  // ausschließlich `admin` zu. Ein Volunteer bekäme sonst einen Schalter
  // angeboten, dessen Benutzung der Server mit 403 abweist — der Aushang
  // stünde, die Push nicht.
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: campaigns } = useActiveCampaigns();
  const { data: me } = useCurrentUser();
  const isAdmin = me?.role === 'admin';
  const canPush = isAdmin && !need;

  const save = async () => {
    if (!title.trim()) { Alert.alert('Fehlt noch', 'Bitte einen Titel angeben.'); return; }
    setBusy(true);
    try {
      const payload: Partial<Need> = {
        title: title.trim(),
        detail: detail.trim(),
        is_active: active,
        color,
        // Leerstring, NICHT undefined: PocketBase überspringt undefined-Felder
        // beim Update — die Verknüpfung ließe sich sonst nie wieder lösen.
        campaign: campaign || '',
      };
      if (need) await updateNeed(need.id, payload);
      else await createNeed(payload);
      if (push && canPush) {
        try {
          await sendPushNow(title.trim(), detail.trim() || 'Neuer Aushang im Laden');
        } catch (e: any) {
          Alert.alert(
            'Aushang gespeichert',
            'Die Push konnte nicht gesendet werden: ' + errorText(e, 'Unbekannter Fehler.'),
          );
        }
      }
      onSaved();
    } catch (e: any) {
      Alert.alert('Fehler', errorText(e, 'Konnte nicht speichern.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!need) return;
    Alert.alert('Eintrag löschen?', title, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: async () => { await deleteNeed(need.id); onSaved(); } },
    ]);
  };

  return (
    <Card pad={14} style={{ gap: PP.space.md }}>
      {!need && (
        <View>
          <PPText weight="semibold" size="xs" color={PP.ink3} style={{ marginBottom: PP.space.sm, letterSpacing: PP.tracking.label }}>
            SCHNELL-VORLAGEN
          </PPText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: PP.space.sm }}>
            {TEMPLATES.map((t) => (
              <Pressable key={t.title} onPress={() => { setTitle(t.title); setDetail(t.detail); }}>
                <Pill icon={t.icon} bg={alpha(PP.teal, 'subtle')} color={PP.teal}>{t.title}</Pill>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <Field label="Titel" value={title} onChangeText={setTitle} placeholder="z.B. Laden bleibt 2 Tage geschlossen" />
      <Field label="Details" value={detail} onChangeText={setDetail} placeholder="optional" />

      <ColorPicker value={color} onChange={setColor} />

      {/* Verknüpfung mit einer Aktion: verhindert, dass dasselbe Thema doppelt
          im Aushang steht (einmal als Aktion, einmal als Ankündigung). */}
      {!!campaigns?.length && (
        <View>
          <PPText weight="semibold" size="xs" color={PP.ink3} style={{ marginBottom: PP.space.sm, letterSpacing: PP.tracking.label }}>
            GEHÖRT ZU AKTION
          </PPText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: PP.space.sm }}>
            <Pressable onPress={() => setCampaign('')}>
              <Pill
                bg={!campaign ? alpha(PP.teal, "soft") : alpha(PP.ink, "ghost")}
                color={!campaign ? PP.teal : PP.ink2}
              >
                Eigenständig
              </Pill>
            </Pressable>
            {campaigns.map((c) => (
              <Pressable key={c.id} onPress={() => setCampaign(c.id)}>
                <Pill
                  icon="sparkles"
                  bg={campaign === c.id ? alpha(PP.teal, "soft") : alpha(PP.ink, "ghost")}
                  color={campaign === c.id ? PP.teal : PP.ink2}
                >
                  {c.name}
                </Pill>
              </Pressable>
            ))}
          </View>
          {!!campaign && (
            <View style={{ marginTop: PP.space.sm }}>
              <Hint icon="bell" tone="warn">
                Diese Ankündigung wird dadurch <PPText weight="bold" size="sm" color={PP.warn}>nicht angezeigt</PPText>,
                solange die Aktion läuft — die Aktions-Karte deckt das Thema bereits ab. Erst nach Ende der
                Aktion erscheint sie eigenständig im Aushang. Soll sie sofort sichtbar sein, wähle
                „Eigenständig".
              </Hint>
            </View>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
        <View style={{ flex: 1 }}><PPText weight="semibold" size="base" color={PP.ink}>Aktiv anzeigen</PPText></View>
        <Toggle value={active} onChange={setActive} />
      </View>
      {canPush && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md, backgroundColor: alpha(PP.sky, "subtle"), borderRadius: PP.rField, padding: PP.space.md }}>
          <Icon name="bell" size={PP.iconSizes.md} color={PP.sky} />
          <View style={{ flex: 1 }}>
            <PPText weight="semibold" size="base" color={PP.ink}>Als Push senden</PPText>
            <PPText size="sm" color={PP.ink2} style={{ marginTop: 2 }}>
              Alle Nutzer bekommen eine Mitteilung (kommt in ~1 Min an).
            </PPText>
          </View>
          <Toggle value={push} onChange={setPush} />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: PP.space.sm }}>
        <View style={{ flex: 1 }}><PPButton size="m" loading={busy} onPress={save}>{need ? 'Speichern' : 'Anlegen'}</PPButton></View>
        {need && <PPButton size="m" variant="ghost" fullWidth={false} onPress={remove}>Löschen</PPButton>}
      </View>
    </Card>
  );
}

export default function NeedsAdmin() {
  const goBack = useGoBack();
  const qc = useQueryClient();
  const { data: needs, refetch } = useAllNeeds();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onSaved = async () => {
    setOpenId(null); setCreating(false);
    await refetch();
    await qc.invalidateQueries({ queryKey: ['needs', 'active'] });
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Admin"
        title="Aushang"
        leading={<IconButton icon="chevron-left" onPress={goBack} />}
        trailing={<IconButton icon="plus" onPress={() => { setCreating(true); setOpenId(null); }} />}
      />

      <View style={{ paddingHorizontal: PP.space.xl, marginBottom: PP.space.lg }}>
        <Hint icon="info" tone="info">
          Ankündigungen stehen auf der Startseite ganz oben — für Öffnungszeiten, Hinweise
          oder was gerade gebraucht wird. Wer eine Ankündigung einer laufenden Aktion
          zuordnet, blendet sie damit aus: Die Aktions-Karte deckt das Thema schon ab.
        </Hint>
      </View>

      {creating && (
        <>
          <SectionTitle title="Neue Ankündigung" />
          <View style={{ paddingHorizontal: PP.space.xl }}>
            <NeedEditor onSaved={onSaved} />
          </View>
        </>
      )}

      <SectionTitle title="Aushänge" />
      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
        {needs?.length ? (
          needs.map((n) => (
            <View key={n.id}>
              <Pressable onPress={() => setOpenId(openId === n.id ? null : n.id)}>
                <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: PP.space.md }}>
                  <IconTile icon="megaphone" tint={PP.sky} tone="medium" size="s" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PPText weight="semibold" size="md" color={PP.ink}>{n.title}</PPText>
                    {!!n.detail && <PPText size="sm" color={PP.ink2} numberOfLines={1}>{n.detail}</PPText>}
                  </View>
                  {!n.is_active && <PPText size="xs" color={PP.ink3}>inaktiv</PPText>}
                  <Icon name={openId === n.id ? 'chevron-down' : 'chevron-right'} size={PP.iconSizes.md} color={PP.ink3} />
                </Card>
              </Pressable>
              {openId === n.id && <View style={{ marginTop: PP.space.sm }}><NeedEditor need={n} onSaved={onSaved} /></View>}
            </View>
          ))
        ) : (
          <Card pad={16}><PPText size="base" color={PP.ink2}>Noch keine Ankündigung.</PPText></Card>
        )}
      </View>
    </Screen>
  );
}
