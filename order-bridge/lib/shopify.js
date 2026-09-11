/* =========================================================
   Shopify Admin API helpers.

   Shopify itself is our database. Rather than standing up a
   separate store for "which orders have we already sent?", we
   record state as order tags. That makes the state visible in
   the Shopify admin and impossible to get out of sync with the
   orders themselves.
   ========================================================= */

import crypto from 'node:crypto';

const API_VERSION = '2025-07';

export const TAG_SENT = 'sent-to-3pl';
export const TAG_HELD = 'preorder-held';
export const TAG_FAILED = '3pl-failed';

function adminUrl(path) {
  const shop = requireEnv('SHOPIFY_SHOP_DOMAIN'); // e.g. bossababy.myshopify.com
  return `https://${shop}/admin/api/${API_VERSION}${path}`;
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Verify a Shopify webhook signature.
 *
 * This is the single most important function here. Without it the
 * endpoint is a public API that creates real shipments: anyone who
 * learns the URL could POST fabricated orders and have goods picked,
 * packed and sent. The HMAC must be computed over the RAW request
 * body — re-serialising parsed JSON changes the bytes and the
 * signature will never match.
 */
export function verifyWebhook(rawBody, hmacHeader) {
  const secret = requireEnv('SHOPIFY_WEBHOOK_SECRET');
  if (!hmacHeader) return false;

  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const a = Buffer.from(digest, 'utf8');
  const b = Buffer.from(hmacHeader, 'utf8');

  // Length check first: timingSafeEqual throws on mismatched lengths.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Read the raw request body as a Buffer (needed for HMAC verification). */
export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function adminFetch(path, options = {}) {
  const response = await fetch(adminUrl(path), {
    ...options,
    headers: {
      'X-Shopify-Access-Token': requireEnv('SHOPIFY_ADMIN_TOKEN'),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify ${options.method || 'GET'} ${path} failed: ${response.status} ${body}`);
  }

  return response.json();
}

export async function getOrder(orderId) {
  const data = await adminFetch(`/orders/${orderId}.json`);
  return data.order;
}

/**
 * Add and/or remove order tags in a single write.
 *
 * One PUT rather than two keeps the order from sitting in a state
 * where it is neither held nor sent — a window in which a concurrent
 * release run could pick it up a second time.
 */
export async function updateOrderTags(order, { add = [], remove = [] } = {}) {
  const removeLower = remove.map((t) => t.toLowerCase());

  const tags = (order.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !removeLower.includes(t.toLowerCase()));

  const merged = Array.from(new Set([...tags, ...add]));

  await adminFetch(`/orders/${order.id}.json`, {
    method: 'PUT',
    body: JSON.stringify({ order: { id: order.id, tags: merged.join(', ') } }),
  });

  return merged;
}

/** Convenience wrapper for the common add-only case. */
export async function addOrderTags(order, newTags) {
  return updateOrderTags(order, { add: newTags });
}

export function hasTag(order, tag) {
  return (order.tags || '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .includes(tag.toLowerCase());
}

/** Orders currently parked waiting for stock. */
export async function listHeldOrders(limit = 250) {
  const data = await adminFetch(
    `/orders.json?status=any&financial_status=paid&limit=${limit}`
  );
  return (data.orders || []).filter(
    (order) => hasTag(order, TAG_HELD) && !hasTag(order, TAG_SENT)
  );
}
