import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { FeaturedPlaceCard } from '@/components/place-card';
import { SectionHeader } from '@/components/section-header';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ITINERARIES } from '@/data/itineraries';
import { CATEGORIES, PLACES } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';

const FEATURED = PLACES.filter((place) => place.featured);

export default function DiscoverScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <AppText variant="label" color="accent">
          Om Swastiastu
        </AppText>
        <AppText variant="display">Discover Bali</AppText>
        <AppText variant="body" color="textSecondary">
          Temples, rice terraces and beaches on the Island of the Gods.
        </AppText>
      </View>

      <Pressable
        onPress={() => router.navigate('/explore')}
        accessibilityRole="search"
        accessibilityLabel="Search places"
        style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Icon name="search" size={18} color={theme.textMuted} />
        <AppText variant="body" style={{ color: theme.textMuted }}>
          Search temples, beaches, waterfalls…
        </AppText>
      </Pressable>

      <View style={styles.categories}>
        {CATEGORIES.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => router.navigate({ pathname: '/explore', params: { category: category.id } })}
            accessibilityRole="button"
            accessibilityLabel={category.label}
            style={({ pressed }) => [styles.categoryItem, { opacity: pressed ? 0.75 : 1 }]}>
            <LinearGradient colors={category.gradient} style={styles.categoryIcon}>
              <Icon name={category.icon} size={26} color="#FFFFFF" />
            </LinearGradient>
            <AppText variant="caption" style={styles.categoryLabel}>
              {category.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Top picks"
          subtitle="Unmissable places for a first visit"
          action={{ label: 'See all', href: '/explore' }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          decelerationRate="fast"
          snapToInterval={260 + Spacing.md}>
          {FEATURED.map((place) => (
            <FeaturedPlaceCard key={place.id} place={place} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Ready-made trips" subtitle="Day-by-day plans you can follow" />
        <View style={styles.list}>
          {ITINERARIES.map((itinerary) => {
            const stops = itinerary.days.reduce((count, day) => count + day.stops.length, 0);
            return (
              <Pressable
                key={itinerary.id}
                onPress={() => router.push({ pathname: '/itinerary/[id]', params: { id: itinerary.id } })}
                accessibilityRole="button"
                style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                <LinearGradient
                  colors={itinerary.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.trip}>
                  <View style={styles.tripText}>
                    <AppText variant="heading" style={styles.onArt}>
                      {itinerary.title}
                    </AppText>
                    <AppText variant="caption" style={styles.onArtMuted}>
                      {itinerary.summary}
                    </AppText>
                    <View style={styles.tripMeta}>
                      <Icon name="calendar" size={13} color="#FFFFFF" />
                      <AppText variant="caption" style={styles.onArt}>
                        {itinerary.days.length} {itinerary.days.length === 1 ? 'day' : 'days'} · {stops} stops
                      </AppText>
                    </View>
                  </View>
                  <Icon name="chevronRight" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => router.navigate('/guide')}
        accessibilityRole="button"
        style={[styles.guideCard, { backgroundColor: theme.surfaceMuted }]}>
        <View style={[styles.guideIcon, { backgroundColor: theme.gold }]}>
          <Icon name="tip" size={22} color="#FFFFFF" />
        </View>
        <View style={styles.tripText}>
          <AppText variant="heading">Before you go</AppText>
          <AppText variant="caption">
            Tourist levy, temple etiquette, useful phrases and a currency converter.
          </AppText>
        </View>
        <Icon name="chevronRight" size={16} color={theme.textMuted} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.xl,
    paddingBottom: Spacing.xxl,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.xs, paddingHorizontal: Spacing.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categories: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  categoryItem: { alignItems: 'center', gap: Spacing.xs + 2, flex: 1 },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { fontWeight: '600' },
  section: { gap: Spacing.md },
  carousel: { gap: Spacing.md, paddingHorizontal: Spacing.lg },
  list: { gap: Spacing.md, paddingHorizontal: Spacing.lg },
  trip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  tripText: { flex: 1, gap: Spacing.xs },
  tripMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  onArt: { color: '#FFFFFF' },
  onArtMuted: { color: 'rgba(255,255,255,0.9)' },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  guideIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
