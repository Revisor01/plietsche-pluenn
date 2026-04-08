import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import { scanItem } from '../../api/scan.api';
import { usePointsStore } from '../../store/pointsStore';
import { colors, fonts, spacing, borderRadius } from '../../theme';

export default function ScanScreen() {
  const device = useCameraDevice('back');
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const loadBalance = usePointsStore((s) => s.loadBalance);

  // Kamera-Permission beim Mount prüfen
  React.useEffect(() => {
    Camera.requestCameraPermission().then((status) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: async (codes) => {
      if (!isScanning || codes.length === 0) return;
      setIsScanning(false);
      setError(null);
      const token = codes[0].value;
      if (!token) {
        setIsScanning(true);
        return;
      }
      try {
        const result = await scanItem(token);
        Toast.show({
          type: 'success',
          text1: result.title,
          text2: `+${result.points} PlietschPunkte`,
          visibilityTime: 2000,
          onHide: () => setIsScanning(true),
        });
        if (result.newAchievements && result.newAchievements.length > 0) {
          result.newAchievements.forEach((achievement) => {
            Toast.show({
              type: 'success',
              text1: 'Neues Badge freigeschaltet!',
              text2: achievement.name,
              visibilityTime: 3000,
              position: 'top',
            });
          });
        }
        loadBalance();
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? 'Fehler beim Scannen';
        setError(msg);
        setTimeout(() => {
          setError(null);
          setIsScanning(true);
        }, 3000);
      }
    },
  });

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Kamera wird vorbereitet...</Text>
      </View>
    );
  }
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Kamera-Zugriff benötigt</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() =>
            Camera.requestCameraPermission().then((s) => setHasPermission(s === 'granted'))
          }
        >
          <LinearGradient
            colors={[...colors.gradientColors]}
            locations={[...colors.gradientLocations]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.permissionButtonGradient}
          >
            <Text style={styles.permissionButtonText}>Erlauben</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Keine Kamera gefunden</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isScanning}
        codeScanner={codeScanner}
      />
      {/* QR-Rahmen Overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>QR-Code auf Kleidungsstück scannen</Text>
      </View>
      {/* Inline Fehleranzeige */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
  errorBanner: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  errorText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: spacing.md,
  },
  permissionButton: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  permissionButtonGradient: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
});
