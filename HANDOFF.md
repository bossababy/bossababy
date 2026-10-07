# Bossababy: handoff (7 October 2026)

Bossababy sells one product, **The Structured Tote**, a vegan-leather diaper/work bag. It is on pre-order now and ships Winter 2026. Owner: Amy (amy@bossababy.ca). Public contact: hello@bossababy.ca.

## Where things are

| | |
|---|---|
| Store | Shopify, **live at https://bossababy.ca** (admin: `zxh53r-ry.myshopify.com`). Password off. EN + FR (`/fr/`). |
| Repo | `github.com/bossababy/bossababy` (formerly `aeamedeiros/Bossababy`). Work branch: `claude/bossababy-website-design-8reddm`. `main` holds the old static launch page; its `CNAME` was deleted after the domain moved to Shopify. |
| Theme source | `shopify-theme/` on the work branch |
| **Live theme** | **"Bossababy (no end date)"**, `gid://shopify/OnlineStoreTheme/158569660588` |
| Product | `gid://shopify/Product/8758471327916`, $370 CAD. Variants: First Light `BB-TOTE-FL`, High Noon `BB-TOTE-HN`, After Hours `BB-TOTE-AH`. Tag `preorder`. Inventory tracked with "continue selling", so the count goes negative and shows how many bags are committed. Weight 4 lb. |
| Discount | **"Pre-order 25%"**, automatic, **no end date**, `gid://shopify/DiscountAutomaticNode/1503176458412` |
| Shipping | Canada only. **Standard, free, 5–8 business days.** "Expedited" ($25, 2–3 days) is **deactivated, not deleted**. Turn it back on when stock lands. |
| Location | "Bossababy Inc.", 1515 Drew Rd, Mississauga (NLI's warehouse). |
| 3PL | NLI International: they log into Shopify with a staff account. No API, no middleware. |
| Orders | #1004 (a friend: refunded down to 40% off, partially refunded), #1005, #1006 and #1007 paid. #1001–#1003 were tests and are closed. |

## Video landing (7 October 2026)

Instagram ad traffic (~600 phone visits) produced 11 cart adds and no sales, so the ad now points at the product page and both pages lead with the product video. Theme **"Bossababy (video landing)"** (`gid://shopify/OnlineStoreTheme/158678843564`), source on branch `claude/bossababy-handoff-setup-tk853x`:

- Homepage opens on `sections/video-hero.liquid`: Video4.mov (Shopify Files) muted on a loop with a sound button, headline, the pre-order price, the button and the refund note. The AI hallway masthead and the opening "intro" section are gone; the story section has no background photo (the AI sketch).
- Product page gallery follows the product's media order in admin: all three colours (`assets/img/all-three-colourways.jpg`, stitched from the three colourway shots), Video4 (attached to the product as media), the two lifestyle photos, then First Light, High Noon, After Hours. A `?variant=` link opens on that colour; phones can swipe the main photo. Video alt text can't be translated (Shopify doesn't expose it).
- Price after the discount is shown next to the regular price (`snippets/preorder-price.liquid`), driven by the theme setting `preorder_discount` (25). Display only — the discount itself is the automatic discount.
- Phones get a bar pinned to the bottom (`snippets/sticky-buy.liquid`) once the main button scrolls away.

## How to change the live theme (read before editing anything)

1. **This connector can't write to the published theme, and can't publish one.** The workflow is: `themeDuplicate` the live theme, then `themeFilesUpsert` the changed files into the copy, then Amy publishes the copy.
2. **For `themeFilesUpsert`**, push the file to the repo and pass `body: {type: URL, value: https://raw.githubusercontent.com/bossababy/bossababy/<commit>/shopify-theme/<path>}`. No need to inline large files.
3. **Before editing, pull the live theme's files.** Amy edits in the theme editor, and other sessions have edited the store directly, so the repo goes stale. Building from a stale copy silently reverts their work (it has happened).
4. **Use `themeDuplicate`, not `themeCreate` from a zip.** A duplicate keeps every French translation. A zip upload gets new resource IDs and all ~50 translations must be re-registered.
5. **Any English text change leaves the French stale.** Shopify keeps serving the old French until it's updated. After an edit, read the new `translatableContent` digests and `translationsRegister` the French. This works on the live theme too.
6. **Removing a setting brings back its schema default.** To make text disappear, clear the default in the section's `{% schema %}` as well.
7. **The logo SVG renders wrongly on iPhone** (WebKit runs the letters together), so header and footer use `logo-wordmark.png`. Don't switch back to the SVG.

## What this setup can't do

- Write policies (no `write_legal_policies` scope). Amy pastes policy text; the French versions *can* be updated with `translationsRegister`.
- Read Shopify Payments settings (test mode, payouts), edit the store email, or create staff accounts.
- Open bossababy.ca or Shopify's CDN from the sandbox (network-blocked). Ask Amy for screenshots, and say which phone and browser.

## Open items

1. **PO box first, then marketing email.** CASL requires a mailing address in every marketing email. The address was removed from the policies for privacy; add the PO box back once Amy has one.
2. **Pre-order hold before NLI gets Shopify access.** Use a Shopify Flow rule: on order created with tag `preorder`, place a fulfillment hold ("Awaiting stock — do not ship") and add tag `PREORDER-HOLD`. Also give NLI a saved order view that excludes held orders, and a staff account limited to orders. Release the holds in bulk when stock arrives.
3. **When stock lands:** receive inventory against the negative counts (for example, −40 + 300 = 260), turn Expedited back on, update the shipping policy in English and French, release the holds.
4. **Ending the 25% offer:** deactivate the discount, set the theme setting **Pre-order offer → "Pre-order discount shown on the site" to 0** (it drives the struck-through price on the homepage, product page and sticky bar), turn off the offer bar, and update the product page notice, English and French, all at once.
5. **NLI contract (unsigned):** two-year term vs 90-day notice contradiction, $50/unit liability cap, goods not insured by NLI, 36-hour claim window. Also: CARM registration (blocking for imports), the returns destination for defective items (pending NLI's Steve), and a kitting quote.
6. **Clean-up:** `order-bridge/` is dead code (NLI uses staff access instead). Delete it. 17 themes are on the store; prune them in January, after pre-orders ship.
7. **Unverified:** whether the order confirmation email shows "Ships: Winter 2026".
