import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BaliMap } from '@/components/bali-map';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { InventoryCard, type ItemKind } from '@/components/inventory-card';
import { EmptyState, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useContent } from '@/context/content';
import { evaluate } from '@/domain/cultural';
import { allCandidates, rank, type Candidate } from '@/domain/ranking';
import { todayIso } from '@/domain/time';
import { PREFERENCE_KEYS, type PreferenceKey } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp, useBooked } from '@/state/app-store';

type TypeFilter = 'all' | ItemKind;
const TYPES: TypeFilter[] = ['all', 'destination', 'experience', 'event', 'guide', 'driver'];

function matches(text: string, needle: string) {
  return text.toLowerCase().includes(needle);
}

/** S05 Explore: search, category chips, list/map toggle (spec §20). */
export default function ExploreScreen() {
  const theme = useTheme();
  const { d, f, money, region } = useI18n();
  const { profile, inventory } = useApp();
  const { itineraries } = useContent();
  const booked = useBooked();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [category, setCategory] = useState<PreferenceKey | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');

  const date = profile && profile.startDate > todayIso() ? profile.startDate : todayIso();
  const needle = query.trim().toLowerCase();

  const catalogue = useMemo(() => {
    if (!profile) return [];
    const candidates = allCandidates(inventory).filter((candidate) => {
      if (type !== 'all' && type !== candidate.kind) return false;
      const tags = candidate.kind === 'destination' ? candidate.item.tags : candidate.item.categories;
      if (category && !tags.includes(category)) return false;
      if (!needle) return true;
      const text =
        candidate.kind === 'destination'
          ? `${candidate.item.name} ${candidate.item.area} ${candidate.item.description}`
          : `${candidate.item.title} ${candidate.item.summary}`;
      return matches(text, needle) || matches(region(candidate.kind === 'event' ? candidate.item.venue.region : candidate.item.region), needle);
    });
    const ranked = rank(candidates, profile, date, inventory, { booked });
    // Blocked items are not recommendations, but searching for one explains why it is unavailable.
    const blocked = candidates
      .filter((candidate) => !ranked.some((r) => r.item.id === candidate.item.id))
      .map((candidate) => ({ candidate, guardian: evaluate(candidate, date, inventory) }))
      .filter(({ guardian }) => guardian.decision === 'block');
    return [...ranked.map((r) => ({ candidate: r as Candidate, ranked: r, guardian: r.guardian })), ...blocked.map((b) => ({ ...b, ranked: undefined }))];
  }, [profile, inventory, type, category, needle, date, booked, region]);

  const guides = useMemo(
    () =>
      type === 'all' || type === 'guide'
        ? inventory.guides.filter(
            (guide) =>
              (!category || guide.specialties.includes(category)) &&
              (!needle || matches(`${guide.name} ${guide.bio} ${guide.areas.map(region).join(' ')}`, needle)),
          )
        : [],
    [inventory, type, category, needle, region],
  );
  const drivers = useMemo(
    () =>
      (type === 'all' || type === 'driver') && !category
        ? inventory.drivers.filter(
            (driver) => !needle || matches(`${driver.driverName} ${driver.vehicle.label} ${driver.areas.map(region).join(' ')}`, needle),
          )
        : [],
    [inventory, type, category, needle, region],
  );

  const count = catalogue.length + guides.length + drivers.length;

  return (
    <Screen title={d.explore.title} root>
      <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Icon name="search" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={d.explore.search}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={d.explore.search}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={d.common.close}>
            <Icon name="close" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {TYPES.map((id) => (
            <Chip key={id} label={d.explore.types[id]} selected={type === id} onPress={() => setType(id)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {PREFERENCE_KEYS.map((key) => (
            <Chip key={key} label={d.prefs[key]} selected={category === key} onPress={() => setCategory(category === key ? null : key)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.resultsBar}>
        <AppText variant="caption">{f(d.explore.results, { n: count })}</AppText>
        <View style={[styles.toggle, { borderColor: theme.border }]}>
          {(['list', 'map'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setView(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === mode }}
              style={[styles.toggleItem, view === mode && { backgroundColor: theme.brand }]}>
              <Icon name={mode} size={14} color={view === mode ? theme.brandText : theme.text} />
              <AppText variant="caption" style={{ color: view === mode ? theme.brandText : theme.text, fontWeight: '700' }}>
                {d.explore[mode]}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {view === 'map' && (
        <BaliMap
          points={catalogue.map(({ candidate, guardian }) => ({
            id: candidate.item.id,
            coordinates: candidate.kind === 'event' ? candidate.item.venue.coordinates : candidate.item.coordinates,
            muted: guardian.decision === 'block',
          }))}
        />
      )}

      {count === 0 ? (
        <EmptyState icon="search" title={d.explore.empty} body={d.explore.emptyBody} />
      ) : (
        <View style={styles.list}>
          {catalogue.map(({ candidate, ranked, guardian }) => (
            <InventoryCard
              key={candidate.item.id}
              kind={candidate.kind}
              item={candidate.item}
              ranked={ranked}
              guardian={guardian}
              subtitle={
                candidate.kind === 'destination'
                  ? `${candidate.item.area}`
                  : `${region(candidate.kind === 'event' ? candidate.item.venue.region : candidate.item.region)}`
              }
              price={
                candidate.kind === 'experience'
                  ? f(d.common.fromPrice, { price: money(candidate.item.price.amount) })
                  : candidate.kind === 'event'
                    ? f(d.common.fromPrice, { price: money(candidate.item.ticketTypes[0].price.amount) })
                    : undefined
              }
            />
          ))}
          {guides.map((guide) => (
            <InventoryCard
              key={guide.id}
              kind="guide"
              item={guide}
              subtitle={`${guide.languages.join(' · ').toUpperCase()} · ${guide.specialties.map((key) => d.prefs[key]).join(', ')}`}
              price={f(d.explore.guideFrom, { price: money(guide.dayRate.amount) })}
            />
          ))}
          {drivers.map((driver) => (
            <InventoryCard
              key={driver.id}
              kind="driver"
              item={driver}
              subtitle={`${f(d.provider.seats, { n: driver.vehicle.seats })} · ${d.provider.transmission[driver.vehicle.transmission]}`}
              price={f(d.explore.guideFrom, { price: money(driver.dayRate.amount) })}
            />
          ))}
        </View>
      )}

      {!needle && type === 'all' && !category && (
        <Section title={d.explore.tripIdeas}>
          <View style={styles.list}>
            {itineraries.map((itinerary) => (
              <Pressable
                key={itinerary.id}
                onPress={() => router.push({ pathname: '/itinerary/[id]', params: { id: itinerary.id } })}
                accessibilityRole="button"
                style={[styles.idea, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Icon name="route" size={20} color={theme.brand} />
                <View style={styles.flex}>
                  <AppText variant="heading">{itinerary.title}</AppText>
                  <AppText variant="caption">{itinerary.summary}</AppText>
                </View>
                <Icon name="chevronRight" size={16} color={theme.textMuted} />
              </Pressable>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  filters: { gap: Spacing.sm, marginTop: -Spacing.md },
  chips: { gap: Spacing.sm },
  resultsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -Spacing.md },
  toggle: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.pill, overflow: 'hidden' },
  toggleItem: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  list: { gap: Spacing.sm },
  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
