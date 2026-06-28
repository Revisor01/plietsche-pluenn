// FontAwesome 6 icon wrapper. Maps internal semantic names → FA6 light/solid names.
// Keep names stable across the app — change FA6 names here, never in screens.

import { FontAwesome6 } from '@expo/vector-icons';
import { PP } from './theme';

export type IconName =
  | 'house'
  | 'qr'
  | 'qr-scan'
  | 'medal'
  | 'coins'
  | 'camera'
  | 'location'
  | 'map-pin'
  | 'check'
  | 'plus'
  | 'minus'
  | 'flame'
  | 'bell'
  | 'bell-off'
  | 'gear'
  | 'search'
  | 'filter'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'x'
  | 'sparkles'
  | 'leaf'
  | 'trophy'
  | 'list'
  | 'grid'
  | 'shirt'
  | 'tag'
  | 'user'
  | 'users'
  | 'calendar'
  | 'chart'
  | 'star'
  | 'image'
  | 'edit'
  | 'trash'
  | 'send'
  | 'eye'
  | 'eye-off'
  | 'mail'
  | 'lock'
  | 'door'
  | 'compass'
  | 'heart'
  | 'clock'
  | 'info'
  | 'phone'
  | 'bookmark'
  | 'megaphone'
  | 'sliders'
  | 'gift'
  | 'menu'
  | 'more'
  | 'gauge';

// Mapping: app-internal name → FA6 icon name
const FA6: Record<IconName, string> = {
  house: 'house',
  qr: 'qrcode',
  'qr-scan': 'expand',
  medal: 'medal',
  coins: 'coins',
  camera: 'camera',
  location: 'location-dot',
  'map-pin': 'location-dot',
  check: 'check',
  plus: 'plus',
  minus: 'minus',
  flame: 'fire',
  bell: 'bell',
  'bell-off': 'bell-slash',
  gear: 'gear',
  search: 'magnifying-glass',
  filter: 'filter',
  'chevron-right': 'chevron-right',
  'chevron-left': 'chevron-left',
  'chevron-down': 'chevron-down',
  'arrow-right': 'arrow-right',
  'arrow-left': 'arrow-left',
  'arrow-up': 'arrow-up',
  'arrow-down': 'arrow-down',
  x: 'xmark',
  sparkles: 'wand-magic-sparkles',
  leaf: 'leaf',
  trophy: 'trophy',
  list: 'list',
  grid: 'table-cells-large',
  shirt: 'shirt',
  tag: 'tag',
  user: 'user',
  users: 'users',
  calendar: 'calendar',
  chart: 'chart-line',
  star: 'star',
  image: 'image',
  edit: 'pen-to-square',
  trash: 'trash',
  send: 'paper-plane',
  eye: 'eye',
  'eye-off': 'eye-slash',
  mail: 'envelope',
  lock: 'lock',
  door: 'door-open',
  compass: 'compass',
  heart: 'heart',
  clock: 'clock',
  info: 'circle-info',
  phone: 'phone',
  bookmark: 'bookmark',
  megaphone: 'bullhorn',
  sliders: 'sliders',
  gift: 'gift',
  menu: 'bars',
  more: 'ellipsis',
  gauge: 'gauge-high',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ name, size = 22, color = PP.ink, style }: IconProps) {
  const fa = FA6[name] ?? 'circle';
  return <FontAwesome6 name={fa as any} size={size} color={color} iconStyle="solid" style={style} />;
}

// All selectable icon names — used by the badge icon picker. Curated to the
// ones that read well as a badge symbol.
export const BADGE_ICONS: IconName[] = [
  'medal', 'trophy', 'star', 'heart', 'flame', 'sparkles', 'gift', 'leaf',
  'shirt', 'tag', 'coins', 'compass', 'bookmark', 'calendar', 'clock', 'door',
  'house', 'user', 'users', 'camera', 'image', 'megaphone', 'gauge', 'chart',
  'map-pin', 'bell', 'search', 'check',
];
