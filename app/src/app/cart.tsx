import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Stepper } from '@/components/controls';
import { Icon, type IconName } from '@/components/icon';
import { Badge, Button, Card, EmptyState, Notice, Row, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { cartTotal, isCartExpired, lineTotal } from '@/domain/commerce';
import type { CartLine } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp, useBooked } from '@/state/app-store';
import { lineAvailable } from '@/state/cart-lines';

const LINE_ICON: Record<CartLine['itemType'], IconName> = {
  experience: 'sparkles',
  event_ticket: 'ticket',
  guide: 'person',
  driver: 'car',
};

/** S11 Booking Cart: multi-vendor items, date/time, participants, policies (spec §13). */
export default function CartScreen() {
  const theme = useTheme();
  const { d, f, date, money } = useI18n();
  const app = useApp();
  const { cart, inventory } = app;
  const booked = useBooked();
  const expired = cart.status === 'active' && isCartExpired(cart);
  const lines = cart.status === 'active' ? cart.lines : [];
  const unavailable = lines.filter((line) => !lineAvailable(line, inventory, booked));

  return (
    <Screen
      title={d.cart.title}
      footer={
        lines.length > 0 &&
        !expired && (
          <>
            <Row style={styles.between}>
              <AppText variant="heading">{d.cart.total}</AppText>
              <AppText variant="title">{money(cartTotal(cart).amount)}</AppText>
            </Row>
            <Button
              label={d.cart.checkout}
              icon="wallet"
              disabled={unavailable.length > 0}
              onPress={() => router.push('/checkout')}
            />
          </>
        )
      }>
      <AppText variant="caption" style={{ color: theme.textMuted }}>
        {d.common.demoBanner}
      </AppText>

      {expired ? (
        <EmptyState
          icon="clock"
          title={d.cart.expired}
          action={<Button label={d.cart.newCart} onPress={() => app.startNewCart()} />}
        />
      ) : lines.length === 0 ? (
        <EmptyState
          icon="cart"
          title={d.cart.empty}
          body={d.cart.emptyBody}
          action={<Button label={d.tabs.explore} icon="explore" onPress={() => router.navigate('/explore')} />}
        />
      ) : (
        <>
          <AppText variant="caption">{f(d.cart.heldUntil, { time: new Date(cart.expiresAt).toTimeString().slice(0, 5) })}</AppText>
          {unavailable.length > 0 && (
            <Notice icon="alert" tone="warning">
              <AppText variant="caption">{f(d.checkout.unavailable, { items: unavailable.map((l) => l.title).join(', ') })}</AppText>
            </Notice>
          )}
          <View style={styles.list}>
            {lines.map((line) => {
              const available = !unavailable.includes(line);
              const supplier = inventory.vendors.find((v) => v.id === line.supplierId);
              return (
                <Card key={line.id} style={!available && { borderColor: theme.warning }}>
                  <Row>
                    <Icon name={LINE_ICON[line.itemType]} size={18} color={theme.brand} />
                    <AppText variant="label" color="textSecondary" style={styles.flex}>
                      {d.cart.lineTypes[line.itemType]}
                    </AppText>
                    <Badge label={d.common.demo} tone="demo" />
                  </Row>
                  <AppText variant="heading">{line.title}</AppText>
                  <AppText variant="caption">
                    {date(line.date)} · {line.time}
                    {supplier ? ` · ${supplier.name}` : ''}
                  </AppText>
                  {line.pricing === 'person' ? (
                    <Stepper
                      label={d.detail.participants}
                      value={line.participants}
                      min={1}
                      onChange={(value) => app.setParticipants(line.id, value)}
                    />
                  ) : null}
                  <Row style={styles.between}>
                    <AppText variant="caption">{f(d.cart.policy, { hours: line.cancellationPolicy.freeCancellationHours })}</AppText>
                    <AppText variant="heading">{money(lineTotal(line).amount)}</AppText>
                  </Row>
                  {!available && (
                    <AppText variant="caption" style={{ color: theme.warning }}>
                      {d.cart.unavailableLine}
                    </AppText>
                  )}
                  <Button label={d.common.remove} icon="trash" variant="ghost" compact onPress={() => app.removeFromCart(line.id)} style={styles.remove} />
                </Card>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: Spacing.sm },
  between: { justifyContent: 'space-between' },
  remove: { alignSelf: 'flex-start' },
});
