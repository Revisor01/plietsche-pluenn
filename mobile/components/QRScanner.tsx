import { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { PP, alpha } from '../lib/theme';
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
          <Icon name="qr" size={64} color={alpha(PP.onBrand, 'medium')} />
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
    return <View style={{ flex: 1, backgroundColor: PP.inkDeep }} />;
  }
  if (!granted) {
    return (
      <View style={styles.permWrap}>
        <Icon name="camera" size={PP.iconSizes.hero} color={PP.onBrand} />
        <PPText weight="semibold" size="lg" color={PP.onBrand} style={{ marginTop: PP.space.lg, textAlign: 'center' }}>
          Kamera-Zugriff nötig
        </PPText>
        <PPText size="base" color={PP.onBrandFaint} style={{ marginTop: PP.space.sm, textAlign: 'center', maxWidth: 280 }}>
          Zum Scannen von QR-Codes brauchen wir kurz deine Kamera.
        </PPText>
        <View style={{ marginTop: PP.space.xxl, width: 220 }}>
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
  base.borderColor = PP.onBrand;
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
  permWrap: { flex: 1, backgroundColor: PP.inkDeep, alignItems: 'center', justifyContent: 'center', padding: PP.space.xxl },
});
