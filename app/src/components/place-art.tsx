import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';

type Props = {
  gradient: readonly [string, string];
  icon: IconName;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Illustrated artwork for a place: a category gradient with an oversized,
 * translucent icon and a soft scrim so overlaid text stays readable.
 */
export function PlaceArt({ gradient, icon, iconSize = 140, style, children }: Props) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}>
      <View style={[styles.iconWrap, { right: -iconSize * 0.18, top: -iconSize * 0.12 }]} pointerEvents="none">
        <Icon name={icon} size={iconSize} color="rgba(255,255,255,0.22)" />
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  iconWrap: { position: 'absolute' },
});
