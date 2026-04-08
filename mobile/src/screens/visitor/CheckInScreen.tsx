import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { submitCheckin } from '../../api/checkin.api';
import { usePointsStore } from '../../store/pointsStore';

type Step = 'gps' | 'scan' | 'stepper' | 'success' | 'error';

export default function CheckInScreen() {
  const loadBalance = usePointsStore((s) => s.loadBalance);
  const [step, setStep] = useState<Step>('gps');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [doorToken, setDoorToken] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [result, setResult] = useState<{ points: number; itemPoints: number; totalPoints: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  const device = useCameraDevice('back');

  // Schritt 1: GPS anfordern
  const requestGps = async () => {
    const status = await Geolocation.requestAuthorization('whenInUse');
    if (status !== 'granted') {
      setError('GPS-Zugriff wird für den Check-In benötigt.');
      setStep('error');
      return;
    }
    Geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStep('scan');
      },
      (_err) => {
        setError('GPS konnte nicht ermittelt werden. Bitte Standort aktivieren.');
        setStep('error');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Schritt 2: QR-Scan
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (!isScanning || codes.length === 0 || step !== 'scan') return;
      setIsScanning(false);
      const token = codes[0].value;
      if (!token) {
        setIsScanning(true);
        return;
      }
      setDoorToken(token);
      setStep('stepper');
    },
  });

  // Schritt 3: Stepper + Absenden
  const handleSubmit = async () => {
    if (!coords || !doorToken) return;
    try {
      const res = await submitCheckin(doorToken, coords.lat, coords.lng, itemCount);
      setResult(res);
      setStep('success');
      loadBalance();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Check-In fehlgeschlagen');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('gps');
    setItemCount(0);
    setDoorToken(null);
    setCoords(null);
    setResult(null);
    setError(null);
    setIsScanning(true);
  };

  // Schritt 1: GPS
  if (step === 'gps') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Check-In</Text>
        <Text style={styles.subtitle}>
          Für den Check-In wird dein Standort einmalig geprüft — nicht gespeichert.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestGps}>
          <Text style={styles.btnText}>Standort freigeben & Scannen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Schritt 2: QR-Scan
  if (step === 'scan') {
    return (
      <View style={styles.container}>
        {device && (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isScanning}
            codeScanner={codeScanner}
          />
        )}
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.hint}>QR-Code an der Ladentür scannen</Text>
        </View>
      </View>
    );
  }

  // Schritt 3: Stepper
  if (step === 'stepper') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Wie viele Teile?</Text>
        <Text style={styles.subtitle}>
          Nicht-digitale Teile die du mitnimmst (ohne QR-Scan)
        </Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setItemCount(Math.max(0, itemCount - 1))}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepCount}>{itemCount}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setItemCount(Math.min(10, itemCount + 1))}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
          <Text style={styles.btnText}>Einchecken</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Schritt 4: Erfolg
  if (step === 'success' && result) {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.title}>Eingecheckt!</Text>
        <Text style={styles.points}>+{result.points + result.itemPoints} PlietschPunkte</Text>
        <Text style={styles.subtitle}>Gesamt: {result.totalPoints} Punkte</Text>
        <TouchableOpacity style={styles.btn} onPress={handleReset}>
          <Text style={styles.btnText}>Fertig</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fehler
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.btn} onPress={handleReset}>
        <Text style={styles.btnText}>Nochmal versuchen</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  btn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: { fontSize: 24, color: '#111827', fontWeight: '600' },
  stepCount: { fontSize: 48, fontWeight: '700', color: '#111827', marginHorizontal: 32 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  hint: { color: '#FFFFFF', marginTop: 16, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  successIcon: { fontSize: 64, color: '#10B981', marginBottom: 8 },
  points: { fontSize: 32, fontWeight: '800', color: '#2563EB', marginVertical: 8 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
});
