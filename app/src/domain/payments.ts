import type { PaymentEvent } from './commerce';
import type { Currency, Money } from './types';

export type PaymentMethodId = 'card' | 'qris' | 'bank_transfer' | 'ewallet';

export type PaymentMethod = { id: PaymentMethodId; available: boolean };

/**
 * Payment service provider (PSP) adapter (spec §14). Commerce logic only talks
 * to this interface, so a real provider can replace the demo one without
 * touching cart, order or booking code. Card details never reach the app:
 * real providers collect them in their own tokenized UI.
 */
export interface PaymentProvider {
  readonly id: string;
  readonly isDemo: boolean;
  /** get_payment_options (spec §24). */
  paymentOptions(currency: Currency): PaymentMethod[];
  /** create_payment (spec §24): starts a payment and returns the provider's intent ID. */
  createIntent(input: {
    paymentId: string;
    amount: Money;
    method: PaymentMethodId;
    idempotencyKey: string;
  }): Promise<{ intentId: string }>;
  /** Waits for the provider's result as a callback event. */
  awaitResult(intentId: string, paymentId: string): Promise<PaymentEvent>;
}
