import { SymbolView } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

/**
 * Cross-platform icon names: SF Symbols on iOS, Material Symbols on Android
 * and web. Add new icons here so every screen picks from the same set.
 */
const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  explore: { ios: 'map.fill', android: 'explore' },
  saved: { ios: 'heart.fill', android: 'favorite' },
  savedOutline: { ios: 'heart', android: 'favorite' },
  guide: { ios: 'book.closed.fill', android: 'menu_book' },
  search: { ios: 'magnifyingglass', android: 'search' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on' },
  clock: { ios: 'clock', android: 'schedule' },
  ticket: { ios: 'ticket.fill', android: 'payments' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  close: { ios: 'xmark.circle.fill', android: 'close' },
  sun: { ios: 'sun.max.fill', android: 'sunny' },
  sunrise: { ios: 'sunrise.fill', android: 'wb_twilight' },
  sunset: { ios: 'sun.horizon.fill', android: 'wb_twilight' },
  weather: { ios: 'cloud.sun.fill', android: 'partly_cloudy_day' },
  hiking: { ios: 'figure.hiking', android: 'hiking' },
  exchange: { ios: 'arrow.left.arrow.right', android: 'swap_vert' },
  phrase: { ios: 'character.bubble.fill', android: 'translate' },
  phone: { ios: 'phone.fill', android: 'call' },
  medical: { ios: 'cross.case.fill', android: 'local_hospital' },
  police: { ios: 'shield.fill', android: 'local_police' },
  fire: { ios: 'flame.fill', android: 'fire_truck' },
  rescue: { ios: 'figure.open.water.swim', android: 'sailing' },
  car: { ios: 'car.fill', android: 'directions_car' },
  scooter: { ios: 'scooter', android: 'two_wheeler' },
  boat: { ios: 'sailboat.fill', android: 'sailing' },
  arrival: { ios: 'airplane.arrival', android: 'flight_land' },
  info: { ios: 'info.circle', android: 'info' },
  tip: { ios: 'lightbulb.fill', android: 'tips_and_updates' },
  respect: { ios: 'hands.sparkles.fill', android: 'volunteer_activism' },
  directions: { ios: 'arrow.triangle.turn.up.right.diamond.fill', android: 'directions_car' },
  route: { ios: 'map.fill', android: 'route' },
  temple: { ios: 'building.columns.fill', android: 'temple_hindu' },
  beach: { ios: 'beach.umbrella.fill', android: 'beach_access' },
  nature: { ios: 'mountain.2.fill', android: 'filter_hdr' },
  waterfall: { ios: 'drop.fill', android: 'water_drop' },
  culture: { ios: 'theatermasks.fill', android: 'theater_comedy' },
  waves: { ios: 'water.waves', android: 'waves' },
  leaf: { ios: 'leaf.fill', android: 'forest' },
  eco: { ios: 'leaf.fill', android: 'eco' },
  cart: { ios: 'cart.fill', android: 'shopping_cart' },
  lock: { ios: 'lock.fill', android: 'lock' },
  unlock: { ios: 'lock.open.fill', android: 'lock_open' },
  trash: { ios: 'trash', android: 'delete' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  alert: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  shield: { ios: 'checkmark.shield.fill', android: 'gpp_good' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified' },
  wallet: { ios: 'wallet.pass.fill', android: 'account_balance_wallet' },
  person: { ios: 'person.crop.circle.fill', android: 'person' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'forum' },
  list: { ios: 'list.bullet', android: 'list' },
  map: { ios: 'map', android: 'map_search' },
  blocked: { ios: 'nosign', android: 'block' },
  sliders: { ios: 'slider.horizontal.3', android: 'tune' },
  globe: { ios: 'globe', android: 'translate' },
  bolt: { ios: 'bolt.fill', android: 'bolt' },
  timeline: { ios: 'calendar.badge.clock', android: 'timeline' },
  food: { ios: 'fork.knife', android: 'restaurant' },
  palette: { ios: 'paintpalette.fill', android: 'palette' },
  music: { ios: 'music.note', android: 'music_note' },
  bus: { ios: 'bus.fill', android: 'directions_bus' },
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 22, color, style }: Props) {
  // Icon names can come from the API, so fall back for unknown ones.
  const { ios, android } = ICONS[name] ?? ICONS.info;
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      size={size}
      tintColor={color}
      style={style}
    />
  );
}
