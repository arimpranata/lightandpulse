import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { Badge, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { partySize } from '@/domain/profile';
import { compareRoutes, ROUTE_MODES, type TransportId } from '@/domain/routing';
import type { JourneyItem } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

const TRANSPORT_ICON: Record<TransportId, IconName> = {
  'private-driver': 'car',
  'ride-hail-car': 'car',
  'ride-hail-motorbike': 'scooter',
  shuttle: 'bus',
};

/** S10 Route Compare: cheapest / fastest / comfortable / sustainable per leg (spec §11). */
export default function RouteScreen() {
  const theme = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { d, f, money, date: formatDate } = useI18n();
  const { journey, profile } = useApp();
  if (!profile) return null;

  const day = journey?.days.find((x) => x.date === date) ?? journey?.days[0];
  const stops = (day?.items ?? []).filter((item): item is JourneyItem & { coordinates: NonNullable<JourneyItem['coordinates']> } => !!item.coordinates);
  const legs = stops.slice(1).map((to, index) => ({ from: stops[index], to }));
  const party = partySize(profile);

  return (
    <Screen title={`${d.route.title}${day ? ` · ${formatDate(day.date)}` : ''}`}>
      {legs.length === 0 ? (
        <EmptyState icon="route" title={d.route.noLegs} />
      ) : (
        legs.map(({ from, to }) => {
          const comparison = compareRoutes(from.coordinates, to.coordinates, party);
          return (
            <Section key={`${from.id}-${to.id}`} title={f(d.route.leg, { from: from.title, to: to.title })}>
              <AppText variant="caption">{f(d.route.distance, { km: comparison.distanceKm })}</AppText>
              <View style={styles.list}>
                {comparison.options.map((option) => {
                  const bestFor = ROUTE_MODES.filter((mode) => comparison.best[mode] === option.transport);
                  return (
                    <Card key={option.transport} style={bestFor.length > 0 && { borderColor: theme.primary }}>
                      <Row>
                        <Icon name={TRANSPORT_ICON[option.transport]} size={20} color={theme.brand} />
                        <AppText variant="heading" style={styles.flex}>
                          {d.route.transport[option.transport]}
                        </AppText>
                        <AppText variant="heading">{f(d.route.cost, { price: money(option.estimatedCost.amount) })}</AppText>
                      </Row>
                      <Row>
                        <AppText variant="caption">{f(d.route.duration, { n: option.durationMinutes })}</AppText>
                        <AppText variant="caption">·</AppText>
                        <AppText variant="caption">
                          {option.transfers === 0 ? d.route.noTransfers : option.transfers === 1 ? d.route.transfer : f(d.route.transfers, { n: option.transfers })}
                        </AppText>
                        <AppText variant="caption">·</AppText>
                        <AppText variant="caption">{f(d.route.co2, { kg: option.co2Kg })}</AppText>
                        {option.vehicles > 1 && (
                          <>
                            <AppText variant="caption">·</AppText>
                            <AppText variant="caption">{f(d.route.vehicles, { n: option.vehicles })}</AppText>
                          </>
                        )}
                      </Row>
                      {bestFor.length > 0 && (
                        <Row>
                          {bestFor.map((mode) => (
                            <Badge key={mode} label={d.route.modes[mode]} tone="success" icon={mode === 'sustainable' ? 'eco' : 'check'} />
                          ))}
                        </Row>
                      )}
                    </Card>
                  );
                })}
              </View>
              <AppText variant="caption" style={{ color: theme.textMuted }}>
                {f(d.route.assumptions, {
                  factor: comparison.assumptions.roadFactor,
                  speeds: Object.entries(comparison.assumptions.speeds)
                    .map(([id, kmh]) => `${d.route.transport[id as TransportId]} ${kmh} km/h`)
                    .join(', '),
                })}
              </AppText>
            </Section>
          );
        })
      )}
      <Notice icon="shield" tone="neutral">
        <AppText variant="caption">{d.route.safety}</AppText>
      </Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: Spacing.sm },
});
