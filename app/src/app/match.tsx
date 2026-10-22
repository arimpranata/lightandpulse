import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { openItem } from '@/components/inventory-card';
import { Badge, Button, EmptyState, Row, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { matchDrivers, matchGuides } from '@/domain/matching';
import { partySize } from '@/domain/profile';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp, useBooked } from '@/state/app-store';
import { driverLine, guideLine } from '@/state/cart-lines';

/** Guide/driver matching for a trip day (spec §15, match_guide / match_driver). */
export default function MatchScreen() {
  const theme = useTheme();
  const { type, date, region: regionId } = useLocalSearchParams<{ type: 'guide' | 'driver'; date: string; region: string }>();
  const { d, f, date: formatDate, money, region } = useI18n();
  const app = useApp();
  const booked = useBooked();
  const [addedId, setAddedId] = useState<string | null>(null);
  const { profile, inventory } = app;
  if (!profile) return null;
  const party = partySize(profile);

  const guides = type === 'guide' ? matchGuides(inventory.guides, profile, date, regionId, booked) : [];
  const drivers = type === 'driver' ? matchDrivers(inventory.drivers, profile, date, regionId, booked) : [];
  const empty = guides.length === 0 && drivers.length === 0;

  return (
    <Screen
      title={type === 'guide' ? d.cart.addGuide : d.cart.addDriver}
      footer={addedId ? <Button label={d.common.viewCart} icon="cart" onPress={() => router.push('/cart')} /> : undefined}>
      <AppText variant="body" color="textSecondary">
        {f(d.cart.matchesFor, { date: formatDate(date), region: region(regionId) })}
      </AppText>
      {empty && <EmptyState icon={type === 'guide' ? 'person' : 'car'} title={d.cart.noMatches} />}

      <View style={styles.list}>
        {guides.map((match) => (
          <View key={match.guide.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable onPress={() => openItem('guide', match.guide.id)} accessibilityRole="button" style={styles.cardBody}>
              <Row>
                <Icon name="person" size={20} color={theme.brand} />
                <AppText variant="heading" style={styles.flex}>
                  {match.guide.name}
                </AppText>
                <AppText variant="caption">{f(d.explore.fit, { n: Math.round(match.score * 100) })}</AppText>
              </Row>
              <AppText variant="caption">
                {match.sharedLanguages.join(' · ').toUpperCase()} · {match.guide.specialties.map((k) => d.prefs[k]).join(', ')}
              </AppText>
              <Row>
                <Badge label={d.common.verified} tone="verified" icon="verified" />
                <Badge label={d.common.demo} tone="demo" />
                <AppText variant="caption">{f(d.common.rating, match.guide.rating)}</AppText>
              </Row>
            </Pressable>
            <Row style={styles.between}>
              <AppText variant="heading">{f(d.explore.guideFrom, { price: money(match.guide.dayRate.amount) })}</AppText>
              <Button
                label={addedId === match.guide.id ? d.common.addedToCart : d.common.addToCart}
                compact
                icon="cart"
                disabled={addedId === match.guide.id}
                onPress={() => {
                  app.addToCart(guideLine(match.guide, date, party));
                  setAddedId(match.guide.id);
                }}
              />
            </Row>
          </View>
        ))}
        {drivers.map((match) => (
          <View key={match.driver.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable onPress={() => openItem('driver', match.driver.id)} accessibilityRole="button" style={styles.cardBody}>
              <Row>
                <Icon name="car" size={20} color={theme.brand} />
                <AppText variant="heading" style={styles.flex}>
                  {match.driver.driverName} · {match.driver.vehicle.label}
                </AppText>
                <AppText variant="caption">{f(d.explore.fit, { n: Math.round(match.score * 100) })}</AppText>
              </Row>
              <AppText variant="caption">
                {f(d.provider.seats, { n: match.driver.vehicle.seats })} · {d.provider.transmission[match.driver.vehicle.transmission]}
                {match.driver.vehicle.lowEmission ? ` · ${d.provider.lowEmission}` : ''}
              </AppText>
              <Row>
                <Badge label={d.common.verified} tone="verified" icon="verified" />
                <Badge label={d.common.demo} tone="demo" />
                <AppText variant="caption">{f(d.common.rating, match.driver.rating)}</AppText>
              </Row>
            </Pressable>
            <Row style={styles.between}>
              <AppText variant="heading">{f(d.explore.guideFrom, { price: money(match.driver.dayRate.amount) })}</AppText>
              <Button
                label={addedId === match.driver.id ? d.common.addedToCart : d.common.addToCart}
                compact
                icon="cart"
                disabled={addedId === match.driver.id}
                onPress={() => {
                  app.addToCart(driverLine(match.driver, date, party));
                  setAddedId(match.driver.id);
                }}
              />
            </Row>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: Spacing.sm },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.lg, gap: Spacing.md },
  cardBody: { gap: Spacing.xs },
  between: { justifyContent: 'space-between' },
});
