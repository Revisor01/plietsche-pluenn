import { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../../lib/theme';
import { useStore } from '../../../lib/hooks/useData';
import { saveTiers } from '../../../lib/api';
import { DEFAULT_TIERS, tierColor } from '../../../lib/format';
import { Screen, PPHeader, PPText, Card, Field, PPButton, SectionTitle, IconButton } from '../../../components/ui';

// Fixed 5-rank ladder; only the point thresholds are editable.
const RANKS = ['Bronze', 'Silber', 'Gold', 'Platin', 'Diamant'];

export default function TiersAdmin() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: store, refetch } = useStore();
  const [values, setValues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tiers = (store as any)?.tiers_json?.length ? (store as any).tiers_json : DEFAULT_TIERS;
    setValues(RANKS.map((name) => {
      const t = tiers.find((x: any) => (x.name || '').toLowerCase() === name.toLowerCase());
      return String(t?.at ?? '');
    }));
  }, [store?.id]);

  const save = async () => {
    if (!store?.id) return;
    const tiers = RANKS.map((name, i) => ({ name, at: parseInt(values[i] || '0', 10) || 0 }));
    // Thresholds must be ascending (Bronze lowest).
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].at <= tiers[i - 1].at) {
        Alert.alert('Reihenfolge', `${tiers[i].name} muss höher sein als ${tiers[i - 1].name}.`);
        return;
      }
    }
    setBusy(true);
    try {
      await saveTiers(store.id, tiers);
      await refetch();
      await qc.invalidateQueries({ queryKey: ['store'] });
      Alert.alert('Gespeichert', 'Die Ränge wurden aktualisiert.');
    } catch (e: any) {
      Alert.alert('Fehler', e?.message ?? 'Konnte nicht speichern.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Admin"
        title="Punkte-Ränge"
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
      />

      <View style={{ paddingHorizontal: 20 }}>
        <Card pad={12}>
          <PPText size={PP.fontSizes.sm} color={PP.ink2}>
            Ab wie vielen Gesamtpunkten ein Rang gilt. Der Ring auf der Startseite richtet sich danach.
          </PPText>
        </Card>
      </View>

      <SectionTitle title="Schwellen" />
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {RANKS.map((name, i) => (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 92, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tierColor(name) }} />
              <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink}>{name}</PPText>
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="ab Punkten"
                value={values[i] ?? ''}
                onChangeText={(v) => setValues((arr) => arr.map((x, j) => (j === i ? v : x)))}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <PPButton icon="check" loading={busy} onPress={save}>Speichern</PPButton>
      </View>
    </Screen>
  );
}
