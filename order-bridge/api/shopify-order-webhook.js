/* =========================================================
   Shopify -> 3PL order bridge.

   Subscribe this endpoint to the `orders/paid` webhook (not
   `orders/create`): an order that was never paid should never
   reach the warehouse.

   Flow:
     verify signature -> skip if already sent -> hold pre-orders
     -> otherwise forward to the 3PL -> tag the order with what
     happened.
   ========================================================= */

import {
  readRawBody,
  verifyWebhook,
  addOrderTags,
  hasTag,
  TAG_SENT,
  TAG_HELD,
  TAG_FAILED,
} from '../lib/shopify.js';
import { createThreePlOrder, extractTrackingNumber } from '../lib/threepl.js';
import { withRetry } from '../lib/retry.js';

// Vercel must not parse the body: HMAC is computed over raw bytes.
export const config = { api: { bodyParser: false } };

/** True while we are taking pre-orders with no stock in the warehouse. */
function holdingPreorders() {
  return (process.env.HOLD_PREORDERS ?? 'true').toLowerCase() !== 'false';
}

/**
 * A pre-order line carries the "Ships" property the product page
 * attaches (the French storefront sends "Expédition"). Falling back
 * to the product tag would need an extra API call per order.
 */
function isPreorder(order) {
  const shipKeys = ['ships', 'expédition', 'expedition'];
  return (order.line_items || []).some((item) =>
    (item.properties || []).some((property) =>
      shipKeys.includes(String(property.name || '').trim().toLowerCase())
    )
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: 'Could not read request body' });
  }

  if (!verifyWebhook(rawBody, req.headers['x-shopify-hmac-sha256'])) {
    // Unsigned or wrongly signed: refuse without saying why.
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let order;
  try {
    order = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Shopify retries webhooks it thinks failed. Sending an order we
  // have already sent would ship the bag twice.
  if (hasTag(order, TAG_SENT)) {
    return res.status(200).json({ status: 'already_sent', order: order.name });
  }

  if (holdingPreorders() && isPreorder(order)) {
    try {
      await addOrderTags(order, [TAG_HELD]);
    } catch (error) {
      console.error('Failed to tag held order', order.name, error);
      // 500 asks Shopify to retry; an untagged order would be invisible
      // to the release run and would silently never ship.
      return res.status(500).json({ error: 'Could not tag order' });
    }

    return res.status(200).json({ status: 'held_for_stock', order: order.name });
  }

  try {
    const result = await withRetry(() => createThreePlOrder(order));
    const tracking = extractTrackingNumber(result);

    await addOrderTags(order, [TAG_SENT]);

    return res.status(200).json({
      status: 'sent_to_3pl',
      order: order.name,
      tracking,
    });
  } catch (error) {
    console.error('3PL submission failed for', order.name, error);

    // Tag it so a failed order is visible in the admin rather than
    // lost in a log, then let Shopify retry.
    try {
      await addOrderTags(order, [TAG_FAILED]);
    } catch (tagError) {
      console.error('Could not tag failed order', order.name, tagError);
    }

    return res.status(500).json({ error: 'Could not submit order to 3PL' });
  }
}
