import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PlaceRow } from '@/components/place-card';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { CATEGORIES, PLACES, REGIONS, type CategoryId, type RegionId } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';

const REGION_IDS = Object.keys(REGIONS) as RegionId[];

function isCategoryId(value: unknown): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(
    isCategoryId(params.category) ? params.category : null,
  );
  const [region, setRegion] = useState<RegionId | null>(null);

  // Tapping a category on Discover navigates here with a new param.
  const [lastParam, setLastParam] = useState(params.category);
  if (params.category !== lastParam) {
    setLastParam(params.category);
    if (isCategoryId(params.category)) setCategory(params.category);
  }

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PLACES.filter((place) => {
      if (category && place.category !== category) return false;
      if (region && place.region !== region) return false;
      if (!needle) return true;
      return [place.name, place.tagline, place.area, REGIONS[place.region]].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });
  }, [query, category, region]);

  const hasFilters = Boolean(query || category || region);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <AppText variant="display">Explore</AppText>
          <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Icon name="search" size={18} color={theme.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or area"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text }]}
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search places"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                <Icon name="close" size={18} color={theme.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          <Chip label="All" selected={category === null} onPress={() => setCategory(null)} />
          {CATEGORIES.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              icon={item.icon}
              selected={category === item.id}
              onPress={() => setCategory(category === item.id ? null : item.id)}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          {REGION_IDS.map((id) => (
            <Chip
              key={id}
              label={REGIONS[id]}
              icon="location"
              selected={region === id}
              onPress={() => setRegion(region === id ? null : id)}
            />
          ))}
        </ScrollView>

        <FlatList
          data={results}
          keyExtractor={(place) => place.id}
          renderItem={({ item }) => <PlaceRow place={item} />}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <AppText variant="caption">
                {results.length} {results.length === 1 ? 'place' : 'places'}
              </AppText>
              {hasFilters && (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setCategory(null);
                    setRegion(null);
                  }}
                  hitSlop={8}>
                  <AppText variant="caption" color="primary" style={styles.reset}>
                    Clear filters
                  </AppText>
                </Pressable>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search" size={36} color={theme.textMuted} />
              <AppText variant="heading">No places match</AppText>
              <AppText variant="caption" style={styles.center}>
                Try a different search or remove a filter.
              </AppText>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { gap: Spacing.md, paddingHorizontal: Spacing.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 15, height: '100%' },
  chipScroll: { flexGrow: 0, flexShrink: 0, marginTop: Spacing.md },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  list: { gap: Spacing.sm + 2, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  reset: { fontWeight: '700' },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  center: { textAlign: 'center' },
});
