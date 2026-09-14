import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { PP, glow } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { PPText, PPButton } from '../../components/ui';
import { Dots } from '../../components/Dots';

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: PP.bg, paddingHorizontal: PP.space.xxl, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: PP.space.xxl }}>
        <LinearGradient
          colors={PP.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 132,
            height: 132,
            borderRadius: 66,
            alignItems: 'center',
            justifyContent: 'center',
            ...glow(PP.teal, 'l'),
          }}
        >
          <Icon name="shirt" size={62} color={PP.onBrand} />
        </LinearGradient>
        <View style={{ alignItems: 'center' }}>
          <PPText weight="bold" size="hero" color={PP.ink} style={{ letterSpacing: PP.tracking.hero }}>
            Moin!
          </PPText>
          <PPText size="base" color={PP.ink2} style={{ marginTop: PP.space.sm, lineHeight: PP.fontSizes.base * PP.leading.loose, textAlign: 'center', maxWidth: 280 }}>
            Schön, dass du da bist. Plietsche Plünn ist der Kleidertausch-Laden deiner Kirchengemeinde — und das hier ist deine App dazu.
          </PPText>
        </View>
      </View>

      <View style={{ gap: PP.space.md }}>
        <PPButton iconRight="arrow-right" onPress={() => router.push('/(onboarding)/how')}>
          Los geht's
        </PPButton>
      </View>
      <View style={{ paddingTop: PP.space.lg }}>
        <Dots count={3} active={0} />
      </View>
    </View>
  );
}
