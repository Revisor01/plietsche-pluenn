import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Toast from 'react-native-toast-message';
import { scanItem } from '../../api/scan.api';

export default function ScanScreen() {
  const device = useCameraDevice('back');
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

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
        <Text>Kamera wird vorbereitet...</Text>
      </View>
    );
  }
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Kamera-Zugriff benötigt</Text>
        <TouchableOpacity
          onPress={() =>
            Camera.requestCameraPermission().then((s) => setHasPermission(s === 'granted'))
          }
        >
          <Text style={styles.permissionBtn}>Erlauben</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!device) {
    return (
      <View style={styles.center}>
        <Text>Keine Kamera gefunden</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
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
  errorBanner: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: '#FFFFFF', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  permissionText: { fontSize: 16, color: '#374151', marginBottom: 12 },
  permissionBtn: { fontSize: 16, color: '#2563EB', fontWeight: '600' },
});
