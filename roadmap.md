# Roadmap

- [x] Stage 1 — Real prices seeded (loaves, pies, small chops, tiered cakes), pricing page rewritten, quote wording removed
- [x] Stage 2 — Structured option groups/choices with stable keys and price deltas + admin editor
- [x] Stage 3 — Explicit payment rule (full/deposit) with validation
- [x] Stage 4 — Delivery modes, server-authoritative checkout totals, immutable order snapshots
- [x] Stage 5 — Real bank-transfer order placed and verified in /admin with slip
- [x] Customer review artwork on the home page; real bank name and account number saved
- [x] Deep build audit + penetration pass (anon/customer database probes, price-tampering tests, slip upload hardening)
- [x] Self-hosting handover (Option 3): database structure/data export, storage + admin SQL, `.env.example`, `vercel.json`, portable Google Maps call, and step-by-step guide in `deploy/DEPLOYMENT.md`
- [x] Deployment doc corrections (live URL + repo) and reusable prompts in `docs/deployment/`
- [x] Stripe card payments: server-priced checkout session, signed webhook, confirmation page, admin card details
- [ ] Save the Stripe secret key (and webhook secret) to switch the card option on — blocked on your Stripe account

## Stripe webhooks (2026-09-16)
- [x] STRIPE_WEBHOOK_SECRET saved via secure form
- [x] Webhook refuses unsigned/forged calls (400, tested on preview)
- [x] Amount-mismatch defense added (paid amount must equal server-calculated due-now, CAD)
- [x] E2E test order WB-26450636 paid with Stripe test card ($320 cake, $100 deposit charged, $220 balance)
- [ ] USER: click Publish/Update so the live site picks up the webhook secret (currently 503 on admin-wendy.lovable.app)
- [ ] After publish: resend the failed webhook from Stripe dashboard (or place a new test order) and confirm order flips to paid in /admin
- [ ] Domain switch (Stage 2 of approved plan) — waits on domain registration
