import { useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../lib/theme';
import { Icon } from '../lib/icons';
import { pb } from '../lib/pb';
import { scan, type ScanResult } from '../lib/api';
import { useStore } from '../lib/hooks/useData';
import { errorText } from '../lib/errors';

// Write the fresh total back into the auth-store record so useAuth() consumers
// (and any screen reading authStore.record) reflect it immediately, without
// waiting for the ['me'] query to refetch.
function syncTotal(total: number) {
  const rec = pb.authStore.record;
  if (rec && typeof total === 'number') {
    rec.points_total = total;
    pb.authStore.save(pb.authStore.token, rec);
  }
}
import { QRScanner, CameraGate } from '../components/QRScanner';
import { PPText, PPButton, GradientCard, Stepper } from '../components/ui';

// One universal scanner: the server decides door-check-in vs item-take.
export default function Scan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [perm, requestPerm] = useCameraPermissions();

  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extraItems, setExtraItems] = useState(0);
  const [extraBusy, setExtraBusy] = useState(false);
  const [doorSecret, setDoorSecret] = useState<string | null>(null);
  const { data: store } = useStore();
  const maxItems = store?.max_items_take ?? 7;

  const getCoords = async () => {
    try {
      const cur = await Location.getForegroundPermissionsAsync();
      if (cur.status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        if (req.status !== 'granted') return {};
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude };
    } catch {
      return {};
    }
  };

  const onScanned = async (data: string) => {
    if (busy || result || error) return;
    setBusy(true);
    try {
      const coords = await getCoords();
      const res = await scan({ qr_code: data, ...coords });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult(res);
      if (res.type === 'checkin' && !res.already_checked_in) setDoorSecret(data);
      syncTotal(res.points_total);
      await qc.invalidateQueries();
      await qc.refetchQueries({ queryKey: ['me'] });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError(errorText(e, 'Unbekannter QR-Code'));
    } finally {
      setBusy(false);
    }
  };

  // After a fresh door check-in, let the user add QR-less items via stepper.
  const addExtraItems = async () => {
    if (!doorSecret || extraItems === 0) return;
    setExtraBusy(true);
    try {
      const coords = await getCoords();
      const res = await scan({ qr_code: doorSecret, items_count: extraItems, ...coords });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      syncTotal(res.points_total);
      await qc.invalidateQueries();
      await qc.refetchQueries({ queryKey: ['me'] });
      setResult((r) => (r ? { ...r, points: r.points + res.points, points_total: res.points_total } : r));
      setDoorSecret(null);
      setExtraItems(0);
    } catch {
      // keep sheet open on failure
    } finally {
      setExtraBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setDoorSecret(null);
    setExtraItems(0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0e1c1b' }}>
      <CameraGate granted={perm?.granted ?? null} onRequest={requestPerm}>
        <QRScanner onScanned={onScanned} active={!result && !error && !busy} />

        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <View>
            <PPText weight="semibold" size={12} color="rgba(255,255,255,0.7)" style={{ letterSpacing: 0.4 }}>
              SCANNEN
            </PPText>
            <PPText weight="bold" size={22} color="#fff" style={{ marginTop: 2, letterSpacing: -0.4 }}>
              Tür oder Teil
            </PPText>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
            <Icon name="x" size={20} color="#fff" />
          </Pressable>
        </View>

        {!result && !error && (
          <View style={[styles.hint, { bottom: insets.bottom + 40 }]} pointerEvents="none">
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <PPText size={13} color="rgba(255,255,255,0.75)" style={{ textAlign: 'center' }}>
                Halt die Kamera auf den Tür-Code oder das Etikett eines Teils.
              </PPText>
            )}
          </View>
        )}

        {(result || error) && (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 26 }]}>
            <View style={styles.handle} />

            {error && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={styles.errIcon}>
                    <Icon name="info" size={24} color={PP.err} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PPText weight="semibold" size={15} color={PP.ink}>
                      {error}
                    </PPText>
                    <PPText size={12.5} color={PP.ink2} style={{ marginTop: 2 }}>
                      Versuch's nochmal.
                    </PPText>
                  </View>
                </View>
                <View style={{ marginTop: 16 }}>
                  <PPButton onPress={reset}>Nochmal scannen</PPButton>
                </View>
              </>
            )}

            {result?.type === 'item' && (
              <>
                <GradientCard pad={18} radius={20}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={styles.okIcon}>
                      <Icon name="check" size={26} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PPText weight="semibold" size={16} color="#fff">
                        {result.label}
                      </PPText>
                      <PPText size={13} color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>
                        +{result.points} Punkte{result.did_checkin ? ' · inkl. Check-In' : ''}
                      </PPText>
                    </View>
                  </View>
                </GradientCard>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <View style={{ flex: 1 }}>
                    <PPButton variant="secondary" onPress={reset}>
                      Noch eins
                    </PPButton>
                  </View>
                  <View style={{ flex: 1 }}>
                    <PPButton onPress={() => router.back()}>Fertig</PPButton>
                  </View>
                </View>
              </>
            )}

            {result?.type === 'checkin' && (
              <>
                <GradientCard pad={18} radius={20}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={styles.okIcon}>
                      <Icon name={result.already_checked_in ? 'info' : 'check'} size={26} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PPText weight="semibold" size={16} color="#fff">
                        {result.already_checked_in ? 'Schon eingecheckt' : 'Eingecheckt!'}
                      </PPText>
                      <PPText size={13} color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>
                        {result.already_checked_in
                          ? 'Du warst heute schon da.'
                          : `+${result.points} Punkte · ${result.streak_weeks} Wochen Streak`}
                      </PPText>
                    </View>
                  </View>
                </GradientCard>

                {doorSecret && (
                  <View style={{ marginTop: 16 }}>
                    <PPText weight="semibold" size={11} color={PP.ink2} style={{ letterSpacing: 0.3 }}>
                      TEILE OHNE QR MITGENOMMEN?
                    </PPText>
                    <View style={{ alignItems: 'center', marginTop: 12 }}>
                      <Stepper value={extraItems} onChange={setExtraItems} max={maxItems} />
                    </View>
                    <PPText size={11} color={PP.ink3} style={{ textAlign: 'center', marginTop: 6 }}>
                      Höchstens {maxItems} Teile pro Besuch.
                    </PPText>
                    {extraItems > 0 && (
                      <View style={{ marginTop: 14 }}>
                        <PPButton icon="plus" loading={extraBusy} onPress={addExtraItems}>
                          {extraItems} Teile gutschreiben
                        </PPButton>
                      </View>
                    )}
                  </View>
                )}

                <View style={{ marginTop: 14 }}>
                  <PPButton variant={doorSecret ? 'ghost' : 'primary'} onPress={() => router.back()}>
                    Fertig
                  </PPButton>
                </View>
              </>
            )}
          </View>
        )}
      </CameraGate>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { position: 'absolute', left: 32, right: 32 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PP.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(26,46,44,0.16)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  okIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(217,83,79,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
