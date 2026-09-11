/* =========================================================
   Release held pre-orders to the 3PL.

   Run this once stock has landed in the warehouse. It walks every
   paid order tagged `preorder-held`, sends it to the 3PL, and
   re-tags it. Safe to run twice: orders already tagged
   `sent-to-3pl` are skipped, and the 3PL call carries an
   idempotency key.

   Trigger it manually:
     curl -X POST https://<deployment>/api/release-preorders \
       -H "X-Release-Token: $RELEASE_TOKEN"
   ========================================================= */

import crypto from 'node:crypto';
import {
  listHeldOrders,
  addOrderTags,
  updateOrderTags,
  requireEnv,
  TAG_SENT,
  TAG_HELD,
  TAG_FAILED,
} from '../lib/shopify.js';
import { createThreePlOrder } from '../lib/threepl.js';
import { withRetry } from '../lib/retry.js';

function tokenMatches(provided) {
  const expected = requireEnv('RELEASE_TOKEN');
  if (typeof provided !== 'string') return false;

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // This endpoint causes real shipments, so it is never open.
  if (!tokenMatches(req.headers['x-release-token'])) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let held;
  try {
    held = await listHeldOrders();
  } catch (error) {
    console.error('Could not list held orders', error);
    return res.status(502).json({ error: 'Could not reach Shopify' });
  }

  const sent = [];
  const failed = [];

  for (const order of held) {
    try {
      await withRetry(() => createThreePlOrder(order));
      await updateOrderTags(order, { add: [TAG_SENT], remove: [TAG_HELD] });
      sent.push(order.name);
    } catch (error) {
      console.error('Release failed for', order.name, error);
      failed.push({ order: order.name, reason: error.message });
      try {
        await addOrderTags(order, [TAG_FAILED]);
      } catch (tagError) {
        console.error('Could not tag failed order', order.name, tagError);
      }
    }
  }

  // 207 when some succeeded and some did not, so a caller cannot
  // mistake a partial run for a clean one.
  const status = failed.length === 0 ? 200 : 207;

  return res.status(status).json({
    considered: held.length,
    sent: sent.length,
    failed: failed.length,
    sent_orders: sent,
    failures: failed,
  });
}
