import { View, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';

import { PP, alpha } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { pb } from '../../lib/pb';
import { PPText, PPButton, Card, Pill } from '../../components/ui';
import { Dots } from '../../components/Dots';

type PermState = 'idle' | 'granted' | 'denied';

export default function Permissions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [loc, setLoc] = useState<PermState>('idle');
  const [push, setPush] = useState<PermState>('idle');
  const [finishing, setFinishing] = useState(false);

  const askLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLoc(status === 'granted' ? 'granted' : 'denied');
  };

  const askPush = async () => {
    // Lazy import — avoids expo-notifications running its Expo Go warning at
    // app/route-load time (which blanked the screen during route discovery).
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    setPush(status === 'granted' ? 'granted' : 'denied');
  };

  const finish = async () => {
    setFinishing(true);
    try {
      const id = pb.authStore.record?.id;
      if (id) {
        await pb.collection('users').update(id, { onboarding_complete: true });
        await qc.invalidateQueries({ queryKey: ['me'] });
      }
      router.replace('/(visitor)');
    } catch {
      setFinishing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: PP.bg, paddingHorizontal: PP.space.xxl, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <View style={{ marginTop: PP.space.md }}>
        <PPText weight="bold" size="xl2" color={PP.ink} style={{ letterSpacing: PP.tracking.title }}>
          Zwei kleine Bitten
        </PPText>
        <PPText size="base" color={PP.ink2} style={{ marginTop: PP.space.xs }}>
          Beides nur, wenn du willst.
        </PPText>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: PP.space.md }}>
        <PermCard
          icon="location"
          title="Standort beim Check-In"
          desc="Wir prüfen nur, ob du wirklich im Laden bist. Sonst nichts."
          state={loc}
          onAsk={askLocation}
        />
        <PermCard
          icon="bell"
          title="Sanfte Erinnerungen"
          desc="Freitags ein freundlicher Schubs bevor dein Streak reißt — und Bescheid bei Aktionen."
          state={push}
          onAsk={askPush}
        />
      </View>

      <PPButton iconRight="arrow-right" loading={finishing} onPress={finish}>
        Fertig
      </PPButton>
      <View style={{ paddingTop: PP.space.lg }}>
        <Dots count={3} active={2} />
      </View>
    </View>
  );
}

function PermCard({
  icon,
  title,
  desc,
  state,
  onAsk,
}: {
  icon: IconName;
  title: string;
  desc: string;
  state: PermState;
  onAsk: () => void;
}) {
  return (
    <Card pad={16} style={{ flexDirection: 'row', gap: PP.space.lg, alignItems: 'flex-start' }}>
      <LinearGradient
        colors={PP.gradientSoft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 44, height: 44, borderRadius: PP.rField, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={icon} size={PP.iconSizes.lg} color={PP.teal} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <PPText weight="semibold" size="md" color={PP.ink}>
          {title}
        </PPText>
        <PPText size="sm" color={PP.ink2} style={{ marginTop: 3, lineHeight: PP.fontSizes.sm * PP.leading.normal }}>
          {desc}
        </PPText>
        <View style={{ marginTop: PP.space.md }}>
          {state === 'granted' ? (
            <Pill icon="check">Erlaubt</Pill>
          ) : state === 'denied' ? (
            <Pill bg={alpha(PP.ink, 'subtle')} color={PP.ink2}>
              Übersprungen
            </Pill>
          ) : (
            <Pressable
              onPress={onAsk}
              accessibilityRole="button"
              accessibilityLabel={`${title} erlauben`}
              hitSlop={10}
            >
              <Pill icon="plus">Erlauben</Pill>
            </Pressable>
          )}
        </View>
      </View>
    </Card>
  );
}
