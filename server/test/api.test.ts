// Integration tests against a real PostgreSQL database (TEST_DATABASE_URL).
// The schema is dropped and rebuilt, so never point this at a database you need.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { addDays, todayIso, weekday } from '@/domain/time';

import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createPool, migrate, type Db } from '../src/db';
import { createDemoProvider, sign, SIGNATURE_HEADER } from '../src/payments';
import { DEMO_VENDOR_EMAIL, seed } from '../src/seed';

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://balilens:devpass@127.0.0.1/balilens_test';
const ADMIN = { email: 'admin@test.local', password: 'admin-password-123' };
const VENDOR_PASSWORD = 'vendor-password-123';

let app: FastifyInstance;
let db: Db;
let base: string;
let webhookSecret: string;

// A date two weeks out, so free-cancellation windows are open.
const DATE = addDays(todayIso(), 14);

type Json = Record<string, any>;

async function call(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: (await response.json()) as Json };
}

async function guest(): Promise<string> {
  return (await call('POST', '/auth/guest')).body.token;
}

async function login(email: string, password: string): Promise<string> {
  const { status, body } = await call('POST', '/auth/login', { body: { email, password } });
  assert.equal(status, 200, JSON.stringify(body));
  return body.token;
}

let keySequence = 0;
function checkout(lines: Json[], extra: Json = {}) {
  keySequence += 1;
  return {
    idempotencyKey: `test-key-${Date.now()}-${keySequence}`,
    traveller: { name: 'Test Traveller', email: 'traveller@test.local' },
    method: 'card',
    lines,
    ...extra,
  };
}

const batik = (participants: number, time = '09:00') => ({ itemType: 'experience', itemId: 'exp-batik-ubud', date: DATE, time, participants });

async function waitFor<T>(read: () => Promise<T>, done: (value: T) => boolean, timeoutMs = 8000): Promise<T> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value) || Date.now() > until) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function ledgerOf(token: string) {
  return (await call('GET', '/me/orders', { token })).body.ledger;
}

async function paymentFor(token: string, orderId: string) {
  return waitFor(
    async () => (await ledgerOf(token)).payments.find((p: Json) => p.orderId === orderId),
    (p) => p && p.status !== 'pending',
  );
}

before(async () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL,
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    DEMO_VENDOR_PASSWORD: VENDOR_PASSWORD,
    AUTH_RATE_LIMIT: '1000',
  });
  webhookSecret = config.pspWebhookSecret;
  db = createPool(DATABASE_URL);
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(db, () => {});
  await seed(db, config, () => {});
  const providerOptions = { secret: webhookSecret, webhookUrl: '', delayMs: 50 };
  app = await buildApp({ config, db, payments: createDemoProvider(providerOptions), logger: false });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  providerOptions.webhookUrl = `${base}/payments/webhook`;
});

after(async () => {
  // Let in-flight demo webhooks land before closing.
  await new Promise((resolve) => setTimeout(resolve, 300));
  await app.close();
  await db.end();
});

describe('public API', () => {
  it('serves content and marketplace inventory', async () => {
    const content = await call('GET', '/content');
    assert.equal(content.status, 200);
    assert.ok(content.body.places.length > 10);
    const inventory = await call('GET', '/inventory');
    assert.ok(inventory.body.marketplace.experiences.some((e: Json) => e.id === 'exp-batik-ubud' && e.demo === true));
    assert.equal(inventory.body.demoPayments, true);
  });

  it('validates the availability range', async () => {
    assert.equal((await call('GET', `/availability?from=${DATE}&to=${addDays(DATE, 90)}`)).status, 400);
    assert.equal((await call('GET', `/availability?from=${DATE}&to=${DATE}`)).status, 200);
  });
});

