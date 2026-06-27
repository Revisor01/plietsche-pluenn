import { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { PP } from '../lib/theme';
import { Icon } from '../lib/icons';
import { PPText, PPButton } from './ui';

interface QRScannerProps {
  onScanned: (data: string) => void;
  active?: boolean;
}

// Full-screen camera with a viewfinder overlay. Calls onScanned once per scan;
// parent controls re-arming via the `active` prop.
export function QRScanner({ onScanned, active = true }: QRScannerProps) {
  const lockRef = useRef(false);

  const handle = (result: { data: string }) => {
    if (!active || lockRef.current) return;
    lockRef.current = true;
    onScanned(result.data);
    setTimeout(() => {
      lockRef.current = false;
    }, 1500);
  };

  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={active ? handle : undefined}
    >
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <View key={corner} style={[styles.corner, cornerStyle(corner)]} />
          ))}
          <Icon name="qr" size={64} color="rgba(255,255,255,0.25)" />
        </View>
      </View>
    </CameraView>
  );
}

// Permission gate used by both checkin + scan screens.
export function CameraGate({
  granted,
  onRequest,
  children,
}: {
  granted: boolean | null;
  onRequest: () => void;
  children: React.ReactNode;
}) {
  if (granted === null) {
    return <View style={{ flex: 1, backgroundColor: '#0e1c1b' }} />;
  }
  if (!granted) {
    return (
      <View style={styles.permWrap}>
        <Icon name="camera" size={48} color="#fff" />
        <PPText weight="semibold" size={18} color="#fff" style={{ marginTop: 16, textAlign: 'center' }}>
          Kamera-Zugriff nötig
        </PPText>
        <PPText size={13} color="rgba(255,255,255,0.7)" style={{ marginTop: 6, textAlign: 'center', maxWidth: 280 }}>
          Zum Scannen von QR-Codes brauchen wir kurz deine Kamera.
        </PPText>
        <View style={{ marginTop: 24, width: 220 }}>
          <PPButton onPress={onRequest}>Kamera erlauben</PPButton>
        </View>
      </View>
    );
  }
  return <>{children}</>;
}

function cornerStyle(corner: 'tl' | 'tr' | 'bl' | 'br') {
  const w = 3;
  const base: any = { position: 'absolute', width: 28, height: 28 };
  if (corner[0] === 't') base.top = 0;
  else base.bottom = 0;
  if (corner[1] === 'l') base.left = 0;
  else base.right = 0;
  base.borderColor = '#fff';
  if (corner[0] === 't') base.borderTopWidth = w;
  if (corner[0] === 'b') base.borderBottomWidth = w;
  if (corner[1] === 'l') base.borderLeftWidth = w;
  if (corner[1] === 'r') base.borderRightWidth = w;
  if (corner === 'tl') base.borderTopLeftRadius = 14;
  if (corner === 'tr') base.borderTopRightRadius = 14;
  if (corner === 'bl') base.borderBottomLeftRadius = 14;
  if (corner === 'br') base.borderBottomRightRadius = 14;
  return base;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  corner: {},
  permWrap: { flex: 1, backgroundColor: '#0e1c1b', alignItems: 'center', justifyContent: 'center', padding: 24 },
});
