import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { PP } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';
import { PPText, PPButton } from '../../components/ui';
import { Dots } from '../../components/Dots';

const STEPS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'door', title: 'Komm vorbei', desc: 'Bei jedem Besuch checkst du kurz an der Tür ein.' },
  { icon: 'qr-scan', title: 'Stöber & nimm mit', desc: 'Manche Teile haben einen QR-Code. Scan = Punkte.' },
  { icon: 'medal', title: 'Sammel PlietschPunkte', desc: "Watt'n schönes Hobby. Mit Badges, Streaks, Spaß." },
];

export default function How() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: PP.bg, paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <View style={{ marginTop: 12 }}>
        <PPText weight="bold" size="xl2" color={PP.ink} style={{ letterSpacing: PP.tracking.title }}>
          So funktioniert's
        </PPText>
        <PPText size="base" color={PP.ink2} style={{ marginTop: 4 }}>
          Drei Schritte, kein Schnickschnack.
        </PPText>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        {STEPS.map((s) => (
          <View key={s.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <LinearGradient
              colors={PP.gradientSoft}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(39,176,146,0.18)',
              }}
            >
              <Icon name={s.icon} size={PP.iconSizes.xl} color={PP.teal} />
            </LinearGradient>
            <View style={{ flex: 1, paddingTop: 4 }}>
              <PPText weight="semibold" size="md" color={PP.ink} style={{ letterSpacing: PP.tracking.title }}>
                {s.title}
              </PPText>
              <PPText size="base" color={PP.ink2} style={{ marginTop: 2, lineHeight: PP.fontSizes.base * PP.leading.normal }}>
                {s.desc}
              </PPText>
            </View>
          </View>
        ))}
      </View>

      <PPButton iconRight="arrow-right" onPress={() => router.push('/(onboarding)/permissions')}>
        Weiter
      </PPButton>
      <View style={{ paddingTop: 14 }}>
        <Dots count={3} active={1} />
      </View>
    </View>
  );
}
