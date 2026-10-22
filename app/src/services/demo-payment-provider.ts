import type { PaymentEvent } from '@/domain/commerce';
import type { PaymentMethodId, PaymentProvider } from '@/domain/payments';

export type DemoPaymentProvider = PaymentProvider & {
  /** Makes the next result a failure, to exercise the failure path. */
  simulateNextFailure(fail: boolean): void;
};

/**
 * DEMO payment provider. No money moves and no card data is collected; it only
 * produces the callback events a real provider would send, so the payment and
 * booking state machines can be exercised end to end.
 */
export function createDemoPaymentProvider(): DemoPaymentProvider {
  let failNext = false;
  const byKey = new Map<string, string>();
  let counter = 0;

  return {
    id: 'demo-psp',
    isDemo: true,
    simulateNextFailure(fail) {
      failNext = fail;
    },
    paymentOptions: () =>
      (['card', 'qris', 'bank_transfer', 'ewallet'] as PaymentMethodId[]).map((id) => ({ id, available: true })),
    async createIntent({ idempotencyKey }) {
      // Same key, same intent: a retried request never starts a second payment.
      const existing = byKey.get(idempotencyKey);
      if (existing) return { intentId: existing };
      counter += 1;
      const intentId = `pi_demo_${Date.now().toString(36)}_${counter}`;
      byKey.set(idempotencyKey, intentId);
      return { intentId };
    },
    async awaitResult(intentId, paymentId): Promise<PaymentEvent> {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const failed = failNext;
      failNext = false;
      return {
        id: `evt_${intentId}_${failed ? 'failed' : 'succeeded'}`,
        type: failed ? 'payment.failed' : 'payment.succeeded',
        paymentId,
        intentId,
      };
    },
  };
}
