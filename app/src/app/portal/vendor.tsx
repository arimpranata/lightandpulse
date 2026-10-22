import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Field } from '@/components/field';
import { Badge, Button, Card, EmptyState, Notice, Row, Screen, Section, type BadgeTone } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { api, ApiClientError, type PortalExperience, type ProductEdit } from '@/services/backend';
import { usePortal } from '@/state/portal';

type Overview = Awaited<ReturnType<typeof api.vendorOverview>>;

const STATUS_TONE: Record<PortalExperience['status'], BadgeTone> = {
  draft: 'neutral',
  submitted: 'pending',
  published: 'success',
  rejected: 'danger',
};

function ProductForm({ product, onSubmit, onCancel }: { product: PortalExperience; onSubmit: (edit: ProductEdit) => Promise<void>; onCancel: () => void }) {
  const { d } = useI18n();
  const [form, setForm] = useState({
    title: product.title,
    summary: product.summary,
    price: String(product.price.amount),
    capacity: String(product.capacity),
    slots: product.slots.join(', '),
    durationMin: String(product.durationMin),
    meetingPoint: product.meetingPoint,
    freeCancellationHours: String(product.cancellationPolicy.freeCancellationHours),
  });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        summary: form.summary.trim(),
        price: Math.round(Number(form.price)),
        capacity: Math.round(Number(form.capacity)),
        slots: form.slots.split(',').map((slot) => slot.trim()).filter(Boolean),
        durationMin: Math.round(Number(form.durationMin)),
        meetingPoint: form.meetingPoint.trim(),
        freeCancellationHours: Math.round(Number(form.freeCancellationHours)),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Field label={d.portal.title_} value={form.title} onChangeText={set('title')} />
      <Field label={d.portal.summary} value={form.summary} onChangeText={set('summary')} multiline />
      <Field label={d.portal.price} value={form.price} onChangeText={set('price')} keyboardType="number-pad" />
      <Field label={d.portal.capacity} value={form.capacity} onChangeText={set('capacity')} keyboardType="number-pad" />
      <Field label={d.portal.slots} value={form.slots} onChangeText={set('slots')} />
      <Field label={d.portal.duration} value={form.durationMin} onChangeText={set('durationMin')} keyboardType="number-pad" />
      <Field label={d.portal.meetingPoint} value={form.meetingPoint} onChangeText={set('meetingPoint')} />
      <Field label={d.portal.freeCancellation} value={form.freeCancellationHours} onChangeText={set('freeCancellationHours')} keyboardType="number-pad" />
      <AppText variant="caption">{d.portal.reviewNote}</AppText>
      <Row>
        <Button label={d.portal.save} compact loading={busy} onPress={submit} />
        <Button label={d.portal.cancel} variant="secondary" compact onPress={onCancel} />
      </Row>
    </View>
  );
}

/** Vendor portal (spec §18): products, bookings, completion and payouts for this vendor only. */
export default function VendorPortal() {
  const { d, f, date, money } = useI18n();
  const { session, run } = usePortal();
  const [data, setData] = useState<Overview | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const report = useCallback(
    (caught: unknown) => setError(f(d.portal.error, { message: caught instanceof ApiClientError ? caught.message : String(caught) })),
    [d, f],
  );
  const load = useCallback(() => run(api.vendorOverview).then(setData, report), [run, report]);
  useEffect(() => {
    load();
  }, [load]);

  const act = (call: (token: string) => Promise<unknown>) => {
    setError(null);
    return run(call).then(load, (caught) => {
      report(caught);
      throw caught;
    });
  };

  if (!session || session.user.role !== 'vendor') {
    return (
      <Screen title={d.portal.vendor}>
        <EmptyState icon="lock" title={d.portal.travellerOnly} />
      </Screen>
    );
  }

  return (
    <Screen title={data?.vendor?.name ?? d.portal.vendor}>
      {error && (
        <Notice icon="alert" tone="danger">
          <AppText variant="body">{error}</AppText>
        </Notice>
      )}
      {data?.vendor?.demo && <Badge label={d.common.demo} tone="demo" />}

      <Section title={d.portal.products}>
        {data?.experiences.map((product) => (
          <Card key={product.id}>
            <Row style={styles.between}>
              <AppText variant="heading" style={styles.flex}>
                {product.title}
              </AppText>
              <Badge label={d.portal.productStatus[product.status]} tone={STATUS_TONE[product.status]} />
            </Row>
            <AppText variant="caption">
              {money(product.price.amount)} · {product.capacity} · {product.slots.join(', ')}
            </AppText>
            {product.reviewNote && <AppText variant="caption">{product.reviewNote}</AppText>}
            {editing === product.id ? (
              <ProductForm
                product={product}
                onCancel={() => setEditing(null)}
                onSubmit={(edit) => act((token) => api.editExperience(token, product.id, edit)).then(() => setEditing(null), () => {})}
              />
            ) : (
              <Button label={d.portal.edit} variant="ghost" compact onPress={() => setEditing(product.id)} style={styles.left} />
            )}
          </Card>
        ))}
      </Section>

      <Section title={d.portal.bookings}>
        {data && data.bookings.length === 0 && <AppText variant="caption">{d.portal.noBookings}</AppText>}
        {data?.bookings.map((booking) => (
          <Card key={booking.id}>
            <Row style={styles.between}>
              <AppText variant="heading" style={styles.flex}>
                {booking.title}
              </AppText>
              <Badge label={d.order.status[booking.status]} tone={booking.status === 'confirmed' ? 'success' : 'neutral'} />
            </Row>
            <AppText variant="caption">
              {date(booking.date)} · {booking.time} · {booking.participants} · {money(booking.amount.amount)} · {booking.passCode}
            </AppText>
            {booking.status === 'confirmed' && (
              <Row>
                <Button label={d.portal.complete} compact onPress={() => act((token) => api.closeBooking(token, booking.id, 'complete')).catch(() => {})} />
                <Button label={d.portal.noShow} variant="secondary" compact onPress={() => act((token) => api.closeBooking(token, booking.id, 'no-show')).catch(() => {})} />
              </Row>
            )}
          </Card>
        ))}
      </Section>

      <Section title={d.portal.settlements}>
        {data?.settlements.map((settlement) => (
          <Row key={settlement.id} style={styles.between}>
            <AppText variant="body">{money(settlement.payable.amount)}</AppText>
            <Badge label={d.settlementStatus[settlement.status]} tone={settlement.status === 'paid' ? 'success' : 'neutral'} />
          </Row>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { justifyContent: 'space-between' },
  left: { alignSelf: 'flex-start' },
  form: { gap: Spacing.md },
});