describe('checkout', () => {
  it('prices lines from the database, never from the client', async () => {
    const token = await guest();
    const line = { ...batik(2), unitPrice: { amount: 1, currency: 'IDR' } };
    const { status, body } = await call('POST', '/orders', { token, body: checkout([line]) });
    assert.equal(status, 201, JSON.stringify(body));
    const ledger = await ledgerOf(token);
    assert.equal(ledger.orders[0].total.amount, 700_000);
  });

  it('returns the same order for a repeated idempotency key, even concurrently', async () => {
    const token = await guest();
    const request = checkout([batik(1, '14:00')]);
    const results = await Promise.all(Array.from({ length: 5 }, () => call('POST', '/orders', { token, body: request })));
    const ids = new Set(results.map((r) => r.body.orderId));
    assert.equal(ids.size, 1);
    const count = await db.query('SELECT count(*)::int AS n FROM orders WHERE idempotency_key = $1', [request.idempotencyKey]);
    assert.equal(count.rows[0].n, 1);
  });

  it('never overbooks a slot under concurrent checkouts', async () => {
    // Capacity is 8. Earlier tests hold 2 seats at 09:00, so 6 remain: 3 of 6 parties of 2 fit.
    const tokens = await Promise.all(Array.from({ length: 6 }, guest));
    const results = await Promise.all(tokens.map((token) => call('POST', '/orders', { token, body: checkout([batik(2)]) })));
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 201, 409, 409, 409]);
    assert.ok(results.filter((r) => r.status === 409).every((r) => r.body.error.code === 'BOOKING_UNAVAILABLE'));
    const held = await db.query(
      `SELECT sum(participants)::int AS seats FROM bookings WHERE item_id = 'exp-batik-ubud' AND service_date = $1 AND service_time = '09:00' AND status IN ('pending', 'confirmed')`,
      [DATE],
    );
    assert.equal(held.rows[0].seats, 8);
  });

  it('blocks items with a PROHIBITED cultural rule', async () => {
    const token = await guest();
    const line = { itemType: 'experience', itemId: 'exp-village-ceremony', date: DATE, time: '15:00', participants: 1 };
    const { status, body } = await call('POST', '/orders', { token, body: checkout([line]) });
    assert.equal(status, 422);
    assert.equal(body.error.code, 'CULTURAL_RESTRICTION');
  });

  it('requires acknowledgement of RESTRICTED rules', async () => {
    const token = await guest();
    const line = { itemType: 'experience', itemId: 'exp-batur-sunrise', date: DATE, time: '03:30', participants: 1 };
    const inventory = (await call('GET', '/inventory')).body.marketplace;
    line.time = inventory.experiences.find((e: Json) => e.id === 'exp-batur-sunrise').slots[0];
    const refused = await call('POST', '/orders', { token, body: checkout([line]) });
    assert.equal(refused.status, 422);
    assert.ok(refused.body.error.details.ruleIds.includes('cr-batur-guide'));
    const accepted = await call('POST', '/orders', { token, body: checkout([line], { acknowledgedRuleIds: refused.body.error.details.ruleIds }) });
    assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
  });

  it('books one guide per day', async () => {
    const inventory = (await call('GET', '/inventory')).body.marketplace;
    const guide = inventory.guides.find((g: Json) => g.verified && !g.daysOff.includes(weekday(DATE)));
    const line = { itemType: 'guide', itemId: guide.id, date: DATE, participants: 2 };
    const first = await call('POST', '/orders', { token: await guest(), body: checkout([line]) });
    const second = await call('POST', '/orders', { token: await guest(), body: checkout([line]) });
    assert.equal(first.status, 201);
    assert.equal(second.status, 409);
  });
});

