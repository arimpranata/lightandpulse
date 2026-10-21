import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { PlaceArt } from '@/components/place-art';
import { SaveButton } from '@/components/save-button';
import { Radius, Spacing } from '@/constants/theme';
import { getCategory, REGIONS, type Place } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';

function openPlace(place: Place) {
  router.push({ pathname: '/place/[id]', params: { id: place.id } });
}

/** Tall card for horizontal carousels. */
export function FeaturedPlaceCard({ place, width = 260 }: { place: Place; width?: number }) {
  const category = getCategory(place.category);
  return (
    <Pressable
      onPress={() => openPlace(place)}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${place.tagline}`}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.9 : 1 }]}>
      <PlaceArt gradient={category.gradient} icon={category.icon} iconSize={180} style={styles.featured}>
        <View style={styles.featuredTop}>
          <View style={styles.badge}>
            <Icon name={category.icon} size={13} color="#FFFFFF" />
            <AppText variant="caption" style={styles.badgeText}>
              {category.label}
            </AppText>
          </View>
          <SaveButton placeId={place.id} />
        </View>
        <View style={styles.featuredBottom}>
          <AppText variant="title" style={styles.onArt}>
            {place.name}
          </AppText>
          <AppText variant="caption" style={styles.onArtMuted} numberOfLines={2}>
            {place.tagline}
          </AppText>
          <View style={styles.metaRow}>
            <Icon name="location" size={13} color="rgba(255,255,255,0.85)" />
            <AppText variant="caption" style={styles.onArtMuted}>
              {REGIONS[place.region]}
            </AppText>
          </View>
        </View>
      </PlaceArt>
    </Pressable>
  );
}

/** Compact list row. */
export function PlaceRow({ place }: { place: Place }) {
  const theme = useTheme();
  const category = getCategory(place.category);
  return (
    <Pressable
      onPress={() => openPlace(place)}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${place.tagline}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <PlaceArt gradient={category.gradient} icon={category.icon} iconSize={70} style={styles.thumb}>
        <View style={styles.thumbIcon}>
          <Icon name={category.icon} size={28} color="#FFFFFF" />
        </View>
      </PlaceArt>
      <View style={styles.rowBody}>
        <AppText variant="heading" numberOfLines={1}>
          {place.name}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {place.tagline}
        </AppText>
        <View style={styles.metaRow}>
          <Icon name="location" size={12} color={theme.textMuted} />
          <AppText variant="caption" style={{ color: theme.textMuted }} numberOfLines={1}>
            {place.area}
          </AppText>
        </View>
      </View>
      <Icon name="chevronRight" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  featured: {
    height: 320,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featuredBottom: { gap: Spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  badgeText: { color: '#FFFFFF', fontWeight: '600' },
  onArt: { color: '#FFFFFF' },
  onArtMuted: { color: 'rgba(255,255,255,0.88)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm + 2,
    paddingRight: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 76, height: 76, borderRadius: Radius.sm + 2 },
  thumbIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
});
