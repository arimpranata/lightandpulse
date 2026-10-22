import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { DayPicker } from '@/components/controls';
import { DetailHero } from '@/components/detail-hero';
import { DetailLayout, Fact, Facts } from '@/components/detail-layout';
import { Badge, Button, Card, Notice, Row, Section } from '@/components/ui';
import { serviceAvailability } from '@/domain/availability';
import { partySize } from '@/domain/profile';
import { addDays, todayIso } from '@/domain/time';
import type { DriverService, Guide } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp, useBooked } from '@/state/app-store';
import { driverLine, guideLine } from '@/domain/cart-lines';

type Props = { kind: 'guide'; provider: Guide } | { kind: 'driver'; provider: DriverService };

/** S14 Guide/Driver Profile: identity, verification, language, specialty, vehicle. */
export function ProviderProfile(props: Props) {
  const theme = useTheme();
  const { d, f, date: formatDate, money, region } = useI18n();
  const app = useApp();
  const { profile, journey, ledger } = app;
  const booked = useBooked();
  const tripDates = journey?.days.map((day) => day.date) ??
    (profile ? Array.from({ length: profile.tripDays }, (_, i) => addDays(profile.startDate, i)) : [todayIso()]);
  const [date, setDate] = useState(tripDates[0]);
  const [added, setAdded] = useState(false);

  const { provider } = props;
  const availability = serviceAvailability(provider, date, booked);
  const confirmed = ledger.bookings.some((b) => b.itemId === provider.id && b.status === 'confirmed');
  const name = props.kind === 'guide' ? props.provider.name : props.provider.driverName;
  const party = profile ? partySize(profile) : 2;
  const tooSmall = props.kind === 'driver' && props.provider.vehicle.seats < party;

  return (
    <DetailLayout
      hero={
        <DetailHero
          gradient={props.kind === 'guide' ? ['#0B4F6C', '#0B7A70'] : ['#24394A', '#0B4F6C']}
          icon={props.kind === 'guide' ? 'person' : 'car'}
          eyebrow={props.kind === 'guide' ? d.journey.guide : d.journey.driver}
          title={name}
          subtitle={props.kind === 'driver' ? props.provider.vehicle.label : undefined}
          badges={
            <>
              {provider.demo && <Badge label={d.common.demoData} tone="demo" />}
              {provider.verified ? (
                <Badge label={d.common.verified} tone="verified" icon="verified" />
              ) : (
                <Badge label={d.common.verificationPending} tone="pending" />
              )}
            </>
          }
        />
      }
      footer={
        <>
          <Row style={styles.between}>
            <AppText variant="heading">{d.provider.dayRate}</AppText>
            <AppText variant="title">{money(provider.dayRate.amount)}</AppText>
          </Row>
          <Button
            label={added ? d.common.addedToCart : d.common.addToCart}
            icon={added ? 'checkCircle' : 'cart'}
            disabled={!availability.available || !provider.verified || tooSmall}
            onPress={() => {
              app.addToCart(props.kind === 'guide' ? guideLine(props.provider, date, party) : driverLine(props.provider, date, party));
              setAdded(true);
            }}
          />
          {added && <Button label={d.common.viewCart} variant="ghost" compact onPress={() => router.push('/cart')} />}
        </>
      }>
      <Facts>
        <Fact icon="phrase" label={d.provider.languages} value={provider.languages.join(' · ').toUpperCase()} />
        <Fact icon="location" label={d.provider.areas} value={provider.areas.map(region).join(', ')} />
        <Fact icon="verified" label={d.detail.reviews} value={f(d.common.rating, provider.rating)} />
        {props.kind === 'guide' ? (
          <Fact icon="sparkles" label={d.provider.specialties} value={props.provider.specialties.map((k) => d.prefs[k]).join(', ')} />
        ) : (
          <Fact
            icon="car"
            label={d.provider.vehicle}
            value={`${f(d.provider.seats, { n: props.provider.vehicle.seats })} · ${d.provider.transmission[props.provider.vehicle.transmission]}${
              props.provider.vehicle.lowEmission ? ` · ${d.provider.lowEmission}` : ''
            }`}
          />
        )}
      </Facts>

      {props.kind === 'guide' && (
        <AppText variant="body" color="textSecondary">
          {props.provider.bio}
        </AppText>
      )}

      <Notice icon={confirmed ? 'chat' : 'shield'}>
        <AppText variant="caption">{confirmed ? d.order.contact : d.provider.contactHidden}</AppText>
      </Notice>

      <Section title={d.provider.book}>
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
          <AppText variant="body" style={{ color: availability.available && !tooSmall ? theme.success : theme.warning }}>
            {tooSmall ? f(d.provider.seats, { n: (props.provider as DriverService).vehicle.seats }) : availability.available ? formatDate(date) : d.common.unavailable}
          </AppText>
          <AppText variant="caption">{f(d.detail.cancellation, { hours: provider.cancellationPolicy.freeCancellationHours })}</AppText>
        </Card>
      </Section>
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
});
