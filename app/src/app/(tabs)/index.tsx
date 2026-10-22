import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { CulturalRuleCard } from '@/components/cultural-notice';
import { Icon } from '@/components/icon';
import { InventoryCard } from '@/components/inventory-card';
import { useProfileSummary } from '@/components/profile-summary';
import { Button, Notice, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { globalRules } from '@/domain/cultural';
import { allCandidates, rank } from '@/domain/ranking';
import { hoursUntil, todayIso } from '@/domain/time';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp, useBooked } from '@/state/app-store';

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** S04 Home: current journey, next activity, recommendations, alerts. */
export default function HomeScreen() {
  const theme = useTheme();
  const { d, f, date, money, region } = useI18n();
  const { profile, journey, alerts, inventory, cart } = useApp();
  const booked = useBooked();
  const summary = useProfileSummary();

  const today = todayIso();
  const tripDate = profile && profile.startDate > today ? profile.startDate : today;
  const recommendations = useMemo(
    () => (profile ? rank(allCandidates(inventory), profile, tripDate, inventory, { booked }).slice(0, 5) : []),
    [profile, inventory, tripDate, booked],
  );
  const tip = useMemo(() => {
    const rules = globalRules(tripDate, inventory);
    return rules.length ? rules[new Date().getDate() % rules.length] : null;
  }, [inventory, tripDate]);

  if (!profile) return null;

  const total = profile.tripDays;
  const offset = daysBetween(profile.startDate, today);
  const status =
    offset < -1
      ? f(d.home.startsIn, { days: -offset, total })
      : offset === -1
        ? f(d.home.startsTomorrow, { total })
        : offset < total
          ? f(d.home.onTrip, { day: offset + 1, total })
          : d.home.tripOver;

  // Next activity: the first planned item that has not ended yet (Bali time).
  const next = journey?.days
    .flatMap((day, index) => day.items.filter((item) => item.kind !== 'meal').map((item) => ({ day, index, item })))
    .find(({ day, item }) => hoursUntil(day.date, item.end) > 0);

  const cartLines = cart.status === 'active' ? cart.lines.length : 0;

  return (
    <Screen root>
      <LinearGradient colors={['#0B4F6C', '#0B7A70']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <AppText variant="label" style={styles.heroLabel}>
          {d.home.greeting}
        </AppText>
        <AppText variant="display" style={styles.heroTitle}>
          {d.home.title}
        </AppText>
        <AppText variant="body" style={styles.heroBody}>
          {status}
        </AppText>
        {summary && (
          <AppText variant="caption" style={styles.heroBody} numberOfLines={2}>
            {summary.sentence}
          </AppText>
        )}
      </LinearGradient>

      <AppText variant="caption" style={{ color: theme.textMuted }}>
        {d.common.demoBanner}
      </AppText>

      {journey ? (
        <Section title={d.home.nextUp}>
          {next ? (
            <Pressable
              onPress={() => router.navigate('/journey')}
              accessibilityRole="button"
              style={[styles.next, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.nextTime, { backgroundColor: theme.surfaceMuted }]}>
                <AppText variant="label" color="textSecondary">
                  {date(next.day.date)}
                </AppText>
                <AppText variant="title">{next.item.start}</AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="heading">{next.item.title}</AppText>
                <AppText variant="caption">
                  {f(d.common.day, { n: next.index + 1 })} · {next.day.region ? region(next.day.region) : ''}
                </AppText>
              </View>
              <Icon name="chevronRight" size={16} color={theme.textMuted} />
            </Pressable>
          ) : (
            <AppText variant="body" color="textSecondary">
              {d.home.nothingNext}
            </AppText>
          )}
        </Section>
      ) : (
        <Notice icon="sparkles">
          <View style={styles.noticeBody}>
            <AppText variant="heading">{d.home.noJourney}</AppText>
            <AppText variant="caption">{d.home.noJourneyBody}</AppText>
            <Button
              label={d.home.plan}
              icon="sparkles"
              compact
              onPress={() => {
                router.navigate('/journey');
              }}
            />
          </View>
        </Notice>
      )}

      {(alerts.length > 0 || cartLines > 0) && (
        <Section title={d.home.alerts}>
          {alerts.map((alert, index) => {
            const dayIndex = journey?.days.findIndex((day) => day.date === alert.date) ?? -1;
            const text =
              alert.kind === 'locked_unavailable'
                ? f(d.home.alertLockedUnavailable, {
                    title: journey?.days.flatMap((day) => day.items).find((item) => item.id === alert.itemId)?.title ?? '',
                    date: date(alert.date),
                  })
                : alert.kind === 'locked_dropped'
                  ? f(d.home.alertLockedDropped, { title: alert.title })
                  : f(d.home.alertUnderfilled, { n: dayIndex + 1 });
            return (
              <Notice key={`${alert.kind}-${index}`} icon="alert" tone="warning">
                <AppText variant="caption">{text}</AppText>
              </Notice>
            );
          })}
          {cartLines > 0 && (
            <Pressable onPress={() => router.push('/cart')} accessibilityRole="button">
              <Notice icon="cart" tone="info">
                <AppText variant="caption">
                  {f(d.home.alertCart, { n: cartLines, time: new Date(cart.expiresAt).toTimeString().slice(0, 5) })}
                </AppText>
              </Notice>
            </Pressable>
          )}
        </Section>
      )}

      <Section
        title={d.home.recommended}
        action={<Button label={d.home.openBuilder} variant="ghost" compact onPress={() => router.push('/journey-builder')} />}>
        <AppText variant="caption">{date(tripDate)}</AppText>
        <View style={styles.list}>
          {recommendations.map((ranked) => (
            <InventoryCard
              key={ranked.item.id}
              kind={ranked.kind}
              item={ranked.item}
              ranked={ranked}
              subtitle={region(ranked.kind === 'event' ? ranked.item.venue.region : ranked.item.region)}
              price={
                ranked.kind === 'experience'
                  ? f(d.common.fromPrice, { price: money(ranked.item.price.amount) })
                  : ranked.kind === 'event'
                    ? f(d.common.fromPrice, { price: money(ranked.item.ticketTypes[0].price.amount) })
                    : undefined
              }
            />
          ))}
        </View>
      </Section>

      {tip && (
        <Section
          title={d.home.culturalTip}
          action={<Button label={d.culture.title} variant="ghost" compact onPress={() => router.push('/cultural-code')} />}>
          <CulturalRuleCard rule={tip} />
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.xs },
  heroLabel: { color: '#BFE9E3' },
  heroTitle: { color: '#FFFFFF' },
  heroBody: { color: 'rgba(255,255,255,0.9)' },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nextTime: { padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', minWidth: 88 },
  noticeBody: { gap: Spacing.sm, alignItems: 'flex-start' },
  list: { gap: Spacing.sm },
});
