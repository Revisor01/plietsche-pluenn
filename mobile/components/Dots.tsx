import { View } from 'react-native';
import { PP } from '../lib/theme';

export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 18 : 6,
            height: 6,
            borderRadius: 4,
            backgroundColor: i === active ? PP.teal : 'rgba(26,46,44,0.15)',
          }}
        />
      ))}
    </View>
  );
}