describe('payments', () => {
  it('confirms bookings when the signed webhook arrives', async () => {
    const token = await guest();
    const { body } = await call('POST', '/orders', { token, body: checkout([batik(1, '14:00')]) });
    const payment = await paymentFor(token, body.orderId);
    assert.equal(payment.status, 'paid');
    assert.ok(payment.audit.some((a: Json) => a.action === 'payment.succeeded' && a.actor === 'psp'));
    const ledger = await ledgerOf(token);
    assert.ok(ledger.bookings.filter((b: Json) => b.orderId === body.orderId).every((b: Json) => b.status === 'confirmed'));
    assert.deepEqual(ledger.settlements, [], 'settlements are not shown to travellers');
  });

  it('rejects unsigned or tampered webhooks', async () => {
    const event = { id: 'evt_forged', type: 'payment.succeeded', paymentId: 'PAY-X', intentId: 'pi_x' };
    const body = JSON.stringify(event);
    const unsigned = await fetch(`${base}/payments/webhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    assert.equal(unsigned.status, 401);
    const tampered = await fetch(`${base}/payments/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SIGNATURE_HEADER]: sign(webhookSecret, body.replace('X', 'Y')) },
      body,
    });
    assert.equal(tampered.status, 401);
    const stale = await fetch(`${base}/payments/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SIGNATURE_HEADER]: sign(webhookSecret, body, Math.floor(Date.now() / 1000) - 3600) },
      body,
    });
    assert.equal(stale.status, 401);
  });

  it('treats a replayed webhook as a no-op', async () => {
    const token = await guest();
    const { body } = await call('POST', '/orders', { token, body: checkout([batik(1, '14:00')]) });
    await paymentFor(token, body.orderId);
    const stored = (await db.query(`SELECT e.payload FROM payment_events e JOIN payments p ON p.id = e.payment_id WHERE p.order_id = $1`, [body.orderId])).rows[0].payload;
    const raw = JSON.stringify(stored);
    const replay = await fetch(`${base}/payments/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SIGNATURE_HEADER]: sign(webhookSecret, raw) },
      body: raw,
    });
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), { result: 'duplicate' });
    const audits = await db.query(`SELECT count(*)::int AS n FROM audit_log WHERE action = 'payment.succeeded' AND entity_id = $1`, [stored.paymentId]);
    assert.equal(audits.rows[0].n, 1);
  });

  it('releases seats when a payment fails', async () => {
    const token = await guest();
    const { body } = await call('POST', '/orders', { token, body: checkout([batik(3, '14:00')], { simulateFailure: true }) });
    const payment = await paymentFor(token, body.orderId);
    assert.equal(payment.status, 'failed');
    const bookings = (await ledgerOf(token)).bookings;
    assert.ok(bookings.every((b: Json) => b.status === 'cancelled'));
  });

  it('cancels one booking with a refund under its own policy', async () => {
    const token = await guest();
    const inventory = (await call('GET', '/inventory')).body.marketplace;
    const driver = inventory.drivers.find((d: Json) => d.verified && !d.daysOff.includes(weekday(DATE)) && d.vehicle.seats >= 2);
    const { body } = await call('POST', '/orders', {
      token,
      body: checkout([batik(1, '14:00'), { itemType: 'driver', itemId: driver.id, date: DATE, participants: 2 }]),
    });
    await paymentFor(token, body.orderId);
    const ledger = await ledgerOf(token);
    const booking = ledger.bookings.find((b: Json) => b.orderId === body.orderId && b.itemType === 'driver');
    const cancelled = await call('POST', `/bookings/${booking.id}/cancel`, { token });
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.equal(cancelled.body.refund.amount.amount, booking.amount.amount);
    const afterCancel = await ledgerOf(token);
    assert.equal(afterCancel.payments.find((p: Json) => p.orderId === body.orderId).status, 'partially_refunded');
    const settlement = await db.query('SELECT status FROM settlements WHERE booking_id = $1', [booking.id]);
    assert.equal(settlement.rows[0].status, 'reversed');
    const again = await call('POST', `/bookings/${booking.id}/cancel`, { token });
    assert.equal(again.status, 409);
    const someoneElse = await call('POST', `/bookings/${booking.id}/cancel`, { token: await guest() });
    assert.equal(someoneElse.status, 404);
  });
});

describe('accounts and access control', () => {
  it('upgrades a guest to a registered traveller and keeps their orders', async () => {
    const token = await guest();
    await call('POST', '/orders', { token, body: checkout([batik(1, '14:00')]) });
    const registered = await call('POST', '/auth/register', { token, body: { email: 'Ayu@Test.local', password: 'a-long-password', name: 'Ayu' } });
    assert.equal(registered.status, 200, JSON.stringify(registered.body));
    const signedIn = await login('ayu@test.local', 'a-long-password');
    assert.equal((await ledgerOf(signedIn)).orders.length, 1);
    assert.equal((await call('POST', '/auth/register', { body: { email: 'ayu@test.local', password: 'another-password', name: 'Xa' } })).status, 409);
    assert.equal((await call('POST', '/auth/login', { body: { email: 'ayu@test.local', password: 'wrong-password' } })).status, 401);
    const refreshed = await call('POST', '/auth/refresh', { token: signedIn });
    assert.equal(refreshed.body.user.email, 'ayu@test.local');
    assert.equal((await call('POST', '/auth/refresh', { token: 'not-a-token' })).status, 401);
  });

  it('enforces roles', async () => {
    const traveller = await guest();
    assert.equal((await call('GET', '/admin/overview')).status, 401);
    assert.equal((await call('GET', '/admin/overview', { token: traveller })).status, 403);
    assert.equal((await call('GET', '/vendor/overview', { token: traveller })).status, 403);
    assert.equal((await call('GET', '/cultural/rules', { token: traveller })).status, 403);
    const vendor = await login(DEMO_VENDOR_EMAIL, VENDOR_PASSWORD);
    assert.equal((await call('GET', '/admin/overview', { token: vendor })).status, 403);
    assert.equal((await call('POST', '/orders', { token: vendor, body: checkout([batik(1)]) })).status, 403);
  });

  it('shows a vendor only their own bookings', async () => {
    const vendor = await login(DEMO_VENDOR_EMAIL, VENDOR_PASSWORD);
    const { body } = await call('GET', '/vendor/overview', { token: vendor });
    assert.equal(body.vendor.id, 'ven-ubud-arts');
    assert.ok(body.bookings.length > 0);
    assert.ok(body.bookings.every((b: Json) => b.supplierId === 'ven-ubud-arts'));
    const other = (await db.query(`SELECT id FROM bookings WHERE supplier_id <> 'ven-ubud-arts' LIMIT 1`)).rows[0];
    assert.equal((await call('POST', `/vendor/bookings/${other.id}/complete`, { token: vendor })).status, 404);
  });
});

