/* =========================================================
   3PL adapter.

   Everything that is specific to the fulfilment partner lives in
   this one file. The rest of the bridge (signature checking,
   hold/release logic, retries, tagging) is partner-agnostic, so
   swapping 3PLs — or correcting a field name after their first
   test order — means editing here and nowhere else.

   TO COMPLETE once the 3PL supplies their API docs:
     1. THREEPL_API_URL and auth style (see `authHeaders`)
     2. `toThreePlOrder` — their exact field names
     3. `extractTrackingNumber` — where tracking appears in their
        response or webhook
   ========================================================= */

import { requireEnv } from './shopify.js';

/**
 * Auth header for the 3PL. Most Canadian 3PLs use one of:
 *   Bearer token   ->  Authorization: Bearer <key>
 *   API key header ->  X-API-Key: <key>
 *   Basic auth     ->  Authorization: Basic base64(user:pass)
 * Set THREEPL_AUTH_STYLE to bearer | apikey | basic.
 */
function authHeaders() {
  const style = (process.env.THREEPL_AUTH_STYLE || 'bearer').toLowerCase();
  const key = requireEnv('THREEPL_API_KEY');

  if (style === 'apikey') {
    return { [process.env.THREEPL_API_KEY_HEADER || 'X-API-Key']: key };
  }

  if (style === 'basic') {
    const user = requireEnv('THREEPL_API_USER');
    const encoded = Buffer.from(`${user}:${key}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  return { Authorization: `Bearer ${key}` };
}

/**
 * Translate a Shopify order into the 3PL's create-order payload.
 *
 * Field names below are the common shape used by most fulfilment
 * APIs; confirm each one against the partner's documentation before
 * the first live order. Quantities, SKUs and the address are the
 * fields that actually cause mis-ships when they are wrong.
 */
export function toThreePlOrder(order) {
  const ship = order.shipping_address || order.billing_address;

  if (!ship) {
    throw new Error(`Order ${order.name} has no shipping address`);
  }

  const lines = (order.line_items || [])
    // Gift cards and other non-physical items must never reach the warehouse.
    .filter((item) => item.requires_shipping !== false)
    .map((item) => ({
      sku: item.sku || String(item.variant_id),
      quantity: item.quantity,
      description: item.name,
      unit_price: Number(item.price),
    }));

  if (lines.length === 0) {
    throw new Error(`Order ${order.name} has no shippable line items`);
  }

  return {
    // Our order number is the shared reference in support conversations.
    reference: order.name,
    external_id: String(order.id),
    ordered_at: order.created_at,

    ship_to: {
      name: [ship.first_name, ship.last_name].filter(Boolean).join(' ') || ship.name,
      company: ship.company || '',
      address1: ship.address1,
      address2: ship.address2 || '',
      city: ship.city,
      // Canadian 3PLs expect the two-letter province code (ON, QC, BC…).
      province: ship.province_code || ship.province,
      postal_code: (ship.zip || '').toUpperCase(),
      country: ship.country_code || 'CA',
      phone: ship.phone || order.phone || '',
      email: order.email || '',
    },

    lines,

    shipping_method: order.shipping_lines?.[0]?.title || 'Standard',
    // Surfaced on the packing slip; the gift note is the common use.
    notes: order.note || '',
  };
}

/** Pull a tracking number out of the 3PL's response, if it returns one. */
export function extractTrackingNumber(response) {
  return (
    response?.tracking_number ||
    response?.trackingNumber ||
    response?.shipment?.tracking_number ||
    null
  );
}

/**
 * Send one order to the 3PL.
 *
 * `Idempotency-Key` is what stops a duplicate shipment when Shopify
 * retries a webhook or a release run overlaps with itself. If the
 * partner does not honour the header, ask them which field they
 * de-duplicate on — most reject a repeated `reference` outright,
 * which is the behaviour we want.
 */
export async function createThreePlOrder(order) {
  const url = requireEnv('THREEPL_API_URL');
  const payload = toThreePlOrder(order);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `shopify-order-${order.id}`,
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`3PL rejected order ${order.name}: ${response.status} ${text}`);
    // 4xx means the payload is wrong — retrying sends the same bad data.
    // 5xx and 429 are worth retrying.
    error.retryable = response.status >= 500 || response.status === 429;
    throw error;
  }

  return parsed;
}
