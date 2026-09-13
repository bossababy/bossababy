# Bossababy store — setup runbook

Taking the site from a launch page to a store that collects pre-orders
and passes them to the 3PL.

Work through this top to bottom. Steps marked **[you]** need an account
or a credential only you can create; the rest is already built in this
repository.

---

## What changes, and why

The current site is static files on GitHub Pages. That is perfect for a
launch page and unusable for a store, for three reasons:

1. **Payments.** Card details cannot safely touch a static page. Taking
   them yourself would put you inside PCI scope, which is not somewhere a
   new brand wants to be. Shopify's checkout carries that burden.
2. **Tax.** Canadian sales tax depends on the buyer's province — GST in
   Alberta, HST in Ontario, GST + QST in Quebec, and so on. Shopify
   calculates this per order automatically.
3. **Secrets.** Sending orders to the 3PL needs an API key. This
   repository is public, and a key committed here could be used by anyone
   to create or cancel shipments. It has to live server-side.

So: **Shopify runs the store**, the design moves over as a custom theme
so nothing about the brand changes, and a small separate service
(`order-bridge/`) forwards paid orders to the 3PL.

---

## 1. Open the Shopify account **[you]**

Sign up at shopify.com, choose the **Basic** plan (around $51 CAD/month
billed monthly, less annually), and set the store currency to **CAD**
before the first order — currency cannot be changed afterwards.

Keep the store password-protected while you set it up. Nothing is public
until you remove the password.

## 2. Upload the theme

The theme in `shopify-theme/` reproduces the current design — same
palette, same Bodoni wordmark, same photo masthead and story section.

```bash
cd shopify-theme
zip -r ../bossababy-theme.zip .
```

Then in Shopify: **Online Store → Themes → Add theme → Upload zip file**,
and Publish.

Then upload the brand images once, under **Content → Files**. They are in
this repository at `assets/img/`:

- `logo-wordmark.svg` — the wordmark
- `logo-monogram.svg` — the "ab" monogram, used as the favicon
- `lifestyle-hallway.jpg` — the masthead photo
- `lifestyle-sketch.jpg` — the story photo

Shopify serves images from Files rather than from the theme, which is
why they are not bundled in the zip: uploading them once means you can
swap a photo later without touching the theme.

Now open **Customize** and:

- Pick the wordmark in the Header and Footer sections
- Pick the masthead photo in Photo masthead, and the story photo in Story
- Set the favicon to the monogram under **Theme settings → Brand**
- Point the Intro section's button at the product once it exists

Every piece of copy is editable in the theme editor, so you can change
wording without touching code.

## 3. Create the product **[you]**

**Products → Add product.**

- Title: *The Structured Tote*
- Price: **$370.00 CAD**. Add a **Compare-at price** only if there is a
  genuine regular price to compare against — an invented one is
  misleading advertising
- Colours, as three variants under one option named *Colour*:

  | Variant | Colour |
  |---|---|
  | First Light | Taupe |
  | After Hours | Black |
  | Cold Brew | Brown |

- **SKU, one per colour.** Agree the exact codes with the 3PL first. This
  is the single field most likely to cause a mis-ship, because it is what
  the warehouse picks by — and with three colourways, picking the right
  one depends entirely on the SKU being right. Something like
  `BB-TOTE-FL`, `BB-TOTE-AH`, `BB-TOTE-SW` reads clearly on a pick list.
- Weight and dimensions — the 3PL and the carrier both need these
- Under Inventory, tick **Continue selling when out of stock**. This is
  what makes pre-orders possible with an empty warehouse.
- Add the tag **`preorder`**

That tag is what switches the product page into pre-order mode: it shows
the "Pre-order" badge, the explanation of when the card is charged, the
required acknowledgement checkbox, and it stamps the promised shipping
window onto every order line so the warehouse can see it.

Set the shipping window text in **Customize → Product → Pre-order
shipping window**. It currently reads **December 2026**. Keep it
accurate — it is a promise, and it is what the acknowledgement checkbox
refers to.

## 3a. The 20% pre-order offer **[you]**

The storefront currently advertises **20% off every pre-order placed
before Sunday 6 December 2026** (Black Friday 2026 falls on Friday 27
November, so this is the end of the following week).

Three things have to line up, or the site is promising something the
checkout will not honour:

1. **Create the discount.** Discounts → Create discount → Amount off
   products → 20%, applied to the Structured Tote. Set the end date to
   23:59 on 6 December in your own timezone.
2. **Decide automatic or code.** An *automatic* discount applies at
   checkout with nothing to type, which matches what the page says. A
   *code* needs the page to tell people the code.
3. **Turn the offer bar off when it expires.** Customize → Offer bar →
   untick "Show the offer bar". An expired discount still displayed is a
   promise you have to honour.

The deadline appears in four places, all editable without touching code:
the offer bar, the masthead line, the pre-order note on the product page,
and the closing section. Change the date in one, change it in all four.

**The 15% you already promised.** Everyone on the Formspree list signed up
on the promise of *15% off at launch*. A public 20% offer is better than
what they were promised, which is fine — but do not send them a 15% code
during the pre-order window, or they will be worse off than strangers.
Either tell them the 20% covers them, or give the list something the
public offer does not have, such as first pick of colourways.

