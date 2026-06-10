# Bossababy — bossababy.ca

Launch ("coming soon") page for **Bossababy**, the diaper bag designed for
working moms. A static site — no build step — hosted on **GitHub Pages**
with the custom domain **bossababy.ca** (registered at GoDaddy).

## Structure

```
index.html            The launch page (hero + email signup + brand story)
assets/css/style.css  Styles — brand colors & fonts live in the :root block at the top
assets/js/main.js     Email signup handler (submits to Formspree)
assets/img/           Favicon and images
CNAME                 Tells GitHub Pages to serve the site at bossababy.ca
```

## Editing the brand

All colors, fonts, and shape values are CSS variables at the top of
`assets/css/style.css` (the "BRAND TOKENS" block). Change them there and the
whole site updates.

## Email signup — Formspree

The signup form submits to Formspree (endpoint `https://formspree.io/f/mvznqkqz`)
via AJAX, with the form's `action` attribute as a no-JavaScript fallback.
Collected emails appear in the Formspree dashboard. The endpoint is set in two
places if it ever changes: `FORM_ENDPOINT` in `assets/js/main.js` and the
`action` attribute in `index.html`.

## TODOs before launch

- Swap `assets/img/bag-illustration.svg` for a real product photo when ready
  (product concept sketches exist; upload them to `assets/img/` to use them
  on the page).
- Confirm the launch timing shown in the hero ("Launching 2027").

## Deploying to GitHub Pages

1. Merge this branch into `main`.
2. On GitHub: **Settings → Pages → Source: Deploy from a branch**, choose
   `main` and `/ (root)`, then save.
3. Under **Custom domain**, enter `bossababy.ca` and enable
   **Enforce HTTPS** (available a few minutes after DNS resolves).

## Pointing bossababy.ca (GoDaddy DNS)

In GoDaddy → My Products → bossababy.ca → **DNS**:

1. Add four **A records**, each with Name `@`, pointing to GitHub Pages:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
2. Add a **CNAME record**: Name `www`, Value `<your-github-username>.github.io`
3. Delete any GoDaddy "Parked" A record on `@`.

DNS changes take from a few minutes up to ~48 hours to propagate.
