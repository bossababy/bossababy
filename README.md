# Bossababy — bossababy.ca

Website for **Bossababy**, the Structured Tote for working mothers.

The repository holds two eras of the site. The launch page is what is
live today; the store is built and waiting to be switched on.

## Structure

```
index.html            Launch page, currently live on GitHub Pages
fr/index.html         French launch page
assets/               Styles, script and brand images for the launch page
CNAME                 Serves the launch page at bossababy.ca

shopify-theme/        The store design, uploaded to Shopify
order-bridge/         Service that forwards paid orders to the 3PL
STORE-SETUP.md        Step-by-step runbook for going from page to store
```

## Which one is live?

**Right now: the launch page**, on GitHub Pages, collecting emails
through Formspree.

The store takes over when the GoDaddy DNS records are repointed from
GitHub Pages to Shopify — that single change is the cutover, and it is
step 8 of `STORE-SETUP.md`. Nothing about the store is public before
then.

## The launch page

A static site with no build step. All colours, fonts and shape values
are CSS variables at the top of `assets/css/style.css` (the "BRAND
TOKENS" block); changing them there updates the whole page.

Signups post to Formspree (`https://formspree.io/f/mvznqkqz`) via AJAX,
with the form's `action` attribute as a no-JavaScript fallback. Each
submission records `language` as `en` or `fr` so the list can be
segmented at launch.

## The store

`shopify-theme/` reproduces the launch page design as a Shopify theme —
same palette, wordmark, photo masthead and story section — and adds a
product page, cart, and a French storefront. Brand tokens live in the
same place, `assets/theme.css`.

The product page switches into pre-order mode when the product carries
the `preorder` tag: a badge, an explanation of when the card is charged,
a required acknowledgement, and the promised shipping window stamped
onto every order line.

`order-bridge/` receives the `orders/paid` webhook and sends orders to
the 3PL, parking pre-orders until stock arrives. It only exists if the
3PL has no Shopify app of its own — see `order-bridge/README.md`.

**No credential belongs in this repository.** It is public. API keys
live as environment variables where the bridge is deployed.

## Outstanding

- Name the 3PL and confirm whether they offer a Shopify app; fill in
  `order-bridge/lib/threepl.js` if not
- Product photography to replace the concept illustration
- The **15% code** promised to the early-access list — create it and
  email the list when the store opens
- Legal review of the pre-order terms before taking money
  (see `STORE-SETUP.md`, section 6)
