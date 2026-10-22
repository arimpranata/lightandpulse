import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Badge, Button, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { cancellationQuote } from '@/domain/commerce';
import type { PaymentMethodId } from '@/domain/payments';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

/** Booking confirmation with passes, partial cancellation and the demo ledger. */
export default function OrderScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, f, date, money } = useI18n();
  const app = useApp();
  const { ledger, inventory } = app;
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [showLedger, setShowLedger] = useState(false);

  const order = ledger.orders.find((o) => o.id === id);
  const payment = order && ledger.payments.find((p) => p.id === order.paymentId);
  if (!order || !payment) {
    return (
      <Screen>
        <EmptyState icon="ticket" title={d.explore.empty} />
      </Screen>
    );
  }
  const bookings = ledger.bookings.filter((b) => b.orderId === order.id);
  const refunds = ledger.refunds.filter((r) => r.orderId === order.id);
  const waiting = payment.status === 'pending' || payment.status === 'authorized';
  const failed = payment.status === 'failed';
  const supplierName = (supplierId: string) => inventory.vendors.find((v) => v.id === supplierId)?.name ?? supplierId;

  return (
    <Screen
      title={waiting ? d.order.pending : failed ? d.order.failed : d.order.confirmed}
      footer={
        failed ? (
          <Button label={d.cart.title} icon="cart" onPress={() => router.replace('/cart')} />
        ) : (
          <Button label={d.order.viewJourney} icon="timeline" onPress={() => router.navigate('/journey')} />
        )
      }>
      <Card>
        <Row>
          {waiting ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Icon name={failed ? 'alert' : 'checkCircle'} size={22} color={failed ? theme.danger : theme.success} />
          )}
          <AppText variant="heading" style={styles.flex}>
            {f(d.order.reference, { id: order.id })}
          </AppText>
        </Row>
        <AppText variant="caption">
          {f(d.order.paidWith, { method: d.checkout.methods[payment.method as PaymentMethodId] ?? payment.method })} ·{' '}
          {f(d.order.paymentStatus, { status: d.paymentStatus[payment.status] })}
        </AppText>
        <AppText variant="title">{money(order.total.amount)}</AppText>
      </Card>

      {failed && (
        <Notice icon="alert" tone="danger">
          <AppText variant="caption">{d.order.failedBody}</AppText>
        </Notice>
      )}

      <Section title={d.order.passes}>
        {bookings.map((booking) => {
          const quote = cancellationQuote(booking);
          const live = booking.status === 'confirmed';
          return (
            <Card key={booking.id}>
              <Row>
                <AppText variant="heading" style={styles.flex}>
                  {booking.title}
                </AppText>
                <Badge
                  label={d.order.status[booking.status]}
                  tone={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : 'pending'}
                />
              </Row>
              <AppText variant="caption">
                {date(booking.date)} · {booking.time} · {supplierName(booking.supplierId)}
              </AppText>
              {live && (
                <View style={[styles.pass, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                  <AppText variant="label" color="textSecondary">
                    {d.order.passHint}
                  </AppText>
                  <AppText variant="display" style={styles.code} selectable>
                    {booking.passCode}
                  </AppText>
                </View>
              )}
              {live && (booking.itemType === 'guide' || booking.itemType === 'driver') && (
                <AppText variant="caption">{d.order.contact}</AppText>
              )}
              {live &&
                (cancelling === booking.id ? (
                  <Notice icon="alert" tone="warning">
                    <AppText variant="heading">{f(d.order.cancelTitle, { title: booking.title })}</AppText>
                    <AppText variant="caption">
                      {quote.refundable
                        ? f(d.order.refundFull, { amount: money(quote.refund.amount) })
                        : f(d.order.noRefund, { hours: booking.cancellationPolicy.freeCancellationHours })}
                    </AppText>
                    <Row>
                      <Button
                        label={d.common.confirm}
                        variant="danger"
                        compact
                        onPress={() => {
                          app.cancelBooking(booking.id);
                          setCancelling(null);
                        }}
                      />
                      <Button label={d.order.keep} variant="secondary" compact onPress={() => setCancelling(null)} />
                    </Row>
                  </Notice>
                ) : (
                  <Button label={d.order.cancel} variant="ghost" compact onPress={() => setCancelling(booking.id)} style={styles.left} />
                ))}
            </Card>
          );
        })}
      </Section>

      {refunds.length > 0 && (
        <Section title={d.wallet.refunds}>
          {refunds.map((refund) => (
            <AppText key={refund.id} variant="body">
              {f(d.order.refunded, { amount: money(refund.amount.amount) })} · {bookings.find((b) => b.id === refund.bookingId)?.title}
            </AppText>
          ))}
        </Section>
      )}

      <Section
        title={d.order.ledger}
        action={<Button label={showLedger ? d.common.close : '…'} variant="ghost" compact onPress={() => setShowLedger(!showLedger)} />}>
        {showLedger && (
          <Card>
            <Row style={styles.between}>
              <AppText variant="body">{d.order.gross}</AppText>
              <AppText variant="heading">{money(payment.gross.amount)}</AppText>
            </Row>
            <Row style={styles.between}>
              <AppText variant="body">{d.order.platformFee}</AppText>
              <AppText variant="body">{money(payment.platformFee.amount)}</AppText>
            </Row>
            <Row style={styles.between}>
              <AppText variant="body">{d.order.processingFee}</AppText>
              <AppText variant="body">{money(payment.processingFee.amount)}</AppText>
            </Row>
            {ledger.settlements
              .filter((s) => s.orderId === order.id)
              .map((settlement) => (
                <Row key={settlement.id} style={styles.between}>
                  <View style={styles.flex}>
                    <AppText variant="body">{f(d.order.payable, { supplier: supplierName(settlement.supplierId) })}</AppText>
                    <AppText variant="caption">{f(d.order.settlement, { status: d.settlementStatus[settlement.status] })}</AppText>
                  </View>
                  <AppText variant="body">{money(settlement.payable.amount)}</AppText>
                </Row>
              ))}
            <AppText variant="caption" style={{ color: theme.textMuted }}>
              {d.order.feesNote}
            </AppText>
            {payment.audit.map((event) => (
              <AppText key={event.at + event.action} variant="caption" style={{ color: theme.textMuted }}>
                {event.at.slice(11, 19)} · {event.actor} · {event.action}
                {event.from ? ` (${event.from} → ${event.to})` : ''}
              </AppText>
            ))}
          </Card>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { justifyContent: 'space-between' },
  left: { alignSelf: 'flex-start' },
  pass: { borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: Spacing.xs },
  code: { letterSpacing: 4, fontVariant: ['tabular-nums'] },
});
