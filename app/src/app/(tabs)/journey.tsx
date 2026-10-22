import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { DayPicker } from '@/components/controls';
import { Icon } from '@/components/icon';
import { openItem } from '@/components/inventory-card';
import { Badge, Button, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { partySize } from '@/domain/profile';
import type { JourneyItem } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';
import { eventLine, experienceLine } from '@/domain/cart-lines';

/** S13 My Journey: editable day plan, bookings and passes. */
export default function JourneyScreen() {
  const theme = useTheme();
  const { d, f, date, money, region, explain } = useI18n();
  const app = useApp();
  const { profile, journey, alerts, ledger, inventory, cart } = app;
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) return null;

  if (!journey) {
    return (
      <Screen title={d.journey.title} root>
        <EmptyState
          icon="timeline"
          title={d.journey.empty}
          body={d.journey.emptyBody}
          action={<Button label={d.journey.plan} icon="sparkles" onPress={() => app.plan()} />}
        />
      </Screen>
    );
  }

  const day = journey.days.find((x) => x.date === selected) ?? journey.days[0];
  const bookingsByItem = ledger.bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const bookingFor = (item: JourneyItem) =>
    bookingsByItem.find((b) => b.itemId === item.refId && b.date === day.date);
  const dayServices = bookingsByItem.filter((b) => b.date === day.date && (b.itemType === 'guide' || b.itemType === 'driver'));
  const unavailable = new Map(
    alerts.filter((a) => a.kind === 'locked_unavailable').map((a) => [a.itemId, a.alternatives] as const),
  );

  const bookDay = () => {
    const party = partySize(profile);
    const inCart = new Set(cart.status === 'active' ? cart.lines.map((l) => `${l.itemId}:${l.date}`) : []);
    const lines = day.items.flatMap((item) => {
      if (bookingFor(item) || inCart.has(`${item.refId}:${day.date}`)) return [];
      if (item.kind === 'experience') {
        const experience = inventory.experiences.find((e) => e.id === item.refId);
        return experience ? [experienceLine(experience, day.date, item.start, party)] : [];
      }
      if (item.kind === 'event') {
        const event = inventory.events.find((e) => e.id === item.refId);
        return event ? [eventLine(event, event.ticketTypes[0].id, day.date, party)] : [];
      }
      return [];
    });
    if (lines.length > 0) app.addToCart(lines);
    setMessage(lines.length > 0 ? f(d.journey.addedDay, { n: lines.length }) : d.journey.nothingToBook);
  };

  const orders = [...ledger.orders].reverse();

  return (
    <Screen
      title={d.journey.title}
      root
      headerRight={
        <Pressable onPress={() => router.push('/cart')} accessibilityRole="button" accessibilityLabel={d.cart.title} hitSlop={8}>
          <Icon name="cart" size={22} color={theme.text} />
          {cart.status === 'active' && cart.lines.length > 0 && (
            <View style={[styles.cartDot, { backgroundColor: theme.accent }]}>
              <AppText variant="caption" style={styles.cartCount}>
                {cart.lines.length}
              </AppText>
            </View>
          )}
        </Pressable>
      }>
      <Row>
        <Button label={d.journey.builder} icon="sparkles" compact onPress={() => router.push('/journey-builder')} />
        <Button label={d.journey.replan} icon="sliders" variant="secondary" compact onPress={() => app.plan()} />
      </Row>

      <DayPicker
        days={journey.days.map((x) => ({ date: x.date, label: date(x.date) }))}
        selected={day.date}
        onSelect={setSelected}
        label={(index) => f(d.common.day, { n: index + 1 })}
      />

      <View style={styles.dayHeader}>
        <AppText variant="title">{date(day.date)}</AppText>
        {day.region && <Badge label={region(day.region)} tone="info" icon="location" />}
      </View>

      <View style={styles.timeline}>
        {day.items.map((item) => {
          const booking = bookingFor(item);
          const alternatives = unavailable.get(item.id);
          const reason = explain(item.reasons, 2);
          return (
            <View key={item.id}>
              {item.travelMinutes > 0 && (
                <View style={styles.travel}>
                  <Icon name="car" size={13} color={theme.textMuted} />
                  <AppText variant="caption" style={{ color: theme.textMuted }}>
                    {f(d.journey.travel, { n: item.travelMinutes })}
                  </AppText>
                </View>
              )}
              <View style={styles.itemRow}>
                <View style={styles.times}>
                  <AppText variant="heading">{item.start}</AppText>
                  <AppText variant="caption">{item.end}</AppText>
                </View>
                <View
                  style={[
                    styles.item,
                    {
                      backgroundColor: item.kind === 'meal' ? theme.surfaceMuted : theme.surface,
                      borderColor: alternatives ? theme.warning : theme.border,
                    },
                  ]}>
                  {item.kind === 'meal' ? (
                    <Row>
                      <Icon name="food" size={16} color={theme.textSecondary} />
                      <AppText variant="body" color="textSecondary">
                        {d.journey.lunch}
                      </AppText>
                    </Row>
                  ) : (
                    <>
                      <Pressable onPress={() => openItem(item.kind as 'destination', item.refId)} accessibilityRole="button">
                        <AppText variant="label" color="textSecondary">
                          {d.kind[item.kind]}
                        </AppText>
                        <AppText variant="heading">{item.title}</AppText>
                        {reason && (
                          <AppText variant="caption" style={{ color: theme.primary }}>
                            {reason}
                          </AppText>
                        )}
                      </Pressable>
                      {alternatives && (
                        <Notice icon="alert" tone="warning">
                          <AppText variant="caption">{d.journey.lockedUnavailable}</AppText>
                          {alternatives.map((id) => {
                            const alt =
                              inventory.experiences.find((e) => e.id === id) ?? inventory.events.find((e) => e.id === id);
                            return alt ? (
                              <Pressable key={id} onPress={() => openItem(item.kind as 'experience', id)}>
                                <AppText variant="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                                  → {alt.title}
                                </AppText>
                              </Pressable>
                            ) : null;
                          })}
                        </Notice>
                      )}
                      <Row>
                        {booking && <Badge label={d.order.status[booking.status]} tone="success" icon="checkCircle" />}
                        {item.locked && !booking && <Badge label={d.journey.locked} tone="info" icon="lock" />}
                        <View style={styles.flex} />
                        {!booking && (
                          <>
                            <Pressable
                              onPress={() => app.toggleLock(item.id)}
                              accessibilityRole="button"
                              accessibilityLabel={item.locked ? d.journey.unlock : d.journey.lock}
                              hitSlop={8}
                              style={styles.iconButton}>
                              <Icon name={item.locked ? 'unlock' : 'lock'} size={17} color={theme.textSecondary} />
                            </Pressable>
                            <Pressable
                              onPress={() => app.removeFromJourney(item.id, item.refId)}
                              accessibilityRole="button"
                              accessibilityLabel={d.common.remove}
                              hitSlop={8}
                              style={styles.iconButton}>
                              <Icon name="trash" size={17} color={theme.textSecondary} />
                            </Pressable>
                          </>
                        )}
                      </Row>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {dayServices.length > 0 && (
        <Card>
          {dayServices.map((service) => (
            <Pressable
              key={service.id}
              onPress={() => openItem(service.itemType === 'guide' ? 'guide' : 'driver', service.itemId)}
              accessibilityRole="button">
              <Row>
                <Icon name={service.itemType === 'guide' ? 'person' : 'car'} size={18} color={theme.brand} />
                <AppText variant="heading" style={styles.flex}>
                  {service.itemType === 'guide' ? d.journey.guide : d.journey.driver}: {service.title}
                </AppText>
                <Badge label={d.order.status[service.status]} tone="success" />
              </Row>
            </Pressable>
          ))}
          <AppText variant="caption">{d.order.contact}</AppText>
        </Card>
      )}

      <View style={styles.actions}>
        <Button label={d.journey.bookDay} icon="cart" onPress={bookDay} />
        {message && (
          <Pressable onPress={() => router.push('/cart')}>
            <AppText variant="caption" style={{ color: theme.primary, textAlign: 'center' }}>
              {message} · {d.common.viewCart}
            </AppText>
          </Pressable>
        )}
        <Row>
          <Button
            label={d.cart.addGuide}
            icon="person"
            variant="secondary"
            compact
            onPress={() => router.push({ pathname: '/match', params: { type: 'guide', date: day.date, region: day.region ?? profile.baseRegion } })}
          />
          <Button
            label={d.cart.addDriver}
            icon="car"
            variant="secondary"
            compact
            onPress={() => router.push({ pathname: '/match', params: { type: 'driver', date: day.date, region: day.region ?? profile.baseRegion } })}
          />
          <Button
            label={d.journey.routes}
            icon="route"
            variant="secondary"
            compact
            onPress={() => router.push({ pathname: '/route', params: { date: day.date } })}
          />
        </Row>
      </View>

      <Section title={d.journey.bookings}>
        {orders.length === 0 ? (
          <AppText variant="body" color="textSecondary">
            {d.journey.noBookings}
          </AppText>
        ) : (
          orders.map((order) => {
            const payment = ledger.payments.find((p) => p.id === order.paymentId);
            const bookings = ledger.bookings.filter((b) => b.orderId === order.id);
            return (
              <Pressable
                key={order.id}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
                accessibilityRole="button"
                style={[styles.order, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.flex}>
                  <AppText variant="heading">{f(d.order.reference, { id: order.id })}</AppText>
                  <AppText variant="caption">
                    {bookings.map((b) => b.title).join(' · ')}
                  </AppText>
                  <Row>
                    <AppText variant="caption" style={{ fontWeight: '700' }}>
                      {money(order.total.amount)}
                    </AppText>
                    {payment && <Badge label={d.paymentStatus[payment.status]} tone={payment.status === 'failed' ? 'danger' : 'success'} />}
                  </Row>
                </View>
                <Icon name="chevronRight" size={16} color={theme.textMuted} />
              </Pressable>
            );
          })
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap', marginTop: -Spacing.sm },
  timeline: { gap: Spacing.sm },
  travel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 70, marginBottom: Spacing.xs },
  itemRow: { flexDirection: 'row', gap: Spacing.md },
  times: { width: 56, alignItems: 'flex-end', paddingTop: Spacing.sm },
  item: { flex: 1, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, gap: Spacing.sm },
  iconButton: { padding: 4 },
  actions: { gap: Spacing.sm },
  order: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cartDot: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartCount: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '700' },
});
