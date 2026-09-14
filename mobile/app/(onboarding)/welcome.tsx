import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { PP } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { PPText, PPButton } from '../../components/ui';
import { Dots } from '../../components/Dots';

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: PP.bg, paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
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
            shadowColor: PP.teal,
            shadowOpacity: 0.3,
            shadowRadius: 50,
            shadowOffset: { width: 0, height: 20 },
            elevation: 8,
          }}
        >
          <Icon name="shirt" size={62} color="#fff" />
        </LinearGradient>
        <View style={{ alignItems: 'center' }}>
          <PPText weight="bold" size="hero" color={PP.ink} style={{ letterSpacing: PP.tracking.hero }}>
            Moin!
          </PPText>
          <PPText size="base" color={PP.ink2} style={{ marginTop: 8, lineHeight: PP.fontSizes.base * PP.leading.loose, textAlign: 'center', maxWidth: 280 }}>
            Schön, dass du da bist. Plietsche Plünn ist der Kleidertausch-Laden deiner Kirchengemeinde — und das hier ist deine App dazu.
          </PPText>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <PPButton iconRight="arrow-right" onPress={() => router.push('/(onboarding)/how')}>
          Los geht's
        </PPButton>
      </View>
      <View style={{ paddingTop: 14 }}>
        <Dots count={3} active={0} />
      </View>
    </View>
  );
}
