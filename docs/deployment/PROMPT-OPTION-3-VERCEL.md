# Reusable prompt — Option 3: managed Supabase + Vercel (recommended)

Paste this whole file into a fresh session when you want this option carried out.
It is written to stand alone: no earlier conversation is needed.

---

## Context you can rely on

- Project: Wendy's Bakehouse, an online cake and small-chops shop.
- Code: `https://github.com/sleekfash/admin-wendy.git`
- Currently live on Lovable at `https://admin-wendy.lovable.app/`
- Stack: TanStack Start (React 19 + Vite 7), Tailwind v4, Supabase for
  database/auth/storage, Stripe for card payments.
- Server code (`createServerFn` plus routes under `src/routes/api/`) owns all
  pricing, order creation, the Stripe webhook and the `/admin` console. The
  host must run that server code — a static upload is not an option.
- Domain registrar: Namecheap. The cPanel hosting is not needed for this route.
- Ready-made assets already in the repo: `deploy/supabase/01-schema.sql`,
  `02-data.sql`, `03-storage.sql`, `04-admin-user.sql`, `.env.example`,
  `vercel.json`, and the step-by-step guide `deploy/DEPLOYMENT.md`.

## Goal

Database, auth and storage on the owner's own Supabase project; the website on
Vercel, building automatically from GitHub; the Namecheap domain pointed at
Vercel; Stripe card payments working end to end.

## Steps

1. **Database** — create a Supabase project. In the SQL Editor run
   `01-schema.sql`, `02-data.sql`, `03-storage.sql`. Then create the admin login
   under Authentication → Users (auto-confirm on) and run `04-admin-user.sql`
   last. Turn off public sign-ups under Authentication → Sign In / Providers.
   Orders and payment slips are intentionally not copied; the catalogue,
   prices, options, delivery zones and settings are.
2. **Website** — import the GitHub repository into Vercel. Leave build settings
   alone; `vercel.json` already declares them. Add the environment variables
   below, then deploy.
3. **Stripe** — in the Stripe dashboard add a webhook endpoint at
   `https://<your-vercel-domain>/api/public/stripe-webhook`, subscribed to
   `checkout.session.completed` and `checkout.session.expired`. Copy the signing
   secret into `STRIPE_WEBHOOK_SECRET` in Vercel and redeploy.
4. **Verify on the temporary Vercel address** before touching DNS (checklist
   below).
5. **Domain** — in Vercel add `wendysbakehouse.ca` and `www`, then in Namecheap
   → Domain List → Manage → Advanced DNS create exactly the records Vercel
   shows (usually an A record for `@` to `76.76.21.21` and a CNAME for `www` to
   `cname.vercel-dns.com`). Delete stale records pointing at cPanel. SSL is
   automatic.

## Environment variables

```
VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_PROJECT_ID
SUPABASE_SERVICE_ROLE_KEY        (secret)
STRIPE_SECRET_KEY                (secret)
STRIPE_WEBHOOK_SECRET            (secret; added in step 3)
GOOGLE_MAPS_API_KEY              (optional, distance-based delivery fees only)
```

## Verification checklist

- Home, menu and a product page load with photos and prices
- Basket → checkout → Pickup → bank-transfer order with a slip upload
- Card payment on a Stripe test card completes and the order shows paid with
  its Stripe reference
- Deposit product charges only the deposit and shows the remaining balance
- Log in at `/auth`, open `/admin`, confirm the order, totals and slip
- Delete the test orders

## Rollback

The Lovable site stays live and untouched until DNS is switched. If anything is
wrong after the switch, point the Namecheap records back at Lovable.

## Ongoing

Edits pushed to the GitHub repository redeploy on Vercel automatically. Keep an
eye on Supabase storage usage as product photos accumulate, and export a
database backup monthly.
