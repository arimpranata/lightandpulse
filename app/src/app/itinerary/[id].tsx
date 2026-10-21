import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BackButton } from '@/components/back-button';
import { Icon } from '@/components/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useContent } from '@/context/content';
import { useTheme } from '@/hooks/use-theme';

export default function ItineraryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCategory, getItinerary, getPlace } = useContent();
  const itinerary = getItinerary(id);

  if (!itinerary) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.background }]}>
        <AppText variant="title">Trip not found</AppText>
        <Pressable onPress={() => router.replace('/')}>
          <AppText variant="heading" color="primary">
            Back to Discover
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={itinerary.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        <BackButton />
        <View style={styles.heroText}>
          <AppText variant="label" style={styles.onArtMuted}>
            Itinerary
          </AppText>
          <AppText variant="display" style={styles.onArt}>
            {itinerary.title}
          </AppText>
          <AppText variant="body" style={styles.onArtMuted}>
            {itinerary.summary}
          </AppText>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {itinerary.days.map((day) => (
          <View key={day.title} style={styles.day}>
            <AppText variant="title">{day.title}</AppText>
            <View>
              {day.stops.map((stop, index) => {
                const place = getPlace(stop.placeId);
                if (!place) return null;
                const category = getCategory(place.category);
                const isLast = index === day.stops.length - 1;
                return (
                  <View key={stop.placeId} style={styles.stop}>
                    <View style={styles.timeline}>
                      <LinearGradient colors={category.gradient} style={styles.dot}>
                        <Icon name={category.icon} size={16} color="#FFFFFF" />
                      </LinearGradient>
                      {!isLast && <View style={[styles.line, { backgroundColor: theme.border }]} />}
                    </View>
                    <Pressable
                      onPress={() => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.stopCard,
                        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
                      ]}>
                      <View style={styles.stopText}>
                        <AppText variant="label" color="accent">
                          {stop.time}
                        </AppText>
                        <AppText variant="heading">{place.name}</AppText>
                        <AppText variant="caption">{stop.note}</AppText>
                      </View>
                      <Icon name="chevronRight" size={16} color={theme.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <AppText variant="caption" style={{ color: theme.textMuted }}>
          Times are suggestions. Bali traffic is unpredictable — a private driver makes these days much easier.
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.xxl, gap: Spacing.xl },
  hero: {
    minHeight: 280,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  heroText: { gap: Spacing.xs, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  onArt: { color: '#FFFFFF' },
  onArtMuted: { color: 'rgba(255,255,255,0.9)' },
  body: {
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  day: { gap: Spacing.md },
  stop: { flexDirection: 'row', gap: Spacing.md },
  timeline: { alignItems: 'center', width: 36 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, marginVertical: Spacing.xs },
  stopCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stopText: { flex: 1, gap: 2 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
});
