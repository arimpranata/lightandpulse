import { Linking } from 'react-native';

import type { LatLng } from '@/domain/types';

/**
 * Hands navigation to the device's maps app. Routing inside the app uses demo
 * estimates until a maps/routing provider is chosen (decision D-012).
 */
export function openInMaps(coordinates: LatLng) {
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`);
}
