# Reusable prompt — Option 2: host Wendy's Bakehouse on Namecheap cPanel shared hosting

Paste this whole file into a fresh session when you want this option carried out.
It is written to stand alone: no earlier conversation is needed.

---

## Context you can rely on

- Project: Wendy's Bakehouse, an online cake and small-chops shop.
- Code: `https://github.com/sleekfash/admin-wendy.git`
- Currently live on Lovable at `https://admin-wendy.lovable.app/`
- Stack: TanStack Start (React 19 + Vite 7), Tailwind v4, Supabase for
  database/auth/storage, Stripe for card payments.
- The app is **not** a plain static site. Prices, checkout totals, order
  creation, the Stripe webhook and the whole `/admin` console run as server
  code. Any plan that only uploads a `dist` folder will break checkout.
- Domain registrar and shared host: Namecheap (cPanel).

## Goal

Run the shop on the existing Namecheap cPanel shared hosting, with the database
on a managed Supabase project.

## Prerequisites the human must have done

1. A Supabase project created, with the four SQL files in `deploy/supabase/`
   run in order (`01-schema.sql`, `02-data.sql`, `03-storage.sql`,
   `04-admin-user.sql`), and an admin login created before file 4.
2Ready to hand: Supabase Project URL, project reference, publishable/anon key,
   service-role key, and the Stripe secret key.
3. cPanel access, and a domain or subdomain already pointed at the hosting
   account.
4. Node.js available in cPanel (**Setup Node.js App**). Confirm the highest
   Node version offered — the app needs Node 20 or newer.

## Route A — Node.js app under Passenger (the only route that keeps checkout working)

Following Namecheap's own guide for deploying React/Vite/Next apps in cPanel:

1. In cPanel open **Setup Node.js App** → **Create Application**.
   - Node.js version: highest available (20+).
   - Application root: e.g. `wendys-bakehouse`
   - Application URL: the domain or subdomain.
   - Application startup file: the built server entry (see step 4).
2. Build the app **on your own computer**, not on the server — shared hosting
   memory limits usually kill the Vite build:
   `npm ci && npm run build`
3. Upload the build output plus `package.json` and `package-lock.json` to the
   application root over SFTP or the cPanel File Manager. Do not upload
   `node_modules`; install on the server instead.
4. Set the startup file to the Node server entry produced by the build (inspect
   the build output folder to find it; do not guess a filename).
5. In **Setup Node.js App**, click **Run NPM Install**, then add every
   environment variable listed below in the app's Environment Variables panel.
6. Click **Restart**. Passenger serves the app at the chosen URL.
7. Every future code change means: build locally, upload, **Restart** again.
   There is no automatic deploy.

## Route B — static upload (only acceptable if the shop is cut down)

Namecheap's guide also describes building locally and dropping `dist` into
`public_html` with an `.htaccess` SPA rewrite:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]
```

Do **not** take this route without telling the human, in plain words, that it
removes server-side pricing, order creation, the Stripe webhook and the admin
console, and that those would each have to be rebuilt as Supabase edge
functions before the shop could take an order again.

## Environment variables

```
VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_PROJECT_ID
SUPABASE_SERVICE_ROLE_KEY        (secret)
STRIPE_SECRET_KEY                (secret)
STRIPE_WEBHOOK_SECRET            (secret; create after the webhook URL exists)
GOOGLE_MAPS_API_KEY              (optional, distance-based delivery fees only)
```

## Verification checklist

- Home, menu and a product page load with photos and prices
- Add to basket → checkout → Pickup → bank transfer order with a slip upload
- Card payment reaches Stripe's payment page and the order flips to paid
- Stripe test webhook delivers a 2xx to `/api/public/stripe-webhook`
- Log in at `/auth`, open `/admin`, confirm the order, totals and slip
- Delete the test order

## Rollback

Nothing here touches the live Lovable site. If the cPanel deployment misbehaves,
leave DNS pointing at Lovable (or point it back) and the shop keeps trading.

## What to tell the human at the end

State plainly whether checkout, the admin console and the Stripe webhook all
work on the shared host, and how each future update will have to be shipped.
