import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BackButton } from '@/components/back-button';
import { Icon, type IconName } from '@/components/icon';
import { PlaceArt } from '@/components/place-art';
import { FeaturedPlaceCard } from '@/components/place-card';
import { SaveButton } from '@/components/save-button';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useContent } from '@/context/content';
import type { Place } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';

function openInMaps(place: Place) {
  const { latitude, longitude } = place.coordinates;
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Icon name={icon} size={18} color={theme.accent} />
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="body" style={styles.factValue}>
        {value}
      </AppText>
    </View>
  );
}

function BulletList({ items, icon }: { items: string[]; icon: IconName }) {
  const theme = useTheme();
  return (
    <View style={styles.bullets}>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <Icon name={icon} size={16} color={theme.primary} style={styles.bulletIcon} />
          <AppText variant="body" style={styles.bulletText}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export default function PlaceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCategory, getPlace, places, regionLabel } = useContent();
  const place = getPlace(id);

  if (!place) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.background }]}>
        <AppText variant="title">Place not found</AppText>
        <Pressable onPress={() => router.replace('/')}>
          <AppText variant="heading" color="primary">
            Back to Discover
          </AppText>
        </Pressable>
      </View>
    );
  }

  const category = getCategory(place.category);
  const nearby = places.filter((other) => other.region === place.region && other.id !== place.id);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <PlaceArt
        gradient={category.gradient}
        icon={category.icon}
        iconSize={260}
        style={[styles.hero, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.heroBar}>
          <BackButton />
          <SaveButton placeId={place.id} />
        </View>
        <View style={styles.heroText}>
          <View style={styles.heroBadge}>
            <Icon name={category.icon} size={13} color="#FFFFFF" />
            <AppText variant="caption" style={styles.onArt}>
              {category.label} · {regionLabel(place.region)}
            </AppText>
          </View>
          <AppText variant="display" style={styles.onArt}>
            {place.name}
          </AppText>
          <AppText variant="body" style={styles.onArtMuted}>
            {place.tagline}
          </AppText>
        </View>
      </PlaceArt>

      <View style={styles.body}>
        <View style={styles.facts}>
          <Fact icon="clock" label="Hours" value={place.hours} />
          <Fact icon="ticket" label="Entry" value={place.fee} />
          <Fact icon="sun" label="Best time" value={place.bestTime} />
          <Fact icon="hiking" label="Allow" value={place.duration} />
        </View>

        <View style={styles.section}>
          <AppText variant="title">About</AppText>
          <AppText variant="body" color="textSecondary">
            {place.description}
          </AppText>
          <View style={styles.areaRow}>
            <Icon name="location" size={15} color={theme.textMuted} />
            <AppText variant="caption">{place.area}</AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="title">Highlights</AppText>
          <BulletList items={place.highlights} icon="leaf" />
        </View>

        <View style={[styles.tipsCard, { backgroundColor: theme.surfaceMuted }]}>
          <View style={styles.areaRow}>
            <Icon name="tip" size={18} color={theme.gold} />
            <AppText variant="heading">Local tips</AppText>
          </View>
          <BulletList items={place.tips} icon="chevronRight" />
        </View>

        <Pressable
          onPress={() => openInMaps(place)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.mapsButton, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}>
          <Icon name="directions" size={18} color={theme.primaryText} />
          <AppText variant="heading" style={{ color: theme.primaryText }}>
            Open in Maps
          </AppText>
        </Pressable>
        <AppText variant="caption" style={[styles.disclaimer, { color: theme.textMuted }]}>
          Opening hours and fees change often; confirm on arrival.
        </AppText>
      </View>

      {nearby.length > 0 && (
        <View style={styles.section}>
          <AppText variant="title" style={styles.padded}>
            Also in {regionLabel(place.region)}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {nearby.map((other) => (
              <FeaturedPlaceCard key={other.id} place={other} width={220} />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.xxl + Spacing.lg, gap: Spacing.xl },
  hero: {
    minHeight: 360,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between' },
  heroText: { gap: Spacing.xs, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  onArt: { color: '#FFFFFF' },
  onArtMuted: { color: 'rgba(255,255,255,0.9)' },
  body: {
    gap: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fact: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  factValue: { fontWeight: '600' },
  section: { gap: Spacing.md },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs + 2 },
  bullets: { gap: Spacing.sm },
  bullet: { flexDirection: 'row', gap: Spacing.sm },
  bulletIcon: { marginTop: 3 },
  bulletText: { flex: 1 },
  tipsCard: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.pill,
  },
  disclaimer: { textAlign: 'center', marginTop: -Spacing.md },
  padded: { paddingHorizontal: Spacing.lg },
  carousel: { gap: Spacing.md, paddingHorizontal: Spacing.lg },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
});
