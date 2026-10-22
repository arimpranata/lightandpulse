import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/app-text';
import { Badge, Button, Card, EmptyState, Notice, Row, Screen, Section } from '@/components/ui';
import { useI18n } from '@/i18n';
import { api, ApiClientError } from '@/services/backend';
import { usePortal } from '@/state/portal';

type Overview = Awaited<ReturnType<typeof api.adminOverview>>;

/** Admin portal (spec §33: admin approves content): product review, vendor verification, payouts and the audit trail. */
export default function AdminPortal() {
  const { d, f, date, money } = useI18n();
  const { session, run } = usePortal();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const report = useCallback(
    (caught: unknown) => setError(f(d.portal.error, { message: caught instanceof ApiClientError ? caught.message : String(caught) })),
    [d, f],
  );
  const load = useCallback(() => run(api.adminOverview).then(setData, report), [run, report]);
  useEffect(() => {
    load();
  }, [load]);

  const act = (call: (token: string) => Promise<unknown>) => {
    setError(null);
    run(call).then(load, report);
  };

  if (!session || session.user.role !== 'admin') {
    return (
      <Screen title={d.portal.admin}>
        <EmptyState icon="lock" title={d.portal.travellerOnly} />
      </Screen>
    );
  }

  const vendorName = (id: string) => data?.vendors.find((v) => v.id === id)?.name ?? id;

  return (
    <Screen title={d.portal.admin}>
      {error && (
        <Notice icon="alert" tone="danger">
          <AppText variant="body">{error}</AppText>
        </Notice>
      )}
      {data && (
        <AppText variant="caption">
          {f(d.portal.totals, {
            orders: data.totals.orders,
            confirmed: data.totals.confirmed,
            gross: money(data.totals.gross),
            refunded: money(data.totals.refunded),
          })}
        </AppText>
      )}

      <Section title={d.portal.review}>
        {data && data.review.length === 0 && <AppText variant="caption">{d.portal.noReview}</AppText>}
        {data?.review.map((product) => (
          <Card key={product.id}>
            <AppText variant="heading">{product.title}</AppText>
            <AppText variant="caption">
              {vendorName(product.vendorId)} · {money(product.price.amount)} · {product.capacity} · {product.slots.join(', ')}
            </AppText>
            <AppText variant="body">{product.summary}</AppText>
            <Row>
              <Button label={d.portal.approve} compact onPress={() => act((token) => api.reviewExperience(token, product.id, 'approve'))} />
              <Button label={d.portal.reject} variant="danger" compact onPress={() => act((token) => api.reviewExperience(token, product.id, 'reject'))} />
            </Row>
          </Card>
        ))}
      </Section>

      <Section title={d.portal.payouts}>
        {data && data.settlements.length === 0 && <AppText variant="caption">{d.portal.noPayouts}</AppText>}
        {data?.settlements.map((settlement) => (
          <Row key={settlement.id} style={styles.between}>
            <AppText variant="body" style={styles.flex}>
              {vendorName(settlement.supplierId)} · {money(settlement.payable.amount)}
            </AppText>
            {settlement.status === 'eligible' ? (
              <Button label={d.portal.pay} compact onPress={() => act((token) => api.paySettlement(token, settlement.id))} />
            ) : (
              <Badge label={d.settlementStatus[settlement.status]} />
            )}
          </Row>
        ))}
      </Section>

      <Section title={d.portal.vendors}>
        {data?.vendors.map((vendor) => (
          <Card key={vendor.id}>
            <Row style={styles.between}>
              <AppText variant="heading" style={styles.flex}>
                {vendor.name}
              </AppText>
              <Badge
                label={vendor.verificationStatus === 'verified' ? d.common.verified : vendor.verificationStatus === 'pending' ? d.common.verificationPending : d.portal.suspend}
                tone={vendor.verificationStatus === 'verified' ? 'verified' : vendor.verificationStatus === 'pending' ? 'pending' : 'danger'}
              />
            </Row>
            <Row>
              {vendor.verificationStatus !== 'verified' && (
                <Button label={d.portal.verify} compact onPress={() => act((token) => api.setVendorStatus(token, vendor.id, 'verified'))} />
              )}
              {vendor.verificationStatus !== 'suspended' && (
                <Button label={d.portal.suspend} variant="danger" compact onPress={() => act((token) => api.setVendorStatus(token, vendor.id, 'suspended'))} />
              )}
            </Row>
          </Card>
        ))}
      </Section>

      <Section title={d.portal.bookings}>
        {data?.bookings.map((booking) => (
          <Row key={booking.id} style={styles.between}>
            <AppText variant="caption" style={styles.flex}>
              {date(booking.date)} · {booking.title} · {money(booking.amount.amount)}
            </AppText>
            <Badge label={d.order.status[booking.status]} />
          </Row>
        ))}
      </Section>

      <Section title={d.portal.audit}>
        {data?.audit.map((entry) => (
          <AppText key={entry.id} variant="caption">
            {new Date(entry.at).toLocaleString()} · {entry.actorRole} · {entry.action} · {entry.entityId}
          </AppText>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { justifyContent: 'space-between', alignItems: 'center' },
});
