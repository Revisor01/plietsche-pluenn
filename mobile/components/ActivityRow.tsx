import { View, Image } from 'react-native';
import { PP } from '../lib/theme';
import { Icon, type IconName } from '../lib/icons';
import { PPText } from './ui/Text';

interface ActivityRowProps {
  icon: IconName;
  tone?: 'teal' | 'gold' | 'sky';
  title: string;
  subtitle: string;
  imageUri?: string | null;
}

const toneColor = { teal: PP.teal, gold: PP.gold, sky: PP.sky };

export function ActivityRow({ icon, tone = 'teal', title, subtitle, imageUri }: ActivityRowProps) {
  const c = toneColor[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderRadius: 16,
        ...PP.shadowCard,
      }}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${c}1f` }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: `${c}1f`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={20} color={c} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <PPText weight="semibold" size={13.5} color={PP.ink} numberOfLines={1}>
          {title}
        </PPText>
        <PPText size={11.5} color={PP.ink2} style={{ marginTop: 1 }}>
          {subtitle}
        </PPText>
      </View>
    </View>
  );
}
