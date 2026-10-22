import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddToJourney } from '@/components/add-to-journey';
import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { DayPicker, Stepper } from '@/components/controls';
import { CulturalNotes } from '@/components/cultural-notice';
import { DetailHero } from '@/components/detail-hero';
import { Bullets, DetailLayout, Fact, Facts } from '@/components/detail-layout';
import { artFor, InventoryCard } from '@/components/inventory-card';
import { Badge, Button, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { experienceAvailability } from '@/domain/availability';
import { evaluate } from '@/domain/cultural';
import { partySize } from '@/domain/profile';
import { allCandidates, rank, scoreCandidate } from '@/domain/ranking';
import { addDays, todayIso } from '@/domain/time';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp, useBooked } from '@/state/app-store';
import { experienceLine } from '@/state/cart-lines';

/** S06 Experience Detail: description, cultural notes, price, availability, reviews. */
export default function ExperienceScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, f, date: formatDate, money, region, explain, duration } = useI18n();
  const app = useApp();
  const { inventory, profile, journey } = app;
  const booked = useBooked();
  const experience = inventory.experiences.find((x) => x.id === id);

  const tripDates = journey?.days.map((day) => day.date) ??
    (profile ? Array.from({ length: profile.tripDays }, (_, i) => addDays(profile.startDate, i)) : [todayIso()]);
  const planned = journey?.days.flatMap((day) => day.items.map((item) => ({ day, item }))).find(({ item }) => item.refId === id);
  const [date, setDate] = useState(planned?.day.date ?? tripDates[0]);
  const [slot, setSlot] = useState<string | null>(planned?.item.start ?? null);
  const [participants, setParticipants] = useState(profile ? partySize(profile) : 2);
  const [added, setAdded] = useState(false);

  if (!experience || !profile) {
    return (
      <Screen>
        <EmptyState icon="search" title={d.explore.empty} action={<Button label={d.common.back} onPress={() => router.replace('/')} />} />
      </Screen>
    );
  }

  const candidate = { kind: 'experience' as const, item: experience };
  const guardian = evaluate(candidate, date, inventory);
  const blocked = guardian.decision === 'block';
  const ranked = scoreCandidate(candidate, profile, date, inventory, { booked });
  const vendor = inventory.vendors.find((v) => v.id === experience.vendorId);
  const art = artFor('experience', experience);
  const slots = experience.slots.map((time) => ({ time, result: experienceAvailability(experience, date, time, participants, booked) }));
  const chosen = slots.find((s) => s.time === slot && s.result.available) ?? slots.find((s) => s.result.available);
  const alternatives = blocked
    ? rank(allCandidates(inventory).filter((c) => c.kind === 'experience' && c.item.id !== experience.id && c.item.categories.some((k) => experience.categories.includes(k))), profile, date, inventory, { booked }).slice(0, 3)
    : [];

  return (
    <DetailLayout
      hero={
        <DetailHero
          gradient={art.gradient}
          icon={blocked ? 'blocked' : art.icon}
          eyebrow={`${experience.categories.map((k) => d.prefs[k]).join(' · ')} · ${region(experience.region)}`}
          title={experience.title}
          badges={
            <>
              <Badge label={d.common.demoData} tone="demo" />
              {vendor?.verificationStatus === 'verified' ? (
                <Badge label={d.common.verified} tone="verified" icon="verified" />
              ) : (
                <Badge label={d.common.verificationPending} tone="pending" />
              )}
            </>
          }
        />
      }
      footer={
        !blocked && (
          <>
            <Row style={styles.between}>
              <AppText variant="heading">{d.detail.total}</AppText>
              <AppText variant="title">{money(experience.price.amount * participants)}</AppText>
            </Row>
            <Button
              label={added ? d.common.addedToCart : d.common.addToCart}
              icon={added ? 'checkCircle' : 'cart'}
              disabled={!chosen}
              onPress={() => {
                if (!chosen) return;
                app.addToCart(experienceLine(experience, date, chosen.time, participants));
                setAdded(true);
              }}
            />
            {added && <Button label={d.common.viewCart} variant="ghost" compact onPress={() => router.push('/cart')} />}
          </>
        )
      }>
      {blocked ? (
        <Notice icon="blocked" tone="danger">
          <AppText variant="heading">{d.detail.blockedTitle}</AppText>
          <AppText variant="caption">{d.detail.blockedBody}</AppText>
        </Notice>
      ) : (
        ranked &&
        explain(ranked.reasons) && (
          <Notice icon="sparkles">
            <AppText variant="caption">{explain(ranked.reasons)}</AppText>
          </Notice>
        )
      )}

      {guardian.rules.length > 0 && (
        <Section title={d.detail.culture}>
          <CulturalNotes rules={guardian.rules} showSource />
        </Section>
      )}

      {blocked ? (
        <Section title={d.detail.alternatives}>
          <View style={styles.list}>
            {alternatives.map((alt) => (
              <InventoryCard key={alt.item.id} kind={alt.kind} item={alt.item} ranked={alt} subtitle={region(alt.kind === 'event' ? alt.item.venue.region : alt.item.region)} />
            ))}
          </View>
        </Section>
      ) : (
        <>
          <Facts>
            <Fact icon="clock" label={d.detail.duration} value={duration(experience.durationMin)} />
            <Fact icon="ticket" label={d.detail.price} value={`${money(experience.price.amount)} ${d.common.perPerson}`} />
            <Fact icon="phrase" label={d.detail.languages} value={experience.languages.join(' · ').toUpperCase()} />
            <Fact
              icon="verified"
              label={d.detail.reviews}
              value={experience.rating.count > 0 ? f(d.common.rating, experience.rating) : d.common.noReviews}
            />
          </Facts>

          <Section title={d.detail.about}>
            <AppText variant="body" color="textSecondary">
              {experience.summary}
            </AppText>
            {vendor && <AppText variant="caption">{f(d.detail.operator, { name: vendor.name })}</AppText>}
          </Section>

          {experience.included.length > 0 && (
            <Section title={d.detail.included}>
              <Bullets items={experience.included} icon="check" />
            </Section>
          )}

          <Section title={d.detail.availability}>
            <Card>
              <AppText variant="label" color="textSecondary">
                {d.detail.date}
              </AppText>
              <DayPicker
                days={tripDates.map((x) => ({ date: x, label: formatDate(x) }))}
                selected={date}
                onSelect={(next) => {
                  setDate(next);
                  setAdded(false);
                }}
                label={(index) => f(d.common.day, { n: index + 1 })}
              />
              <AppText variant="label" color="textSecondary">
                {d.detail.time}
              </AppText>
              <Row>
                {slots.map(({ time, result }) => (
                  <Chip
                    key={time}
                    label={result.available ? `${time} · ${f(d.common.seatsLeft, { n: result.remaining })}` : `${time} · ${d.common.unavailable}`}
                    selected={chosen?.time === time}
                    onPress={() => result.available && setSlot(time)}
                  />
                ))}
              </Row>
              {!chosen && (
                <AppText variant="caption" style={{ color: theme.warning }}>
                  {d.detail.soldOut}
                </AppText>
              )}
              <Stepper label={d.detail.participants} value={participants} min={1} max={experience.capacity} onChange={setParticipants} />
              <AppText variant="caption">{f(d.detail.cancellation, { hours: experience.cancellationPolicy.freeCancellationHours })}</AppText>
              <AppText variant="caption">
                {d.detail.meetingPoint}: {experience.meetingPoint}
              </AppText>
            </Card>
          </Section>

          <AddToJourney candidate={candidate} />
        </>
      )}
    </DetailLayout>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  list: { gap: Spacing.sm },
});
