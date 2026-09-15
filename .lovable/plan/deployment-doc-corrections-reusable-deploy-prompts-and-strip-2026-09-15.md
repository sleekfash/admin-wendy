# Deployment doc corrections, reusable deploy prompts, and Stripe card payments

## 1. Correct the deployment options document

In `.lovable/plan/deployment-options-for-wendy-s-bakehouse-2026-09-12.md`:

- Replace the old published address `https://discovery-bloom-kit.lovable.app` with `https://admin-wendy.lovable.app/`.
- Add the code repository `https://github.com/sleekfash/admin-wendy.git` to the current-state section, so every option can reference it.
- Same two corrections applied in `deploy/DEPLOYMENT.md`, which currently tells you to connect GitHub without naming the repository.

## 2. Two reusable prompt files

New folder `docs/deployment/`:

- `PROMPT-OPTION-2-CPANEL.md` — reusable instructions for putting the shop on the Namecheap cPanel shared host, following Namecheap's own guide: create the domain/subdomain, upload the built app, then either serve a static build from `public_html` with an `.htaccess` rewrite, or run it as a Node.js app through cPanel's "Setup Node.js App" (Passenger) with the startup file and environment variables set there.
- `PROMPT-OPTION-3-VERCEL.md` — reusable instructions for managed database + Vercel, distilled from the work already done in `deploy/`.

Each file is written so it can be pasted into a fresh session as a standalone brief: goal, prerequisites, exact steps, environment variables, verification checklist, and rollback.

## 3. Which option to proceed with — and why

Recommendation: **Option 3 (managed database + Vercel)**, keep cPanel only as a fallback.

Reasoning from Namecheap's guide:

- The guide's static path (build locally, upload `dist`, add an `.htaccess` rewrite) suits a plain single-page site. This shop is not that: prices, checkout totals, orders and the admin console all run through server code, so a static upload would break checkout.
- The guide's Node.js path does exist on Namecheap shared hosting, but it runs the app under Passenger with a fixed Node version, limited memory, no build step on the server, and a manual restart after each change. Every future edit becomes an upload-and-restart chore.
- Vercel builds straight from the GitHub repository, so edits go live by themselves, and it runs the same server code the app is written for. Free tier covers a shop this size.
- Stripe needs a reliable public webhook address; that is routine on Vercel and awkward on shared hosting.

## 4. Stripe card payments

Confirmed with you: Stripe only, prices stay in CAD, and card payment follows the same money rules as bank transfer — full amount, or the deposit on tiered cakes.

- A third payment choice, "Pay by card", joins WhatsApp and bank transfer at checkout.
- The amount charged is recalculated on the server at the moment of payment from the same pricing engine that already guards bank-transfer orders. The browser cannot influence the amount.
- Paying creates the order first in a pending-payment state, then sends the customer to Stripe's hosted payment page. On success they return to a confirmation page.
- Stripe notifies the app directly when a payment succeeds or fails, and that notification is what marks the order paid — not the customer's return trip. So a closed browser tab cannot lose a paid order.
- In the admin console, card orders show as paid automatically with the Stripe reference, no slip to verify. Deposit orders show the balance still owed.
- Refunds stay in the Stripe dashboard; the admin console links to the transaction.

I will ask you to save your Stripe secret key through the secure key form when we get to that step. Until the key is saved, the card option stays hidden and bank transfer and WhatsApp keep working exactly as today.

### Technical notes

- `src/lib/payments.functions.ts`: authenticated-free server fn that re-prices the cart via `priceCart`, creates the order through the existing `create_order` RPC with `payment_status = 'pending'` and `payment_method = 'card'`, then creates a Stripe Checkout Session for the server-computed due-now amount in CAD and returns the redirect URL.
- `src/routes/api/public/stripe-webhook.ts`: server route verifying the Stripe signature with `STRIPE_WEBHOOK_SECRET` before processing; handles `checkout.session.completed` and `checkout.session.expired`, updating the order via the service-role client. Idempotent on the session id.
- Migration: add `payment_method`, `stripe_session_id`, `stripe_payment_intent_id` to orders, plus a unique index on the session id; GRANTs and RLS unchanged in shape (admin-only reads).
- `src/routes/checkout.tsx`: third tab; hidden when a `stripeEnabled` flag returned from a public server fn is false.
- New route `src/routes/order-confirmed.tsx` polls order status by reference until the webhook lands.
- Secrets: `STRIPE_SECRET_KEY` (via the Stripe key form), `STRIPE_WEBHOOK_SECRET` (created in the Stripe dashboard after the webhook URL exists). Both also need adding to `.env.example` and the Vercel variable list in the deployment guide.
- Adversarial checks to run: tampered amounts, replayed webhooks, unsigned webhooks, session for a cancelled order.