describe('vendor and admin operations', () => {
  it('settles a completed booking: eligible, then paid by an admin', async () => {
    const vendor = await login(DEMO_VENDOR_EMAIL, VENDOR_PASSWORD);
    const admin = await login(ADMIN.email, ADMIN.password);
    const { bookings } = (await call('GET', '/vendor/overview', { token: vendor })).body;
    const confirmed = bookings.find((b: Json) => b.status === 'confirmed');
    assert.equal((await call('POST', `/vendor/bookings/${confirmed.id}/complete`, { token: vendor })).status, 200);
    assert.equal((await call('POST', `/vendor/bookings/${confirmed.id}/no-show`, { token: vendor })).status, 409);
    const overview = (await call('GET', '/admin/overview', { token: admin })).body;
    const settlement = overview.settlements.find((s: Json) => s.bookingId === confirmed.id);
    assert.equal(settlement.status, 'eligible');
    assert.equal((await call('POST', `/admin/settlements/${settlement.id}/pay`, { token: admin })).status, 200);
    assert.equal((await call('POST', `/admin/settlements/${settlement.id}/pay`, { token: admin })).status, 409);
  });

  it('sends vendor product edits back to review before they go live', async () => {
    const vendor = await login(DEMO_VENDOR_EMAIL, VENDOR_PASSWORD);
    const admin = await login(ADMIN.email, ADMIN.password);
    const edit = { title: 'Batik class', summary: 'A revised description of the class.', price: 375000, capacity: 8, slots: ['09:00', '14:00'], durationMin: 180, meetingPoint: 'Jalan Hanoman, Ubud', freeCancellationHours: 24 };
    assert.equal((await call('PUT', '/vendor/experiences/exp-batik-ubud', { token: vendor, body: edit })).status, 200);
    assert.equal((await call('PUT', '/vendor/experiences/exp-cooking-ubud', { token: vendor, body: edit })).status, 404);
    let inventory = (await call('GET', '/inventory')).body.marketplace;
    assert.ok(!inventory.experiences.some((e: Json) => e.id === 'exp-batik-ubud'), 'hidden while in review');
    assert.equal((await call('POST', '/admin/experiences/exp-batik-ubud/review', { token: admin, body: { decision: 'approve' } })).status, 200);
    inventory = (await call('GET', '/inventory')).body.marketplace;
    assert.equal(inventory.experiences.find((e: Json) => e.id === 'exp-batik-ubud').price.amount, 375000);
  });

  it('hides a suspended vendor’s products', async () => {
    const admin = await login(ADMIN.email, ADMIN.password);
    await call('POST', '/admin/vendors/ven-dapur/verification', { token: admin, body: { status: 'suspended' } });
    const inventory = (await call('GET', '/inventory')).body.marketplace;
    assert.ok(!inventory.experiences.some((e: Json) => e.vendorId === 'ven-dapur'));
    await call('POST', '/admin/vendors/ven-dapur/verification', { token: admin, body: { status: 'verified' } });
  });

  it('versions cultural rules and clears verification on edit', async () => {
    const admin = await login(ADMIN.email, ADMIN.password);
    const created = await call('POST', '/admin/users', {
      token: admin,
      body: { email: 'reviewer@test.local', password: 'reviewer-password', name: 'Reviewer', role: 'cultural_reviewer' },
    });
    assert.equal(created.status, 201);
    const reviewer = await login('reviewer@test.local', 'reviewer-password');
    assert.equal((await call('POST', '/cultural/rules/cr-temple-dress/verify', { token: reviewer })).status, 200);
    const rule = (await call('GET', '/cultural/rules', { token: reviewer })).body.rules.find((r: Json) => r.id === 'cr-temple-dress');
    assert.equal(rule.verified, true);
    const { id: _id, version: _v, verified: _vf, demo: _d, verifiedAt: _va, ...editable } = rule;
    const updated = await call('PUT', '/cultural/rules/cr-temple-dress', { token: reviewer, body: { ...editable, text: { ...rule.text, en: `${rule.text.en} Updated.` } } });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    const versions = (await call('GET', '/cultural/rules/cr-temple-dress/versions', { token: reviewer })).body.versions;
    assert.deepEqual(versions.map((v: Json) => v.version), [2, 1]);
    const after = (await call('GET', '/cultural/rules', { token: reviewer })).body.rules.find((r: Json) => r.id === 'cr-temple-dress');
    assert.equal(after.verified, false);
    const trail = await db.query(`SELECT action FROM audit_log WHERE entity = 'cultural_rule' AND entity_id = 'cr-temple-dress' ORDER BY id`);
    assert.deepEqual(trail.rows.map((r) => r.action), ['cultural_rule.verified', 'cultural_rule.updated']);
  });
});
