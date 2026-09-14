import { useState, useEffect } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { PP, alpha } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useStore } from '../../../lib/hooks/useData';
import { saveTiers, savePointConfig } from '../../../lib/api';
import { DEFAULT_TIERS, tierColor } from '../../../lib/format';
import { Screen, PPHeader, PPText, Field, PPButton, SectionTitle, IconButton, Hint } from '../../../components/ui';
import { useGoBack } from '../../../lib/hooks/useGoBack';
import { errorText } from '../../../lib/errors';

// Parse a numeric string; empty/NaN/negative → clamped to `min`.
function parseNum(s: string, min = 0): number {
  const n = parseInt((s ?? '').trim() || '0', 10);
  if (isNaN(n) || n < min) return min;
  return n;
}

type Rank = { name: string; at: string };

export default function TiersAdmin() {
  const goBack = useGoBack();
  const qc = useQueryClient();
  const { data: store, refetch } = useStore();

  // Point values (kept as strings for editing, like the existing values pattern).
  const [ptsCheckin, setPtsCheckin] = useState('');
  const [ptsTake, setPtsTake] = useState('');
  const [ptsBring, setPtsBring] = useState('');
  const [maxTake, setMaxTake] = useState('');

  // Dynamic ranks.
  const [ranks, setRanks] = useState<Rank[]>([]);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = store as any;
    if (!s?.id) return;
    setPtsCheckin(String(s.pts_checkin ?? 10));
    setPtsTake(String(s.pts_take ?? 5));
    setPtsBring(String(s.pts_bring ?? 5));
    setMaxTake(String(s.max_items_take ?? 7));

    const tiers = s.tiers_json?.length ? s.tiers_json : DEFAULT_TIERS;
    setRanks(tiers.map((t: any) => ({ name: String(t.name ?? ''), at: String(t.at ?? '') })));
  }, [store?.id]);

  const setRank = (i: number, patch: Partial<Rank>) =>
    setRanks((arr) => arr.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const removeRank = (i: number) => setRanks((arr) => arr.filter((_, j) => j !== i));
  const addRank = () => setRanks((arr) => [...arr, { name: '', at: '' }]);

  const save = async () => {
    if (!store?.id) return;

    // ── Punktwerte validieren ──
    const pc = parseNum(ptsCheckin);
    const pt = parseNum(ptsTake);
    const pb = parseNum(ptsBring);
    const mt = parseNum(maxTake, 1);
    if (parseNum(maxTake) < 1) {
      Alert.alert('Maximale Teile', 'Es muss mindestens 1 Teil pro Besuch erlaubt sein.');
      return;
    }

    // ── Ränge validieren ──
    // Leere Ränge (Name UND Schwelle leer) rausfiltern.
    const cleaned = ranks.filter((r) => r.name.trim() !== '' || r.at.trim() !== '');
    for (const r of cleaned) {
      if (!r.name.trim()) {
        Alert.alert('Name fehlt', 'Bitte gib jedem Rang einen Namen (oder entferne die Zeile).');
        return;
      }
    }
    const tiers = cleaned.map((r) => ({ name: r.name.trim(), at: parseNum(r.at) }));
    // Schwellen müssen strikt aufsteigend sein.
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].at <= tiers[i - 1].at) {
        Alert.alert('Reihenfolge', `${tiers[i].name} muss höher sein als ${tiers[i - 1].name}.`);
        return;
      }
    }

    setBusy(true);
    try {
      await savePointConfig(store.id, { pts_checkin: pc, pts_take: pt, pts_bring: pb, max_items_take: mt });
      await saveTiers(store.id, tiers);
      await refetch();
      await qc.invalidateQueries({ queryKey: ['store'] });
      Alert.alert('Gespeichert', 'Punkte und Ränge wurden aktualisiert.');
    } catch (e: any) {
      Alert.alert('Fehler', errorText(e, 'Konnte nicht speichern.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Admin"
        title="Punkte & Ränge"
        leading={<IconButton icon="chevron-left" onPress={goBack} />}
      />

      {/* ── SEKTION 1: Punkte pro Aktion ── */}
      <SectionTitle title="Punkte pro Aktion" />
      <View style={{ paddingHorizontal: PP.space.xl, marginBottom: PP.space.xs }}>
        <Hint icon="info" tone="info">Wie viele Punkte es pro Aktion gibt. Wirkt sofort.</Hint>
      </View>
      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
        <Field
          label="Check-in im Laden"
          value={ptsCheckin}
          onChangeText={setPtsCheckin}
          keyboardType="number-pad"
          placeholder="10"
        />
        <Field
          label="Pro mitgenommenem Teil"
          value={ptsTake}
          onChangeText={setPtsTake}
          keyboardType="number-pad"
          placeholder="5"
        />
        <Field
          label="Pro gebrachtem Teil"
          value={ptsBring}
          onChangeText={setPtsBring}
          keyboardType="number-pad"
          placeholder="5"
        />
        <Field
          label="Maximale Teile pro Besuch"
          value={maxTake}
          onChangeText={setMaxTake}
          keyboardType="number-pad"
          placeholder="7"
        />
        <PPText size="sm" color={PP.ink2} style={{ marginTop: -2 }}>
          Mehr Teile können pro Besuch nicht mitgenommen bzw. gescannt werden.
        </PPText>
      </View>

      {/* ── SEKTION 2: Ränge ── */}
      <SectionTitle title="Ränge" />
      <View style={{ paddingHorizontal: PP.space.xl, marginBottom: PP.space.xs }}>
        <Hint icon="info" tone="info">
          Ab wie vielen Gesamtpunkten ein Rang gilt. Der Ring auf der Startseite richtet sich danach. Du kannst Ränge hinzufügen, umbenennen und entfernen.
        </Hint>
      </View>
      <View style={{ paddingHorizontal: PP.space.xl, gap: PP.space.md }}>
        {ranks.map((r, i) => (
          // alignItems: 'stretch' — beide Felder gleich hoch, egal wie lang das
          // Label ist. Sonst springt die Zeile, sobald eins davon umbricht.
          <View key={i} style={{ flexDirection: 'row', alignItems: 'stretch', gap: PP.space.md }}>
            <View style={{ width: 12, height: 12, borderRadius: PP.rMicro, backgroundColor: tierColor(r.name), alignSelf: 'center' }} />
            <View style={{ flex: 1 }}>
              <Field
                label="Name"
                value={r.name}
                onChangeText={(v) => setRank(i, { name: v })}
                placeholder="z.B. Bronze"
              />
            </View>
            <View style={{ width: 96 }}>
              {/* Kurzes Label — "ab Punkten" bricht in dieser Breite um. */}
              <Field
                label="Punkte"
                value={r.at}
                onChangeText={(v) => setRank(i, { at: v })}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
            <Pressable
              onPress={() => removeRank(i)}
              hitSlop={8}
              style={{ width: 36, height: 36, borderRadius: PP.rTile2, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(PP.ink, "subtle"), alignSelf: 'center' }}
            >
              <Icon name="trash" size={PP.iconSizes.sm} color={PP.ink3} />
            </Pressable>
          </View>
        ))}

        <View style={{ marginTop: PP.space.xs }}>
          <PPButton variant="ghost" icon="plus" onPress={addRank}>Rang hinzufügen</PPButton>
        </View>
      </View>

      <View style={{ paddingHorizontal: PP.space.xl, marginTop: PP.space.xxl }}>
        <PPButton icon="check" loading={busy} onPress={save}>Speichern</PPButton>
      </View>
    </Screen>
  );
}
