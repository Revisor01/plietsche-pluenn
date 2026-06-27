import { View, Image } from 'react-native';
import { useRouter } from 'expo-router';

import { PP } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { useShowcase } from '../../lib/hooks/useData';
import { itemThumb } from '../../lib/format';
import { Screen, PPHeader, PPText, Card, IconButton } from '../../components/ui';
import type { Item } from '../../lib/types';

// Two-column grid card for the full showcase listing.
function GridCard({ item }: { item: Item }) {
  const uri = itemThumb(item);
  return (
    <View style={{ width: '48%' }}>
      <View
        style={{
          width: '100%',
          aspectRatio: 0.84,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: 'rgba(39,176,146,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Icon name="shirt" size={42} color="rgba(39,176,146,0.5)" />
        )}
      </View>
      <PPText weight="semibold" size={PP.fontSizes.base} color={PP.ink} style={{ marginTop: 8 }} numberOfLines={1}>
        {item.title}
      </PPText>
      <PPText size={PP.fontSizes.sm} color={PP.ink2} style={{ marginTop: 1 }}>
        {item.size ? `Größe ${item.size}` : `+${item.points} Punkte`}
      </PPText>
    </View>
  );
}

export default function Showcase() {
  const router = useRouter();
  const { data: items } = useShowcase(200);

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Im Laden"
        title="Schaufenster"
        leading={<IconButton icon="chevron-left" onPress={() => router.back()} />}
      />

      <View
        style={{
          paddingHorizontal: 20,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: 18,
        }}
      >
        {items?.length ? (
          items.map((item) => <GridCard key={item.id} item={item} />)
        ) : (
          <Card pad={16} style={{ width: '100%' }}>
            <PPText size={PP.fontSizes.base} color={PP.ink2}>
              Gerade ist nichts im Schaufenster. Schau bald wieder vorbei!
            </PPText>
          </Card>
        )}
      </View>
    </Screen>
  );
}
