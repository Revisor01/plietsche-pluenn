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
  | 'gauge'
  // Abzeichen-Symbole: Auszeichnung, Küste/Natur, Miteinander, Gefühl.
  | 'crown'
  | 'gem'
  | 'award'
  | 'ribbon'
  | 'certificate'
  | 'cake'
  | 'seedling'
  | 'tree'
  | 'clover'
  | 'sun'
  | 'moon'
  | 'snowflake'
  | 'rainbow'
  | 'water'
  | 'anchor'
  | 'sailboat'
  | 'ship'
  | 'beach'
  | 'feather'
  | 'dove'
  | 'paw'
  | 'fish'
  | 'shrimp'
  | 'handshake'
  | 'helping-hand'
  | 'hands-holding'
  | 'people'
  | 'clapping'
  | 'thumbs-up'
  | 'smile'
  | 'grin-stars'
  | 'laugh'
  | 'magic'
  | 'hand-sparkles'
  | 'bolt'
  | 'lightbulb'
  | 'key'
  | 'puzzle'
  | 'music'
  | 'palette'
  | 'map'
  | 'basket'
  | 'bag'
  | 'recycle'
  | 'earth'
  | 'spa'
  | 'mug'
  | 'cookie'
  | 'walking'
  | 'footprints';

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
  crown: 'crown',
  gem: 'gem',
  award: 'award',
  ribbon: 'ribbon',
  certificate: 'certificate',
  cake: 'cake-candles',
  seedling: 'seedling',
  tree: 'tree',
  clover: 'clover',
  sun: 'sun',
  moon: 'moon',
  snowflake: 'snowflake',
  rainbow: 'rainbow',
  water: 'water',
  anchor: 'anchor',
  sailboat: 'sailboat',
  ship: 'ship',
  beach: 'umbrella-beach',
  feather: 'feather',
  dove: 'dove',
  paw: 'paw',
  fish: 'fish',
  shrimp: 'shrimp',
  handshake: 'handshake',
  'helping-hand': 'hand-holding-heart',
  'hands-holding': 'hands-holding',
  people: 'people-group',
  clapping: 'hands-clapping',
  'thumbs-up': 'thumbs-up',
  smile: 'face-smile',
  'grin-stars': 'face-grin-stars',
  laugh: 'face-laugh-beam',
  magic: 'wand-magic-sparkles',
  'hand-sparkles': 'hand-sparkles',
  bolt: 'bolt',
  lightbulb: 'lightbulb',
  key: 'key',
  puzzle: 'puzzle-piece',
  music: 'music',
  palette: 'palette',
  map: 'map',
  basket: 'basket-shopping',
  bag: 'bag-shopping',
  recycle: 'recycle',
  earth: 'earth-europe',
  spa: 'spa',
  mug: 'mug-hot',
  cookie: 'cookie-bite',
  walking: 'person-walking',
  footprints: 'shoe-prints',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ name, size = PP.iconSizes.lg, color = PP.ink, style }: IconProps) {
  const fa = FA6[name] ?? 'circle';
  return <FontAwesome6 name={fa as any} size={size} color={color} iconStyle="solid" style={style} />;
}

// Symbole für Abzeichen und Aktionen. Bewusst ohne Werkzeug-Zeichen (Diagramm,
// Lupe, Regler): Ein Abzeichen ist eine Auszeichnung, kein Bedienelement.
// Gruppiert nach Auszeichnung, Jahreslauf, Küste, Miteinander, Gefühl, Laden.
export const BADGE_ICONS: IconName[] = [
  // Auszeichnung
  'medal', 'trophy', 'crown', 'gem', 'award', 'ribbon', 'certificate', 'star',
  // Jahreslauf & Natur
  'seedling', 'leaf', 'tree', 'clover', 'sun', 'moon', 'snowflake', 'rainbow',
  // Küste
  'anchor', 'sailboat', 'ship', 'water', 'beach', 'fish', 'shrimp', 'dove',
  // Miteinander
  'helping-hand', 'handshake', 'hands-holding', 'people', 'clapping', 'thumbs-up', 'heart', 'users',
  // Gefühl & Moment
  'smile', 'grin-stars', 'laugh', 'magic', 'hand-sparkles', 'sparkles', 'flame', 'bolt',
  // Laden & Alltag
  'shirt', 'basket', 'bag', 'gift', 'recycle', 'earth', 'coins', 'house',
  // Sonstiges mit Charakter
  'feather', 'paw', 'cake', 'mug', 'cookie', 'music', 'palette', 'puzzle',
  'lightbulb', 'key', 'map', 'compass', 'spa', 'walking', 'footprints', 'door',
];
