import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useAllNeeds } from '../../../lib/hooks/useData';
import { createNeed, updateNeed, deleteNeed } from '../../../lib/api';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton, Toggle } from '../../../components/ui';
import type { Need } from '../../../lib/types';

function NeedEditor({ need, onSaved }: { need?: Need; onSaved: () => void }) {
  const [title, setTitle] = useState(need?.title ?? '');
  const [detail, setDetail] = useState(need?.detail ?? '');
  const [active, setActive] = useState(need?.is_active ?? true);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim()) { Alert.alert('Fehlt noch', 'Bitte einen Titel angeben.'); return; }
    setBusy(true);
    try {
      const payload: Partial<Need> = { title: title.trim(), detail: detail.trim(), is_active: active };
      if (need) await updateNeed(need.id, payload);
      else await createNeed(payload);
      onSaved();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte nicht speichern.');
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
    <Card pad={14} style={{ gap: 12 }}>
      <Field label="Titel" value={title} onChangeText={setTitle} placeholder="z.B. Laden bleibt 2 Tage geschlossen" />
      <Field label="Details" value={detail} onChangeText={setDetail} placeholder="optional" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}><PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>Aktiv anzeigen</PPText></View>
        <Toggle value={active} onChange={setActive} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><PPButton size="m" loading={busy} onPress={save}>{need ? 'Speichern' : 'Anlegen'}</PPButton></View>
        {need && <PPButton size="m" variant="ghost" fullWidth={false} onPress={remove}>Löschen</PPButton>}
      </View>
    </Card>
  );
}

export default function NeedsAdmin() {
  const router = useRouter();
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
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
        trailing={<IconButton icon="plus" onPress={() => { setCreating(true); setOpenId(null); }} />}
      />

      {creating && (
        <>
          <SectionTitle title="Neue Ankündigung" />
          <View style={{ paddingHorizontal: 20 }}>
            <NeedEditor onSaved={onSaved} />
          </View>
        </>
      )}

      <SectionTitle title="Aushänge" />
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {needs?.length ? (
          needs.map((n) => (
            <View key={n.id}>
              <Pressable onPress={() => setOpenId(openId === n.id ? null : n.id)}>
                <Card pad={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(128,180,226,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="megaphone" size={20} color={PP.sky} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <PPText weight="semibold" size={PP.fontSizes.md} color={PP.ink}>{n.title}</PPText>
                    {!!n.detail && <PPText size={PP.fontSizes.sm} color={PP.ink2} numberOfLines={1}>{n.detail}</PPText>}
                  </View>
                  {!n.is_active && <PPText size={PP.fontSizes.xs} color={PP.ink3}>inaktiv</PPText>}
                  <Icon name={openId === n.id ? 'chevron-down' : 'chevron-right'} size={18} color={PP.ink3} />
                </Card>
              </Pressable>
              {openId === n.id && <View style={{ marginTop: 8 }}><NeedEditor need={n} onSaved={onSaved} /></View>}
            </View>
          ))
        ) : (
          <Card pad={16}><PPText size={PP.fontSizes.base} color={PP.ink2}>Noch keine Ankündigung.</PPText></Card>
        )}
      </View>
    </Screen>
  );
}
