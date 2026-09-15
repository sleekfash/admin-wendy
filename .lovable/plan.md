# Finish Stripe webhooks + domain registration & switch

## Stage 1 — Turn on payment notifications (Stripe webhook)

Stripe tells the site when a card payment succeeds or expires. Without it, paid orders stay "pending".

1. You create the webhook in your Stripe dashboard (Developers → Webhooks → Add endpoint):
   - URL: `https://admin-wendy.lovable.app/api/public/stripe-webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`
   - Copy the signing secret (`whsec_...`)
2. I open the secure form and save it as `STRIPE_WEBHOOK_SECRET`. You paste it into the form — it never goes through the chat.
3. End-to-end test: place a real test order, pay with a Stripe test card, confirm the order flips to **paid** in /admin with the Stripe reference and paid time — proving the webhook landed, not just the redirect.
4. Adversarial checks on the live webhook:
   - Fake/unsigned webhook call → refused (400)
   - Replayed webhook → no double-processing
   - Tampered amount → refused (server re-checks against its own calculation)
   - Expired session → order marked expired, not paid

After this stage, card payments are fully live on the current site.

## Stage 2 — Register your domain and switch over

Done when you've registered the domain (Namecheap) and are ready to move. Recommended route stays **Option 3: managed database + Vercel hosting** (the cPanel static route can't run your checkout/admin server code).

1. **Vercel deploy** — connect the GitHub repo (`sleekfash/admin-wendy`) to Vercel, set the environment variables from `.env.example` (database keys, Stripe keys, Google Maps key).
2. **Database** — your managed Supabase project: run the four SQL files in order (`01-schema.sql`, `02-data.sql`, `03-storage.sql`, `04-admin-user.sql`), create the admin login, turn sign-ups off.
3. **Pre-switch checks** — on the Vercel preview address: shop loads, checkout prices correctly, WhatsApp/bank-transfer/card all work, admin login works, receipts upload.
4. **Domain** — in Namecheap DNS: `A @ → 76.76.21.21`, `CNAME www → cname.vercel-dns.com`; add the domain in Vercel.
5. **Update Stripe** — add a second webhook endpoint pointing at the new domain (same two events), save its new `whsec_` secret in Vercel's environment. The old endpoint stays until the switch is proven, then removed.
6. **Update hard-coded addresses** — webhook URL references in `deploy/DEPLOYMENT.md`, and any place referencing `admin-wendy.lovable.app`.
7. **Cutover verification** — place a real £/$0-style test (or a small real card charge refunded after) on the live domain; confirm order appears in /admin as paid.
8. Current Lovable site stays live and untouched until step 7 passes — zero downtime, easy rollback (just point DNS back).

## Notes / decisions

- Nothing changes on the live site until the domain switch is verified.
- The Lovable-hosted copy and the self-hosted copy share the same Stripe account; only the webhook URL and secrets differ per environment.
- Paystack stays out of scope (agreed Stripe only).
- Stage 1 works today on the current address — you don't need to wait for the domain.
