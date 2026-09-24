# Work checkpoint - 2026-09-20

## Goal

Finish the cake-pricing rollout, close production review findings, verify the
application, then deploy the existing-database migration to the correct live
Supabase project after human-assisted authentication.

## Completed

### Cake-pricing feature (previous sessions)

- Percentage-deposit schema, additive migration `deploy/supabase/05-cake-pricing.sql`,
  idempotent catalogue seed `deploy/supabase/02-data.sql`, authoritative server
  pricing in `src/lib/pricing.server.ts`, storefront/cart/checkout updates,
  policies route, admin deposit controls, and deployment documentation.
- Owner-confirmed 8-inch totals of $180 and $250.

### Production hardening (this and recent sessions)

- **Custom-cake identity**: `src/lib/custom-cake-contract.ts` holds the stable
  product, category, and rule-group IDs. Pricing identifies the canonical cake
  by ID only and fails closed when its category, payment rule, or the four core
  option groups are missing or structurally wrong. Minima ($130/$280) and tier
  rules apply regardless of payment mode, slug, labels, or visibility.
- **Admin protection**: server functions keep saved option IDs/keys immutable,
  block deletion of the canonical cake and its option groups/choices, reject new
  custom-cake groups/choices from the admin console, enforce deposit payment for
  the canonical cake, and reserve the Custom cakes category for it. The admin UI
  disables the matching controls. UUID inputs are case-normalized everywhere
  protected IDs are compared.
- **Stripe checkout**: card payments require both `STRIPE_SECRET_KEY` and
  `STRIPE_WEBHOOK_SECRET`; sessions are card-only with PaymentIntent metadata;
  session linking and pending-to-failed cleanup writes are checked; orphaned
  sessions are expired server-side.
- **Stripe webhook** (`src/routes/api/public/stripe-webhook.ts`): owns all card
  payment state. `checkout.session.completed` / `checkout.session.expired` /
  `charge.refunded` go through the shared state machine (`src/lib/order-status.ts`,
  now exhaustive, with `pending -> expired`), replays and out-of-order events are
  safe, persistence errors return 500, partial refunds are ignored, and unknown
  events are logged for reconciliation. Deployment docs list the third event.
- **Admin orders**: `adminUpdateOrder` uses compare-and-swap updates, blocks
  manual Stripe payment-status changes, and blocks order-status changes while a
  card payment is pending (the admin UI mirrors this).
- **Database privileges**: fresh (`01-schema.sql`) and upgrade
  (`05-cake-pricing.sql`) both revoke all browser privileges on
  `orders`/`order_items`/`products`/option tables (granting SELECT only) and
  revoke `create_order` execution from PUBLIC/anon/authenticated, so browser
  sessions cannot bypass pricing or payment-state transitions.
- **Copy alignment**: removed the unsupported deposit-or-full promise and
  hard-coded 70% wording; the custom cake seed `price_note` is NULL; the
  "3+ tiers" label is "3 tiers"; policies include changes/cancellations terms;
  checkout and confirmation pages no longer describe unverified orders as
  booked, and the confirmation page handles failed/refunded card states.

## Verification state

- `bunx tsc --noEmit` passes.
- Targeted ESLint on all touched files passes.
- `bun run build` (client + SSR + Nitro) passes; only pre-existing
  deprecation/plugin/chunk-size warnings remain.
- Bun assertions pass for the lifecycle maps, stable contract IDs, and
  case-insensitive UUID matching.
- Grep confirms no customer-facing "deposit or full" / "choose to pay in full"
  / "covers your deposit" copy remains; the remaining "in the book" usage is the
  card confirmation page shown only after Stripe confirms payment.
- Independent review found no state-machine or authorization breaches. Residual
  end-to-end gaps: Stripe test-mode event matrix, browser REST denial drills, and
  an upgrade rehearsal on a copy of a legacy database.

## Known operational notes

- Rerunning `02-data.sql` restores seeded prices/payment rules and rebuilds the
  custom-cake and cupcake option groups, replacing admin edits to those records
  (now warned in `deploy/DEPLOYMENT.md`). Orders and snapshots are untouched.
- Repository-wide `bun run lint` still fails on pre-existing Prettier errors in
  untouched/generated files; targeted changed-file lint is clean.

## Supabase deployment - DONE (fresh install)- **Project**: `wendys-admin` (ref `rrgusprzsfdmlzsnjixz`, org `sleekfash`,
  region `ca-central-1`, ACTIVE_HEALTHY). It was empty, so the **fresh-install
  path** was used: `01-schema.sql` → `02-data.sql` → `03-storage.sql` →
  `04-admin-user.sql`, all applied via the session pooler (postgres.js) with the
  user-supplied database password (local file only, never in chat).
- **Admin login**: `admin@wendysbakehouse.ca` created via the GoTrue admin API,
  granted the `admin` role by `04-admin-user.sql`. Password generated locally
  and stored in `.env` (`ADMIN_PASSWORD`) — save it to a password manager.
- **Verified on the live project**: 11 products (canonical cake = deposit 70%,
  $70 base), 5 categories, 10 option groups, 48 choices, 2 delivery zones
  ($30/$35), `settings.delivery_mode = fixed_zones`, RLS enabled on all tables,
  browser roles SELECT-only on orders/order_items/products/options,
  `create_order` executable only by service_role, and the public REST catalogue
  serves available products.
- **`.env` rewritten** for the new project (VITE + server keys + service role).
  The old Lovable `.env` is backed up at
  `C:\Users\HP\AppData\Local\Temp\opencode\.env.lovable-backup`.
- Temp credential files (PAT, DB password, admin password, API keys) were
  deleted after use.
- **Live pricing smoke test passed** (app's own `priceCart` against the new DB):
  8-inch 3-layer cake $250 → $175 due now / $75 balance; + 12-pack cupcakes $60
  in full; mixed basket $310 → $235 due now; Etobicoke delivery +$30; the $130
  buttercream minimum correctly rejects a 6-inch 1-layer cake.

## GitHub push - DONE

- Workspace changes were overlaid onto a fresh clone of
  `github.com/sleekfash/admin-wendy` and pushed to `main` as commit `3546e7b`
  ("Cake pricing rollout, Stripe hardening, and admin protections", 59 files).
- `.env` was tracked on GitHub with old Lovable values; this commit removes it
  from tracking and `.gitignore` now excludes `.env` / `.env.*`.
- `supabase/config.toml` now points at the new project ref
  `rrgusprzsfdmlzsnjixz`. A staging clone remains at
  `C:\Users\HP\AppData\Local\Temp\opencode\admin-wendy-gh`.

## Remaining (owner actions)

1. **Dashboard toggles**: disable public sign-ups (Authentication → Sign In /
   Providers → "Allow new users to sign up" off). Optionally record the database
   password (`SUPABASE_DB_PASSWORD` in `.env`) in a password manager.
2. **App deployment**: put the `.env` values into Vercel (or wherever the site
   is hosted) and deploy, then smoke-test the menu, a deposit cake order, and
   the admin console at `/admin` (login `admin@wendysbakehouse.ca`).
3. **Stripe (optional)**: if card payments are wanted, add the three webhook
   events per `deploy/DEPLOYMENT.md` Part 6 and add the two `STRIPE_*` keys.
4. No `05-cake-pricing.sql` was needed (fresh install, not an upgrade).

## Environment notes

- Bun executable: `C:\Users\HP\AppData\Local\Temp\opencode\bun\bin\bun.exe`
- Git was not available on `PATH` during earlier work.
- Runtime variables are documented in `.env.example`.