## 4. Payments, tax and shipping **[you]**

- **Payments:** turn on Shopify Payments (2.9% + 30¢ per transaction).
  You will need your business number and a bank account.
- **Tax:** Settings → Taxes. If you are registered for GST/HST, enter the
  number. Registration is mandatory once you pass $30,000 in revenue over
  four quarters, and worth doing earlier so you can claim input credits —
  confirm timing with your accountant.
- **Shipping:** Settings → Shipping. Ask the 3PL what carriers and
  service levels they offer, and set rates accordingly. "Free shipping in
  Canada" is simplest to communicate if the margin supports it.

## 5. Turn on French

Shopify handles the bilingual site natively, so the separate `/fr/` page
is no longer needed.

- **Settings → Languages → Add language → French**
- Install **Translate & Adapt** (free, by Shopify)
- The theme already ships French for all interface text
  (`locales/fr.json`). What you translate in Translate & Adapt is your
  *content*: product title, description, and the section copy. The
  existing French from `fr/index.html` can be pasted straight in.

The EN/FR toggle in the header switches automatically once French is
enabled.

## 6. Legal pages **[you]**

Settings → Policies. Shopify generates starting templates; edit them so
they are actually true of your business.

Give particular attention to:

- **Refund policy** — pre-orders need explicit cancellation terms. The
  product page currently promises a full refund any time before shipping;
  the policy must say the same thing.
- **Privacy policy** — you are collecting names and addresses of
  Canadian customers, which brings PIPEDA obligations, and Quebec's Law
  25 if you have customers there.
- **Terms of service** and **Shipping policy**.

Pre-selling goods that do not exist yet carries real consumer-protection
obligations, and they differ by province — Quebec's are the strictest.
This is worth an hour with a lawyer or an advisor before you take money,
and I'd treat it as a launch blocker rather than a nice-to-have.

## 7. Connect the 3PL

**First, ask them one question: do you have a Shopify app?**

If yes, install it, connect it, and skip the rest of this section and the
`order-bridge/` folder entirely. An integration they maintain beats one
we maintain.

If they are API-only, deploy the bridge — full instructions in
`order-bridge/README.md`. In short: create a Shopify custom app for the
API token, deploy the folder to Vercel, set the environment variables,
and subscribe the `orders/paid` webhook to it.

While you are pre-selling, leave `HOLD_PREORDERS=true`. Paid orders are
tagged `preorder-held` and parked rather than sent to a warehouse that
has nothing to pick. When stock lands, flip it to `false` and run the
release endpoint once to send everything queued.

## 8. Move the domain **[you]**

This is the cutover, so do it once everything above is ready and the
store has been test-ordered.

In Shopify: **Settings → Domains → Connect existing domain** →
`bossababy.ca`.

Then at GoDaddy → DNS, change the website records only:

| Type | Name | Value |
|---|---|---|
| A | `@` | `23.227.38.65` |
| CNAME | `www` | `shops.myshopify.com` |

Delete the four `185.199.x.153` GitHub Pages A records, and repoint the
existing `www` CNAME rather than adding a second one — GoDaddy will
reject a duplicate.

**Leave the MX records and the SPF, DKIM and DMARC TXT records exactly as
they are.** Those run your Google Workspace email. Touching them breaks
hello@bossababy.ca.

Propagation is usually under an hour. Then enable SSL in Shopify.

## 9. Bring the email list across **[you]**

The Formspree list is the audience for launch day, and the people you
promised 15% to.

1. Export the submissions from Formspree as CSV.
2. Reshape to Shopify's customer import columns: `Email`,
   `Accepts Email Marketing` (`yes`), and `Tags` — carry the `language`
   value across as a tag so you can still send French speakers French.
3. **Customers → Import customers.**

Then email them about the pre-order window — see the note in section 3a
about the 15% they were originally promised versus the 20% now offered
publicly.

**The store no longer collects email addresses.** The signup was removed
so the page asks for one thing only: a pre-order. That is the right call
while there is something to sell and a deadline to sell it against, but
it means no new list is being built. If you want that back after the
offer closes, the `newsletter` section is still in the theme — add it to
the homepage in **Customize → Add section → Newsletter**.

## 10. Before you take real money

- [ ] Place a real order end to end with your own card
- [ ] Confirm it reaches the 3PL correctly — SKU, address, province code,
      postal code format
- [ ] Refund that order and confirm the refund lands
- [ ] Check the order confirmation email reads as the brand, in both
      languages
- [ ] Open the store on a phone and buy something
- [ ] Confirm the pre-order acknowledgement checkbox blocks checkout
      until ticked
- [ ] Confirm taxes look right for two provinces (say ON and QC)
- [ ] Remove the store password

---

## What happens to this repository

Once the domain points at Shopify, `index.html` and `fr/index.html` stop
being served. Keep them — they are the reference the theme was built from
and the record of the design.

The live pieces become:

- `shopify-theme/` — the storefront design, uploaded to Shopify
- `order-bridge/` — the service forwarding orders to the 3PL
