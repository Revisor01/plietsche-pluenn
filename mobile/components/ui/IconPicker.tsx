import { View, Pressable } from 'react-native';
import { PP } from '../../lib/theme';
import { Icon, BADGE_ICONS, type IconName } from '../../lib/icons';
import { PPText } from './Text';

// Tap-to-select grid of badge icons. Controlled: pass current value + onChange.
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: IconName) => void }) {
  return (
    <View>
      <PPText weight="semibold" size="xs" color={PP.ink3} style={{ marginBottom: 8, letterSpacing: PP.tracking.label }}>
        ICON
      </PPText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BADGE_ICONS.map((name) => {
          const active = value === name;
          return (
            <Pressable
              key={name}
              onPress={() => onChange(name)}
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? PP.teal : 'rgba(26,46,44,0.05)',
                borderWidth: active ? 0 : 1,
                borderColor: PP.hairline,
              }}
            >
              <Icon name={name} size={PP.iconSizes.lg} color={active ? '#fff' : PP.ink2} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
