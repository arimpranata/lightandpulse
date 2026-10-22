import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { PaymentEvent } from '@/domain/commerce';
import type { PaymentMethod, PaymentMethodId } from '@/domain/payments';
import type { Currency, Money } from '@/domain/types';

import { ApiError } from './errors';

/**
 * Server-side payment service provider adapter (spec §14). Commerce code only
 * uses this interface; a Midtrans/Xendit/Stripe adapter replaces the demo one
 * without touching order, booking or settlement logic (decision D-007).
 */
export interface PaymentProvider {
  readonly id: string;
  readonly isDemo: boolean;
  paymentOptions(currency: Currency): PaymentMethod[];
  createIntent(input: {
    paymentId: string;
    amount: Money;
    method: PaymentMethodId;
    idempotencyKey: string;
    /** Demo provider only: make this payment fail. Ignored by real providers. */
    simulateFailure?: boolean;
  }): Promise<{ intentId: string }>;
  refund(input: { intentId: string; amount: Money; refundId: string }): Promise<{ status: 'processed' | 'failed' }>;
  /** Verifies a callback's signature and returns the event, or throws INVALID_SIGNATURE. */
  verifyWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): PaymentEvent;
}

export const SIGNATURE_HEADER = 'x-balilens-signature';
const TOLERANCE_SECONDS = 300;

export function sign(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const mac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${mac}`;
}

/** Constant-time check of "t=…,v1=…" with a five-minute replay window. */
export function verifySignature(secret: string, body: string, header: string | undefined, now = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((part) => part.split('=') as [string, string]));
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > TOLERANCE_SECONDS || !parts.v1) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex'));
  const actual = Buffer.from(parts.v1);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * DEMO provider: no money moves and no card data is collected. It behaves like a
 * hosted PSP: create an intent, then deliver a signed webhook to the platform.
 */
export function createDemoProvider(options: {
  secret: string;
  webhookUrl: string;
  delayMs?: number;
  log?: (message: string) => void;
}): PaymentProvider {
  const byKey = new Map<string, string>();

  const deliver = async (event: PaymentEvent, attempt = 1): Promise<void> => {
    const body = JSON.stringify(event);
    try {
      const response = await fetch(options.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', [SIGNATURE_HEADER]: sign(options.secret, body) },
        body,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      // Retries with backoff, as real providers do; the webhook handler is idempotent.
      if (attempt < 4) setTimeout(() => void deliver(event, attempt + 1), 500 * 2 ** attempt);
      else options.log?.(`demo webhook delivery failed: ${String(error)}`);
    }
  };

  return {
    id: 'demo-psp',
    isDemo: true,
    paymentOptions: () =>
      (['card', 'qris', 'bank_transfer', 'ewallet'] as PaymentMethodId[]).map((id) => ({ id, available: true })),
    async createIntent({ paymentId, idempotencyKey, simulateFailure }) {
      const existing = byKey.get(idempotencyKey);
      if (existing) return { intentId: existing };
      const intentId = `pi_demo_${randomUUID()}`;
      byKey.set(idempotencyKey, intentId);
      const type = simulateFailure ? 'payment.failed' : 'payment.succeeded';
      setTimeout(() => void deliver({ id: `evt_${randomUUID()}`, type, paymentId, intentId }), options.delayMs ?? 800);
      return { intentId };
    },
    async refund() {
      return { status: 'processed' };
    },
    verifyWebhook(rawBody, headers) {
      const header = headers[SIGNATURE_HEADER];
      if (!verifySignature(options.secret, rawBody, Array.isArray(header) ? header[0] : header)) {
        throw new ApiError('INVALID_SIGNATURE', 'Webhook signature is missing or invalid.');
      }
      const event = JSON.parse(rawBody) as PaymentEvent;
      if (!event.id || !event.paymentId || !event.intentId || !['payment.authorized', 'payment.succeeded', 'payment.failed'].includes(event.type)) {
        throw new ApiError('VALIDATION_ERROR', 'Unrecognised webhook payload.');
      }
      return event;
    },
  };
}
