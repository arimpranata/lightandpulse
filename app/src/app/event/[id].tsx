import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddToJourney } from '@/components/add-to-journey';
import { AppText } from '@/components/app-text';
import { DayPicker, Stepper } from '@/components/controls';
import { CulturalNotes } from '@/components/cultural-notice';
import { DetailHero } from '@/components/detail-hero';
import { DetailLayout, Fact, Facts } from '@/components/detail-layout';
import { artFor, InventoryCard } from '@/components/inventory-card';
import { Badge, Button, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { eventAvailability } from '@/domain/availability';
import { evaluate } from '@/domain/cultural';
import { haversineKm } from '@/domain/geo';
import { partySize } from '@/domain/profile';
import { scoreCandidate } from '@/domain/ranking';
import { addDays, todayIso } from '@/domain/time';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { openInMaps } from '@/services/maps';
import { useApp, useBooked } from '@/state/app-store';
import { eventLine } from '@/domain/cart-lines';

/** S08 Event Detail: programme, tickets, venue, transport and nearby services. */
export default function EventScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, f, date: formatDate, money, region, explain, duration } = useI18n();
  const app = useApp();
  const { inventory, profile, journey } = app;
  const booked = useBooked();
  const event = inventory.events.find((x) => x.id === id);

  const tripDates = journey?.days.map((day) => day.date) ??
    (profile ? Array.from({ length: profile.tripDays }, (_, i) => addDays(profile.startDate, i)) : [todayIso()]);
  const [date, setDate] = useState(tripDates[0]);
  const [participants, setParticipants] = useState(profile ? partySize(profile) : 2);
  const [added, setAdded] = useState(false);

  if (!event || !profile) {
    return (
      <Screen>
        <EmptyState icon="search" title={d.explore.empty} action={<Button label={d.common.back} onPress={() => router.replace('/')} />} />
      </Screen>
    );
  }

  const candidate = { kind: 'event' as const, item: event };
  const guardian = evaluate(candidate, date, inventory);
  const ranked = scoreCandidate(candidate, profile, date, inventory, { booked });
  const organizer = inventory.vendors.find((v) => v.id === event.organizerId);
  const ticket = event.ticketTypes[0];
  const availability = eventAvailability(event, date, ticket.id, participants, booked);
  const art = artFor('event', event);
  const weekdays = event.schedule.weekdays;
  const schedule =
    weekdays.length === 7
      ? f(d.detail.everyDay, { time: event.schedule.start })
      : f(d.detail.schedule, { days: weekdays.map((w) => d.weekdays[w]).join(', '), time: event.schedule.start });
  const nearby = inventory.experiences
    .map((item) => ({ item, km: haversineKm(event.venue.coordinates, item.coordinates) }))
    .filter((entry) => entry.km < 15)
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);

  return (
    <DetailLayout
      hero={
        <DetailHero
          gradient={art.gradient}
          icon={art.icon}
          eyebrow={`${d.kind.event} · ${region(event.venue.region)}`}
          title={event.title}
          subtitle={schedule}
          badges={event.demo ? <Badge label={d.common.demoData} tone="demo" /> : undefined}
        />
      }
      footer={
        <>
          <Row style={styles.between}>
            <AppText variant="heading">{d.detail.total}</AppText>
            <AppText variant="title">{money(ticket.price.amount * participants)}</AppText>
          </Row>
          <Button
            label={added ? d.common.addedToCart : d.common.addToCart}
            icon={added ? 'checkCircle' : 'cart'}
            disabled={!availability.available}
            onPress={() => {
              app.addToCart(eventLine(event, ticket.id, date, participants));
              setAdded(true);
            }}
          />
          {added && <Button label={d.common.viewCart} variant="ghost" compact onPress={() => router.push('/cart')} />}
        </>
      }>
      {ranked && explain(ranked.reasons) && (
        <Notice icon="sparkles">
          <AppText variant="caption">{explain(ranked.reasons)}</AppText>
        </Notice>
      )}

      <Facts>
        <Fact icon="clock" label={d.detail.duration} value={duration(event.schedule.durationMin)} />
        <Fact icon="ticket" label={d.detail.tickets} value={`${money(ticket.price.amount)} ${d.common.perPerson}`} />
        <Fact icon="location" label={d.detail.venue} value={event.venue.name} />
        <Fact icon="verified" label={d.detail.reviews} value={f(d.common.rating, event.rating)} />
      </Facts>

      {guardian.rules.length > 0 && (
        <Section title={d.detail.culture}>
          <CulturalNotes rules={guardian.rules} showSource />
        </Section>
      )}

      <Section title={d.detail.about}>
        <AppText variant="body" color="textSecondary">
          {event.summary}
        </AppText>
        {organizer && <AppText variant="caption">{f(d.detail.operator, { name: organizer.name })}</AppText>}
      </Section>

      <Section title={d.detail.program}>
        <Card>
          {event.program.map((entry) => (
            <Row key={entry.time + entry.title}>
              <AppText variant="heading" style={styles.time}>
                {entry.time}
              </AppText>
              <AppText variant="body">{entry.title}</AppText>
            </Row>
          ))}
        </Card>
      </Section>

      <Section title={d.detail.availability}>
        <Card>
          <DayPicker
            days={tripDates.map((x) => ({ date: x, label: formatDate(x) }))}
            selected={date}
            onSelect={(next) => {
              setDate(next);
              setAdded(false);
            }}
            label={(index) => f(d.common.day, { n: index + 1 })}
          />
          <AppText variant="body" style={{ color: availability.available ? theme.success : theme.warning }}>
            {availability.available
              ? `${ticket.name} · ${f(d.common.seatsLeft, { n: availability.remaining })}`
              : availability.reason === 'not_scheduled'
                ? d.detail.notOnDate
                : d.detail.soldOut}
          </AppText>
          <Stepper label={d.detail.participants} value={participants} min={1} max={20} onChange={setParticipants} />
          <AppText variant="caption">{f(d.detail.cancellation, { hours: event.cancellationPolicy.freeCancellationHours })}</AppText>
        </Card>
      </Section>

      <AddToJourney candidate={candidate} />
      <Button label={d.common.openInMaps} icon="directions" variant="secondary" onPress={() => openInMaps(event.venue.coordinates)} />

      {nearby.length > 0 && (
        <Section title={d.detail.nearby}>
          <View style={styles.list}>
            {nearby.map(({ item, km }) => (
              <InventoryCard
                key={item.id}
                kind="experience"
                item={item}
                subtitle={`${km.toFixed(1)} km`}
                price={f(d.common.fromPrice, { price: money(item.price.amount) })}
              />
            ))}
          </View>
        </Section>
      )}
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  time: { width: 64 },
  list: { gap: Spacing.sm },
});
