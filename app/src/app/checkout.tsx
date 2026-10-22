import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { CulturalNotes } from '@/components/cultural-notice';
import { Icon } from '@/components/icon';
import { Button, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { cartTotal, CheckoutError, lineTotal } from '@/domain/commerce';
import { evaluate } from '@/domain/cultural';
import type { PaymentMethodId } from '@/domain/payments';
import type { CulturalRule } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { lineAvailable } from '@/domain/cart-lines';
import { ApiClientError } from '@/services/backend';
import { useApp, useBooked } from '@/state/app-store';

const newKey = () => `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** S12 Checkout & Payment: billing, payment method, voucher, cultural acknowledgement. */
export default function CheckoutScreen() {
  const theme = useTheme();
  const { d, f, date, money } = useI18n();
  const app = useApp();
  const { cart, inventory, paymentMethods, isDemoPayment } = app;
  const booked = useBooked();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<PaymentMethodId>('qris');
  const [voucher, setVoucher] = useState('');
  const [voucherError, setVoucherError] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One idempotency key per checkout attempt: a double tap cannot create two orders.
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);

  // Contextual etiquette before the booking step (spec §16).
  const rules = useMemo(() => {
    const found = new Map<string, CulturalRule>();
    for (const line of cart.lines) {
      const experience = inventory.experiences.find((e) => e.id === line.itemId);
      const event = inventory.events.find((e) => e.id === line.itemId);
      const target = experience
        ? ({ kind: 'experience', item: experience } as const)
        : event
          ? ({ kind: 'event', item: event } as const)
          : null;
      if (!target) continue;
      for (const rule of evaluate(target, line.date, inventory).requiresAcknowledgement) found.set(rule.id, rule);
    }
    return [...found.values()];
  }, [cart.lines, inventory]);

  const nameValid = name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const ackValid = rules.length === 0 || acknowledged;
  const unavailable = cart.lines.filter((line) => !lineAvailable(line, inventory, booked));

  const checkoutMessage = (caught: unknown) => {
    if (caught instanceof CheckoutError && caught.code === 'cart_expired') return d.cart.expired;
    if (caught instanceof ApiClientError) {
      if (caught.code === 'OFFLINE') return d.checkout.offline;
      if (caught.code === 'BOOKING_UNAVAILABLE') return d.checkout.soldOut;
      if (caught.code === 'CULTURAL_RESTRICTION') return d.checkout.ruleChanged;
    }
    return d.order.failedBody;
  };

  const pay = async () => {
    setSubmitted(true);
    setError(null);
    if (!nameValid || !emailValid || !ackValid || unavailable.length > 0) return;
    setPaying(true);
    try {
      const orderId = await app.checkout({
        traveller: { name: name.trim(), email: email.trim() },
        method,
        idempotencyKey,
        simulateFailure,
        acknowledgedRuleIds: rules.map((rule) => rule.id),
      });
      router.replace({ pathname: '/order/[id]', params: { id: orderId } });
    } catch (caught) {
      setError(checkoutMessage(caught));
      setIdempotencyKey(newKey());
    } finally {
      setPaying(false);
    }
  };

  if (cart.lines.length === 0 && !paying) {
    return (
      <Screen title={d.checkout.title}>
        <EmptyState icon="cart" title={d.cart.empty} action={<Button label={d.cart.title} onPress={() => router.replace('/cart')} />} />
      </Screen>
    );
  }

  return (
    <Screen
      title={d.checkout.title}
      footer={
        <>
          {isDemoPayment && (
            <AppText variant="caption" style={[styles.center, { color: theme.textMuted }]}>
              {d.checkout.demoPayment}
            </AppText>
          )}
          <Button
            label={paying ? d.checkout.paying : f(d.checkout.pay, { amount: money(cartTotal(cart).amount) })}
            icon="shield"
            loading={paying}
            onPress={pay}
          />
        </>
      }>
      <Section title={d.checkout.summary}>
        <Card>
          {cart.lines.map((line) => (
            <Row key={line.id} style={styles.between}>
              <View style={styles.flex}>
                <AppText variant="body" numberOfLines={1}>
                  {line.title}
                </AppText>
                <AppText variant="caption">
                  {date(line.date)} · {line.time}
                </AppText>
              </View>
              <AppText variant="heading">{money(lineTotal(line).amount)}</AppText>
            </Row>
          ))}
        </Card>
        {unavailable.length > 0 && (
          <Notice icon="alert" tone="warning">
            <AppText variant="caption">{f(d.checkout.unavailable, { items: unavailable.map((l) => l.title).join(', ') })}</AppText>
          </Notice>
        )}
      </Section>

      <Section title={d.checkout.traveller}>
        <View style={styles.field}>
          <AppText variant="label" color="textSecondary">
            {d.checkout.name}
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            autoComplete="name"
            accessibilityLabel={d.checkout.name}
            style={[styles.input, { color: theme.text, borderColor: submitted && !nameValid ? theme.danger : theme.border }]}
          />
          {submitted && !nameValid && <AppText variant="caption" style={{ color: theme.danger }}>{d.checkout.nameRequired}</AppText>}
        </View>
        <View style={styles.field}>
          <AppText variant="label" color="textSecondary">
            {d.checkout.email}
          </AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel={d.checkout.email}
            style={[styles.input, { color: theme.text, borderColor: submitted && !emailValid ? theme.danger : theme.border }]}
          />
          {submitted && !emailValid && <AppText variant="caption" style={{ color: theme.danger }}>{d.checkout.emailInvalid}</AppText>}
        </View>
      </Section>

      <Section title={d.checkout.method}>
        <Row>
          {paymentMethods
            .filter((option) => option.available)
            .map((option) => (
              <Chip key={option.id} label={d.checkout.methods[option.id]} selected={method === option.id} onPress={() => setMethod(option.id)} />
            ))}
        </Row>
        <View style={styles.voucher}>
          <TextInput
            value={voucher}
            onChangeText={(text) => {
              setVoucher(text);
              setVoucherError(false);
            }}
            placeholder={d.checkout.voucher}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="characters"
            accessibilityLabel={d.checkout.voucher}
            style={[styles.input, styles.flex, { color: theme.text, borderColor: voucherError ? theme.danger : theme.border }]}
          />
          <Button label={d.checkout.apply} variant="secondary" compact disabled={!voucher.trim()} onPress={() => setVoucherError(true)} />
        </View>
        {voucherError && <AppText variant="caption" style={{ color: theme.danger }}>{d.checkout.voucherInvalid}</AppText>}
      </Section>

      {rules.length > 0 && (
        <Section title={d.checkout.culture}>
          <AppText variant="caption">{d.checkout.cultureBody}</AppText>
          <CulturalNotes rules={rules} />
          <Pressable
            onPress={() => setAcknowledged(!acknowledged)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
            style={styles.ack}>
            <View style={[styles.box, { borderColor: submitted && !ackValid ? theme.danger : theme.primary, backgroundColor: acknowledged ? theme.primary : 'transparent' }]}>
              {acknowledged && <Icon name="check" size={14} color={theme.primaryText} />}
            </View>
            <AppText variant="body" style={styles.flex}>
              {d.checkout.acknowledge}
            </AppText>
          </Pressable>
          {submitted && !ackValid && <AppText variant="caption" style={{ color: theme.danger }}>{d.checkout.ackRequired}</AppText>}
        </Section>
      )}

      {isDemoPayment && (
        <Row style={styles.between}>
          <AppText variant="caption" style={styles.flex}>
            {d.checkout.simulateFailure}
          </AppText>
          <Switch value={simulateFailure} onValueChange={setSimulateFailure} accessibilityLabel={d.checkout.simulateFailure} />
        </Row>
      )}

      {error && (
        <Notice icon="alert" tone="danger">
          <AppText variant="caption">{error}</AppText>
        </Notice>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  between: { justifyContent: 'space-between' },
  field: { gap: Spacing.xs },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 46, fontSize: 16 },
  voucher: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ack: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
