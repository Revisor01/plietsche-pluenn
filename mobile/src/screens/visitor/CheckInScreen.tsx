import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import LinearGradient from 'react-native-linear-gradient';
import { submitCheckin } from '../../api/checkin.api';
import { usePointsStore } from '../../store/pointsStore';
import { colors, fonts, spacing, borderRadius } from '../../theme';

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

  // Gradient-Button Hilfsfunktion
  const GradientButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <LinearGradient
        colors={[...colors.gradientColors]}
        locations={[...colors.gradientLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.buttonGradient}
      >
        <Text style={styles.buttonText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Schritt 1: GPS
  if (step === 'gps') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Check-In</Text>
        <Text style={styles.subtitle}>
          Für den Check-In wird dein Standort einmalig geprüft — nicht gespeichert.
        </Text>
        <GradientButton label="Standort freigeben & Scannen" onPress={requestGps} />
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
        <GradientButton label="Einchecken" onPress={handleSubmit} />
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
        <GradientButton label="Fertig" onPress={handleReset} />
      </View>
    );
  }

  // Fehler
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <GradientButton label="Nochmal versuchen" onPress={handleReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  buttonGradient: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  stepCount: {
    fontSize: 48,
    fontFamily: fonts.bold,
    color: colors.text,
    marginHorizontal: spacing.xl,
  },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  hint: {
    color: colors.white,
    marginTop: spacing.md,
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    fontSize: 64,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  points: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: colors.primary,
    marginVertical: spacing.sm,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
