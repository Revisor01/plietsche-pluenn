import { View, StyleProp, ViewStyle } from 'react-native';
import { PP, alpha, type AlphaStep } from '../../lib/theme';
import { Icon, type IconName } from '../../lib/icons';

type TileSize = keyof typeof PP.tile;

interface IconTileProps {
  icon: IconName;
  /** Kantenlänge: s 40 · m 44 · l 48. */
  size?: TileSize;
  /** Farbe des Symbols; die Fläche wird daraus getönt. */
  tint?: string;
  /** Deckkraft der getönten Fläche. */
  tone?: AlphaStep;
  /** Volle Fläche statt getönter — dann steht das Symbol in `onBrand`. */
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Quadratische Kachel mit getöntem Grund und mittigem Symbol.
 *
 * Dieses Muster stand über 30-mal von Hand in den Screens — Quadrat, weicher
 * Radius, getönte Fläche, Symbol in der Mitte. Token für Kantenlänge, Radius
 * und Tönung hätten die Wiederholung nur verlagert; als Komponente
 * verschwindet sie.
 */
export function IconTile({
  icon,
  size = 's',
  tint = PP.teal,
  tone = 'subtle',
  solid = false,
  style,
}: IconTileProps) {
  const edge = PP.tile[size];
  return (
    <View
      style={[
        {
          width: edge,
          height: edge,
          borderRadius: PP.rTile2,
          backgroundColor: solid ? tint : alpha(tint, tone),
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={icon} size={PP.iconSizes.md} color={solid ? PP.onBrand : tint} />
    </View>
  );
}
