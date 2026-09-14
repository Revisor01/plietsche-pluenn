import { View, Pressable, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { PP, alpha } from '../../../lib/theme';
import { Icon } from '../../../lib/icons';
import { useStore } from '../../../lib/hooks/useData';
import { useAuth } from '../../../lib/hooks/useAuth';
import { Screen, PPHeader, PPText, Card, Pill, SectionTitle, IconButton, PPButton } from '../../../components/ui';
import { useGoBack } from '../../../lib/hooks/useGoBack';

const DAYS: { key: string; label: string }[] = [
  { key: 'mo', label: 'Mo' },
  { key: 'di', label: 'Di' },
  { key: 'mi', label: 'Mi' },
  { key: 'do', label: 'Do' },
  { key: 'fr', label: 'Fr' },
  { key: 'sa', label: 'Sa' },
  { key: 'so', label: 'So' },
];

function fmtHours(v: string | null) {
  if (!v) return '–';
  // "15-18" → "15 – 18 Uhr"
  const parts = v.split('-');
  if (parts.length === 2) return `${parts[0]} – ${parts[1]} Uhr`;
  return v;
}

export default function StoreInfo() {
  const router = useRouter();
  const goBack = useGoBack();
  const { data: store } = useStore();
  const { logout } = useAuth();

  const openMaps = () => {
    if (!store) return;
    const q = encodeURIComponent(store.address || `${store.lat},${store.lng}`);
    const url = Platform.OS === 'ios' ? `maps://?q=${q}` : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => {});
  };

  const openDays = DAYS.filter((d) => store?.hours_json?.[d.key]);

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Über"
        title="Der Laden"
        leading={<IconButton icon="chevron-left" onPress={goBack} />}
      />

      <View style={{ paddingHorizontal: PP.space.xl }}>
        <View
          style={{
            height: 150,
            borderRadius: PP.rTile,
            backgroundColor: alpha(PP.sandInk, "soft"),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="shirt" size={PP.iconSizes.hero} color={alpha(PP.sandInk, 'veil')} />
        </View>
      </View>

      <SectionTitle title="Öffnungszeiten" />
      <View style={{ paddingHorizontal: PP.space.xl }}>
        <Card pad={0} style={{ overflow: 'hidden' }}>
          {(openDays.length ? openDays : DAYS).map((d, i) => {
            const h = store?.hours_json?.[d.key] ?? null;
            const open = !!h;
            return (
              <View
                key={d.key}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingHorizontal: PP.space.lg,
                  paddingVertical: PP.space.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: PP.hairline,
                }}
              >
                <PPText weight={open ? 'semibold' : 'medium'} size="base" color={PP.ink}>
                  {d.label}
                </PPText>
                <PPText weight={open ? 'semibold' : 'regular'} size="base" color={open ? PP.teal : PP.ink2}>
                  {fmtHours(h)}
                </PPText>
              </View>
            );
          })}
        </Card>
      </View>

      <SectionTitle title="Wo du uns findest" />
      <View style={{ paddingHorizontal: PP.space.xl }}>
        <Card pad={14} style={{ flexDirection: 'row', gap: PP.space.md, alignItems: 'flex-start' }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              backgroundColor: alpha(PP.teal, "subtle"),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="map-pin" size={PP.iconSizes.lg} color={PP.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <PPText weight="semibold" size="base" color={PP.ink}>
              {store?.name ?? 'Plietsche Plünn'}
            </PPText>
            <PPText size="sm" color={PP.ink2}>
              {store?.address ?? ''}
            </PPText>
            <View style={{ flexDirection: 'row', gap: PP.space.sm, marginTop: PP.space.md }}>
              <Pressable onPress={openMaps}>
                <Pill icon="map-pin" size="s">
                  Route
                </Pill>
              </Pressable>
              {!!store?.phone && (
                <Pressable onPress={() => Linking.openURL(`tel:${store.phone}`)}>
                  <Pill icon="phone" bg={alpha(PP.ink, 'subtle')} color={PP.ink} size="s">
                    {store.phone}
                  </Pill>
                </Pressable>
              )}
            </View>
          </View>
        </Card>
      </View>

      <View style={{ paddingHorizontal: PP.space.xl, marginTop: PP.space.huge }}>
        <PPButton variant="secondary" icon="arrow-left" onPress={logout}>
          Abmelden
        </PPButton>
      </View>
    </Screen>
  );
}
