import { View, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';

import { PP } from '../../lib/theme';
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
    <View style={{ flex: 1, backgroundColor: PP.bg, paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <View style={{ marginTop: 12 }}>
        <PPText weight="bold" size={24} color={PP.ink} style={{ letterSpacing: -0.4 }}>
          Zwei kleine Bitten
        </PPText>
        <PPText size={13} color={PP.ink2} style={{ marginTop: 4 }}>
          Beides nur, wenn du willst.
        </PPText>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
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
      <View style={{ paddingTop: 14 }}>
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
    <Card pad={16} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
      <LinearGradient
        colors={PP.gradientSoft}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name={icon} size={22} color={PP.teal} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <PPText weight="semibold" size={15} color={PP.ink}>
          {title}
        </PPText>
        <PPText size={12.5} color={PP.ink2} style={{ marginTop: 3, lineHeight: 17 }}>
          {desc}
        </PPText>
        <View style={{ marginTop: 10 }}>
          {state === 'granted' ? (
            <Pill icon="check">Erlaubt</Pill>
          ) : state === 'denied' ? (
            <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>
              Übersprungen
            </Pill>
          ) : (
            <Pressable onPress={onAsk}>
              <Pill icon="plus">Erlauben</Pill>
            </Pressable>
          )}
        </View>
      </View>
    </Card>
  );
}
