import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { Badge, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { PaymentMethodId } from '@/domain/payments';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useApp } from '@/state/app-store';

/** S18 Wallet: transactions and refunds. Loyalty points arrive in Phase 2. */
export default function WalletScreen() {
  const theme = useTheme();
  const { d, f, money } = useI18n();
  const { ledger } = useApp();
  const payments = [...ledger.payments].reverse();

  return (
    <Screen title={d.wallet.title}>
      {payments.length === 0 ? (
        <EmptyState icon="wallet" title={d.wallet.none} />
      ) : (
        <Section title={d.wallet.payments}>
          {payments.map((payment) => (
            <Pressable
              key={payment.id}
              onPress={() => router.push({ pathname: '/order/[id]', params: { id: payment.orderId } })}
              accessibilityRole="button">
              <Card>
                <Row>
                  <Icon name="wallet" size={18} color={theme.brand} />
                  <AppText variant="heading" style={styles.flex}>
                    {money(payment.gross.amount)}
                  </AppText>
                  <Badge label={d.paymentStatus[payment.status]} tone={payment.status === 'failed' ? 'danger' : 'success'} />
                </Row>
                <AppText variant="caption">
                  {f(d.order.reference, { id: payment.orderId })} · {d.checkout.methods[payment.method as PaymentMethodId] ?? payment.method} ·{' '}
                  {payment.audit[0]?.at.slice(0, 10)}
                </AppText>
                {payment.refunded.amount > 0 && (
                  <AppText variant="caption" style={{ color: theme.success }}>
                    {f(d.order.refunded, { amount: money(payment.refunded.amount) })}
                  </AppText>
                )}
              </Card>
            </Pressable>
          ))}
        </Section>
      )}
      <Notice icon="sparkles">
        <AppText variant="caption">{d.wallet.loyalty}</AppText>
      </Notice>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: Spacing.sm },
});
