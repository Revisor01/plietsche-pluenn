import { View, Pressable } from 'react-native';
import { PP, alpha } from '../../lib/theme';
import { Icon, BADGE_ICONS, type IconName } from '../../lib/icons';
import { PPText } from './Text';

// Tap-to-select grid of badge icons. Controlled: pass current value + onChange.
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: IconName) => void }) {
  return (
    <View>
      <PPText weight="semibold" size="xs" color={PP.ink3} style={{ marginBottom: PP.space.sm, letterSpacing: PP.tracking.label }}>
        ICON
      </PPText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: PP.space.sm }}>
        {BADGE_ICONS.map((name) => {
          const active = value === name;
          return (
            <Pressable
              key={name}
              onPress={() => onChange(name)}
              style={{
                width: 46,
                height: 46,
                borderRadius: PP.rTile2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? PP.teal : alpha(PP.ink, "ghost"),
                borderWidth: active ? 0 : 1,
                borderColor: PP.hairline,
              }}
            >
              <Icon name={name} size={PP.iconSizes.lg} color={active ? PP.onBrand : PP.ink2} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
