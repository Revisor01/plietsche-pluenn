import { View, Image, Pressable } from 'react-native';
import { PP } from '../lib/theme';
import { Icon } from '../lib/icons';
import { PPText } from './ui/Text';
import { itemThumb } from '../lib/format';
import type { Item } from '../lib/types';

export function ShowcaseCard({ item, onPress }: { item: Item; onPress?: () => void }) {
  const uri = itemThumb(item);
  return (
    <Pressable onPress={onPress} style={{ width: 132 }}>
      <View
        style={{
          width: 132,
          height: 158,
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
          <Icon name="shirt" size={PP.iconSizes.hero} color="rgba(39,176,146,0.5)" />
        )}
      </View>
      <PPText weight="semibold" size="sm" color={PP.ink} style={{ marginTop: 8 }} numberOfLines={1}>
        {item.title}
      </PPText>
      <PPText size="xs" color={PP.ink2} style={{ marginTop: 1 }}>
        {item.size ? `Größe ${item.size}` : `+${item.points} Punkte`}
      </PPText>
    </Pressable>
  );
}
