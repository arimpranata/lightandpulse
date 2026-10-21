import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { PlaceRow } from '@/components/place-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSavedPlaces } from '@/context/saved-places';
import { useContent } from '@/context/content';
import type { Place } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';

export default function SavedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { savedIds } = useSavedPlaces();
  const { getPlace } = useContent();
  const places = savedIds.map((id) => getPlace(id)).filter((place): place is Place => place !== undefined);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.lg }]}>
      <FlatList
        data={places}
        keyExtractor={(place) => place.id}
        renderItem={({ item }) => <PlaceRow place={item} />}
        contentContainerStyle={styles.list}
        style={styles.inner}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="display">Saved</AppText>
            <AppText variant="body" color="textSecondary">
              {places.length > 0
                ? `${places.length} ${places.length === 1 ? 'place' : 'places'} on your Bali wish list.`
                : 'Your Bali wish list lives here.'}
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: theme.surfaceMuted }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.surface }]}>
              <Icon name="saved" size={30} color={theme.accent} />
            </View>
            <AppText variant="heading">Nothing saved yet</AppText>
            <AppText variant="caption" style={styles.center}>
              Tap the heart on any place to keep it here for planning your trip.
            </AppText>
            <Pressable
              onPress={() => router.navigate('/explore')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}>
              <AppText variant="heading" style={{ color: theme.primaryText }}>
                Explore places
              </AppText>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { gap: Spacing.xs, marginBottom: Spacing.md },
  list: { gap: Spacing.sm + 2, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl, borderRadius: Radius.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  center: { textAlign: 'center' },
  button: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
});
