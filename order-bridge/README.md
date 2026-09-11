# Order bridge — Shopify to 3PL

Receives paid Shopify orders and sends them to the fulfilment partner.
While we are pre-selling with no stock, orders are parked instead of
shipped, and released in one batch when inventory lands.

## Why this exists

Most 3PLs offer a native Shopify app, and if ours does, **we should use
it and delete this folder** — an app we don't maintain is better than
code we do. This bridge is for the case where the partner only offers a
REST API, which is common with Canadian 3PLs.

It cannot live on the website itself. bossababy.ca is a static site with
no server, and this repository is public, so an API key committed here
would let anyone create or cancel shipments in our name. The bridge runs
separately, with its credentials held as environment variables.

## How an order flows

```
Customer pays
      │
      ▼
Shopify fires the orders/paid webhook
      │
      ▼
POST /api/shopify-order-webhook
      │
      ├─ signature invalid ──────────────▶ 401, nothing happens
      ├─ already tagged sent-to-3pl ─────▶ 200, skipped (no double ship)
      ├─ pre-order + HOLD_PREORDERS ─────▶ tagged preorder-held, parked
      └─ otherwise ──────────────────────▶ sent to the 3PL, tagged sent-to-3pl
```

When stock arrives, `POST /api/release-preorders` walks every parked
order and sends it on.

## State lives in Shopify, not here

There is no database. Each order carries its own status as a tag:

| Tag | Meaning |
|---|---|
| `preorder-held` | Paid, waiting for stock. Not yet with the warehouse. |
| `sent-to-3pl` | Accepted by the 3PL. Never sent twice. |
| `3pl-failed` | Submission failed. Visible in the admin for follow-up. |

You can see and filter these in Shopify Admin → Orders, which means the
state is legible to a human, not just to this code.

## Setup

**1. Create a Shopify custom app** (Settings → Apps → Develop apps) with
Admin API scopes `read_orders` and `write_orders`. Install it and copy
the access token.

**2. Deploy this folder** to Vercel (free tier is sufficient):

```bash
npx vercel --prod
```

**3. Set the environment variables** in the Vercel dashboard — see
`.env.example` for the full list with explanations. Never commit real
values; this repository is public.

**4. Create the webhook** in Shopify: Settings → Notifications →
Webhooks → Create webhook.

- Event: **Order payment** (`orders/paid`) — not "Order creation", so an
  unpaid order can never reach the warehouse
- Format: JSON
- URL: `https://<your-deployment>/api/shopify-order-webhook`

Copy the signing secret Shopify shows you into `SHOPIFY_WEBHOOK_SECRET`.

**5. Fill in the 3PL specifics** in `lib/threepl.js`. Everything
partner-specific is in that one file: the endpoint, the auth style, the
field names, and where tracking appears in their response. Confirm each
field against their documentation before the first live order — wrong
SKUs or a wrong province code are what cause mis-ships.

## Going live with stock

1. Set `HOLD_PREORDERS=false` in Vercel, so new orders flow straight
   through.
2. Release everything parked:

```bash
curl -X POST https://<your-deployment>/api/release-preorders \
  -H "X-Release-Token: $RELEASE_TOKEN"
```

The response reports how many were sent and names any that failed. It is
safe to run more than once: orders already tagged `sent-to-3pl` are
skipped, and each submission carries an idempotency key.

## Tests

```bash
npm test
```

Covers webhook signature verification (including tampered bodies and
wrong secrets), order mapping, the exclusion of non-shippable items, and
the retry policy.

## Before the first real order

Place a live test order and confirm it appears correctly on the 3PL
side. In particular check that the SKU matches their catalogue, the
province is the two-letter code they expect, and the postal code format
is accepted. A refunded test order costs a few dollars and is much
cheaper than a mis-shipped launch.
