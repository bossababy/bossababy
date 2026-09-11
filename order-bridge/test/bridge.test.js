import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.SHOPIFY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.THREEPL_API_KEY = 'test-key';

const { verifyWebhook, hasTag } = await import('../lib/shopify.js');
const { toThreePlOrder, extractTrackingNumber } = await import('../lib/threepl.js');
const { withRetry } = await import('../lib/retry.js');

function sign(body, secret = 'test-webhook-secret') {
  return crypto.createHmac('sha256', secret).update(body).digest('base64');
}

const sampleOrder = {
  id: 5544332211,
  name: '#1001',
  created_at: '2026-09-11T14:00:00-04:00',
  email: 'customer@example.com',
  note: 'Leave with concierge',
  tags: 'preorder-held',
  shipping_address: {
    first_name: 'Amy',
    last_name: 'Medeiros',
    address1: '100 Queen St W',
    address2: 'Suite 200',
    city: 'Toronto',
    province: 'Ontario',
    province_code: 'ON',
    zip: 'm5h 2n2',
    country_code: 'CA',
    phone: '416-555-0100',
  },
  line_items: [
    { sku: 'BB-TOTE-TAUPE', quantity: 1, name: 'The Structured Tote', price: '345.00', variant_id: 1 },
    { sku: 'GIFTCARD', quantity: 1, name: 'Gift card', price: '50.00', requires_shipping: false, variant_id: 2 },
  ],
  shipping_lines: [{ title: 'Standard' }],
};

test('verifyWebhook accepts a correctly signed body', () => {
  const body = Buffer.from(JSON.stringify(sampleOrder));
  assert.equal(verifyWebhook(body, sign(body)), true);
});

test('verifyWebhook rejects a tampered body', () => {
  const body = Buffer.from(JSON.stringify(sampleOrder));
  const signature = sign(body);
  const tampered = Buffer.from(JSON.stringify({ ...sampleOrder, id: 999 }));
  assert.equal(verifyWebhook(tampered, signature), false);
});

test('verifyWebhook rejects a body signed with the wrong secret', () => {
  const body = Buffer.from(JSON.stringify(sampleOrder));
  assert.equal(verifyWebhook(body, sign(body, 'attacker-secret')), false);
});

test('verifyWebhook rejects a missing or short signature', () => {
  const body = Buffer.from('{}');
  assert.equal(verifyWebhook(body, undefined), false);
  assert.equal(verifyWebhook(body, 'abc'), false);
});

test('toThreePlOrder maps the address and normalises the postal code', () => {
  const payload = toThreePlOrder(sampleOrder);
  assert.equal(payload.reference, '#1001');
  assert.equal(payload.external_id, '5544332211');
  assert.equal(payload.ship_to.name, 'Amy Medeiros');
  assert.equal(payload.ship_to.province, 'ON');
  assert.equal(payload.ship_to.postal_code, 'M5H 2N2');
  assert.equal(payload.ship_to.country, 'CA');
  assert.equal(payload.notes, 'Leave with concierge');
});

test('toThreePlOrder excludes items that do not ship', () => {
  const payload = toThreePlOrder(sampleOrder);
  assert.equal(payload.lines.length, 1);
  assert.equal(payload.lines[0].sku, 'BB-TOTE-TAUPE');
});

test('toThreePlOrder refuses an order with no address', () => {
  assert.throws(
    () => toThreePlOrder({ ...sampleOrder, shipping_address: null, billing_address: null }),
    /no shipping address/
  );
});

test('toThreePlOrder refuses an order with nothing shippable', () => {
  const digitalOnly = {
    ...sampleOrder,
    line_items: [{ sku: 'GIFTCARD', quantity: 1, name: 'Gift card', price: '50.00', requires_shipping: false }],
  };
  assert.throws(() => toThreePlOrder(digitalOnly), /no shippable line items/);
});

test('hasTag is case-insensitive and ignores surrounding spaces', () => {
  const order = { tags: 'Preorder-Held,  sent-to-3pl ' };
  assert.equal(hasTag(order, 'preorder-held'), true);
  assert.equal(hasTag(order, 'SENT-TO-3PL'), true);
  assert.equal(hasTag(order, '3pl-failed'), false);
});

test('extractTrackingNumber reads the common response shapes', () => {
  assert.equal(extractTrackingNumber({ tracking_number: 'A1' }), 'A1');
  assert.equal(extractTrackingNumber({ shipment: { tracking_number: 'B2' } }), 'B2');
  assert.equal(extractTrackingNumber({}), null);
});

test('withRetry stops immediately on a non-retryable error', async () => {
  let calls = 0;
  const error = Object.assign(new Error('bad payload'), { retryable: false });

  await assert.rejects(
    withRetry(
      () => {
        calls++;
        throw error;
      },
      { attempts: 3, baseDelayMs: 1 }
    ),
    /bad payload/
  );

  assert.equal(calls, 1, 'should not retry a 4xx');
});

test('withRetry retries then succeeds', async () => {
  let calls = 0;

  const result = await withRetry(
    () => {
      calls++;
      if (calls < 3) throw Object.assign(new Error('flaky'), { retryable: true });
      return 'ok';
    },
    { attempts: 3, baseDelayMs: 1 }
  );

  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});
