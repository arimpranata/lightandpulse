import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AddToJourney } from '@/components/add-to-journey';
import { AppText } from '@/components/app-text';
import { CulturalNotes } from '@/components/cultural-notice';
import { DetailHero } from '@/components/detail-hero';
import { Bullets, DetailLayout, Fact, Facts } from '@/components/detail-layout';
import { artFor, InventoryCard } from '@/components/inventory-card';
import { Button, EmptyState, Notice, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useContent } from '@/context/content';
import { evaluate } from '@/domain/cultural';
import { haversineKm } from '@/domain/geo';
import { scoreCandidate } from '@/domain/ranking';
import { todayIso, toTime } from '@/domain/time';
import { useI18n } from '@/i18n';
import { openInMaps } from '@/services/maps';
import { useApp, useBooked } from '@/state/app-store';

/** S07 Destination Detail: highlights, etiquette, capacity, nearby experiences. */
export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, f, money, region, explain, duration } = useI18n();
  const { inventory, profile, journey } = useApp();
  const { getPlace, getCategory } = useContent();
  const booked = useBooked();
  const destination = inventory.destinations.find((x) => x.id === id);

  if (!destination) {
    return (
      <Screen>
        <EmptyState icon="search" title={d.explore.empty} action={<Button label={d.common.back} onPress={() => router.replace('/')} />} />
      </Screen>
    );
  }

  const plannedDay = journey?.days.find((day) => day.items.some((item) => item.refId === destination.id));
  const date = plannedDay?.date ?? (profile && profile.startDate > todayIso() ? profile.startDate : todayIso());
  const candidate = { kind: 'destination' as const, item: destination };
  const guardian = evaluate(candidate, date, inventory);
  const ranked = profile ? scoreCandidate(candidate, profile, date, inventory, { booked }) : null;
  const place = getPlace(destination.id);
  const art = artFor('destination', destination);
  const hours = destination.hours === 'unknown' ? d.detail.hoursUnknown : `${toTime(destination.hours.open)}–${toTime(destination.hours.close)}`;

  const nearby = [
    ...inventory.experiences.map((item) => ({ kind: 'experience' as const, item, coordinates: item.coordinates })),
    ...inventory.events.map((item) => ({ kind: 'event' as const, item, coordinates: item.venue.coordinates })),
  ]
    .map((entry) => ({ ...entry, km: haversineKm(destination.coordinates, entry.coordinates) }))
    .filter((entry) => entry.km < 15)
    .sort((a, b) => a.km - b.km)
    .slice(0, 4);

  return (
    <DetailLayout
      hero={
        <DetailHero
          gradient={art.gradient}
          icon={art.icon}
          eyebrow={`${getCategory(destination.category).label} · ${region(destination.region)}`}
          title={destination.name}
          subtitle={place?.tagline}
        />
      }>
      {ranked && explain(ranked.reasons) && (
        <Notice icon="sparkles">
          <AppText variant="caption">{explain(ranked.reasons)}</AppText>
        </Notice>
      )}

      <Facts>
        <Fact icon="clock" label={d.detail.hours} value={hours} />
        <Fact icon="ticket" label={d.detail.entry} value={destination.feeNote} />
        <Fact icon="hiking" label={d.detail.duration} value={duration(destination.visitMinutes)} />
        <Fact icon="location" label={d.detail.area} value={destination.area} />
      </Facts>
      <AppText variant="caption" style={styles.muted}>
        {d.detail.visitNote}
      </AppText>

      {guardian.rules.length > 0 && (
        <Section title={d.detail.culture}>
          <CulturalNotes rules={guardian.rules} showSource />
        </Section>
      )}

      <Section title={d.detail.about}>
        <AppText variant="body" color="textSecondary">
          {destination.description}
        </AppText>
      </Section>

      <Section title={d.detail.highlights}>
        <Bullets items={destination.highlights} />
        {place && place.tips.length > 0 && <Bullets items={place.tips} icon="tip" />}
      </Section>

      <Section title={d.detail.capacity}>
        <AppText variant="body" color="textSecondary">
          {d.detail.capacityUnknown}
        </AppText>
      </Section>

      <AddToJourney candidate={candidate} />
      <Button label={d.common.openInMaps} icon="directions" variant="secondary" onPress={() => openInMaps(destination.coordinates)} />

      {nearby.length > 0 && (
        <Section title={d.detail.nearby}>
          <View style={styles.list}>
            {nearby.map((entry) => (
              <InventoryCard
                key={entry.item.id}
                kind={entry.kind}
                item={entry.item}
                subtitle={`${entry.km.toFixed(1)} km`}
                price={f(d.common.fromPrice, {
                  price: money(entry.kind === 'experience' ? entry.item.price.amount : entry.item.ticketTypes[0].price.amount),
                })}
              />
            ))}
          </View>
        </Section>
      )}
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  muted: { marginTop: -Spacing.md },
  list: { gap: Spacing.sm },
});
