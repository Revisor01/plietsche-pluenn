import { View, Image } from 'react-native';

import { PP, alpha } from '../../lib/theme';
import { Icon } from '../../lib/icons';
import { useShowcase } from '../../lib/hooks/useData';
import { itemThumb } from '../../lib/format';
import { Screen, PPHeader, PPText, Card, IconButton } from '../../components/ui';
import type { Item } from '../../lib/types';
import { useGoBack } from '../../lib/hooks/useGoBack';

// Two-column grid card for the full showcase listing.
function GridCard({ item }: { item: Item }) {
  const uri = itemThumb(item);
  return (
    <View style={{ width: '48%' }}>
      <View
        style={{
          width: '100%',
          aspectRatio: 0.84,
          borderRadius: PP.rTile,
          overflow: 'hidden',
          backgroundColor: alpha(PP.teal, "subtle"),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Icon name="shirt" size={PP.iconSizes.hero} color={alpha(PP.teal, 'veil')} />
        )}
      </View>
      <PPText weight="semibold" size="base" color={PP.ink} style={{ marginTop: PP.space.sm }} numberOfLines={1}>
        {item.title}
      </PPText>
      <PPText size="sm" color={PP.ink2} style={{ marginTop: 1 }}>
        {item.size ? `Größe ${item.size}` : `+${item.points} Punkte`}
      </PPText>
    </View>
  );
}

export default function Showcase() {
  const goBack = useGoBack();
  const { data: items } = useShowcase(200);

  return (
    <Screen padBottom={120}>
      <PPHeader
        subtitle="Im Laden"
        title="Schaufenster"
        leading={<IconButton icon="chevron-left" accessibilityLabel="Zurück" onPress={goBack} />}
      />

      <View
        style={{
          paddingHorizontal: PP.space.xl,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          rowGap: PP.space.lg,
        }}
      >
        {items?.length ? (
          items.map((item) => <GridCard key={item.id} item={item} />)
        ) : (
          <Card pad={16} style={{ width: '100%' }}>
            <PPText size="base" color={PP.ink2}>
              Gerade ist nichts im Schaufenster. Schau bald wieder vorbei!
            </PPText>
          </Card>
        )}
      </View>
    </Screen>
  );
}
