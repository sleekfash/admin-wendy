# PLAN — Cake pricing, 70% deposits, policies, and booking month

> Handoff brief. **Read this file and `AGENTS.md` before touching code.**
> This is a fully-specified execution plan for the "Wendy's Bakehouse" cake-focused
> repositioning. It was produced after a full audit of the codebase + schema and
> contains every decision already made. Execute stage by stage; do not re-derive
> the pricing model.

## 0. Goal (one paragraph)

Make Wendy's Bakehouse **cake-first**: rebuild the catalogue as _custom cakes,
cake loaves, cupcakes, drinks_ + a separate _pastries_ collection; publish a
size×layer base-price matrix and a flat add-on menu with every price shown
upfront; replace fixed-dollar deposits with a **configurable percentage deposit
(default 70%)** computed server-side; publish full ordering policies (with
checkout acknowledgement); make the "Now booking" month dynamic (Toronto TZ);
and set fixed delivery zones ($30 Etobicoke / $35 GTA). No historical orders may
be deleted or rewritten.

## 1. Decisions already made (do not revisit)

1. **Deposit**: configurable percentage stored per product as `deposit_percent`
   (int), **default 70** on custom cakes. Non-custom items stay "pay in full".
   `deposit_cents` / `pricing_mode` are retained as legacy fields for old-order
   compatibility only. In v1 this is a product-level payment rule: customers do
   not choose a full-payment override for a deposit product.
2. **Layers vs tiers** (owner-confirmed):
   - **Layer** = one sponge of a size. "2/3 layers" = the same-size sponge
     stacked on itself (the matrix _columns_).
   - **Tier** = a full 3-layer cake of a _different_ size, stacked to form a
     stepped cake. A tiered cake = **sum of each tier's 3-layer price + tiering
     fee** ($40 for 2 tiers, $60 for 3).
3. **Minimum order** ($130 buttercream / $280 fondant): enforced **server-side
   as a per-custom-cake floor**. Fondant minimum applies when the "fondant
   covering" add-on is selected; otherwise buttercream minimum. Matrix stays
   as-is (its $70 floor is intentionally below the minimum).
4. **Delivery**: checkout **fixed zones only** — Etobicoke $30 / GTA $35.
   Delivery is **not** a product add-on (removes the double-charge risk).
5. **Contact**: remove nav/footer links and delete the `/contact` route; fold
   its FAQ/social/pickup content into the new **Policies** page + footer.
6. **Nav**: `Pricing` → **`Menu & pricing`**; keep `Cakes & treats`; add
   **`Pastries`**; add **`Policies`** (footer); remove `Contact`.
7. Sculpted fondant figures/models are **not offered** — add a prominent note.

## 2. The pricing model (the subtle part — do not re-derive)

### Base cake matrix → additive deltas

Anchor the configurable **custom celebration cake** at `price_cents = 7000`
($70 = 6"×1-layer floor) and encode every size×layer combo as a **single
`price_delta_cents` choice** (the existing option model is additive deltas):

| Choice (size × layers) | Price | `price_delta_cents` |
| ---------------------- | ----- | ------------------- |
| 6" × 1                 | $70   | 0                   |
| 6" × 2                 | $130  | 6000                |
| 6" × 3                 | $180  | 11000               |
| 8" × 1                 | $100  | 3000                |
| 8" × 2                 | $180  | 11000               |
| 8" × 3                 | $250  | 18000               |
| 10" × 1                | $150  | 8000                |
| 10" × 2                | $250  | 18000               |
| 10" × 3                | $320  | 25000               |

- One required single-select group `size-layers` holds these 9 choices.
- The 8-inch deltas above were owner-confirmed during implementation so the
  additive totals match the published $180 / $250 prices.
- **3-layer price per size** (used as the per-tier base when stacking tiers):
  6" = $180, 8" = $250, 10" = $320.

### Add-ons (multi-select, flat fixed prices in cents)

| Add-on                                      | cents |
| ------------------------------------------- | ----- |
| Simple edible topper                        | 2500  |
| Custom edible topper                        | 5000  |
| Fondant covering — per tier                 | 10000 |
| Fondant letters / small detail              | 1000  |
| Special colours                             | 2000  |
| Bows / cherries / glitter / pearls / crowns | 500   |
| Detailed piping work                        | 1000  |
| Edible printed image                        | 2000  |
| Tiering fee — 2 tiers                       | 4000  |
| Tiering fee — 3 tiers                       | 6000  |
| Rush order (under 48h)                      | 2000  |

- **Extra tiers** are represented as explicit multi-select choices: "Add a 2nd
  tier — 6 inch" (+18000), "8 inch" (+25000), "10 inch" (+32000); likewise a
  3rd tier. The tiering-fee add-on is selected separately by the customer.
- "Fondant covering — per tier" = flat $100 × tier count; **v1** exposes it as
  explicit choices ("1 tier +$100", "2 tiers +$200", "3 tiers +$300") to keep
  the engine flat-delta only. (A per-tier auto-derive engine is a later
  enhancement, not v1.)
- Delivery is **excluded** from add-ons (see §1.4).

### Other products

- **Cupcakes**: base $35 (3500), single-select size group: 6 = +0, 12 = +2500,
  20 = +7500 (→ $35 / $60 / $110).
- **Cake loaves**: keep $28. **Drinks**: keep $25. **Pastries** (meat/chicken
  pies $28/12, scotch eggs $26/6, sausage rolls $25/12, samosa $25/20, spring
  rolls $25/20, small chops $28): unchanged prices, moved under a new
  `pastries` category.

### Deposit math (server-side only)

- Deposit line: `line_due_now_cents = Math.round(line_total_cents * deposit_percent / 100)`.
- Non-deposit lines: `line_due_now_cents = line_total_cents`.
- Delivery: added **in full** to `due_now_cents` (already happens in `priceCart`).
- `balance_cents = total_cents - due_now_cents` (already computed).
- `deposit_percent` must be stored in the immutable order/line snapshot.

## 3. Schema migration (additive only)

New migration (add to `deploy/supabase/01-schema.sql` and `supabase/01-schema.sql`,
and apply to the live DB):

1. `ALTER TABLE public.products ADD COLUMN deposit_percent integer;`
2. `ALTER TABLE public.product_option_groups ADD COLUMN allow_multiple boolean DEFAULT false NOT NULL;`
3. `ALTER TABLE public.order_items ADD COLUMN deposit_percent integer;`
4. `ALTER TABLE public.orders ADD COLUMN deposit_percent integer;`
5. **Replace** the `products_deposit_within_price` CHECK constraint with logic
   that does not require `deposit_cents` when `deposit_percent` is set.
   (Current constraint at 01-schema.sql:352 forces `deposit_cents <= price_cents`
   whenever `payment_rule = 'deposit'` — it will break percentage deposits.)
6. Extend `create_order(jsonb, jsonb)` (01-schema.sql:74) to accept + persist
   `deposit_percent` on both `orders` and `order_items`.

Keep `deposit_cents`, `pricing_mode`, and `payment_rule` columns untouched for
legacy-order reads.

## 4. Staged execution plan (exact files)

### Stage 1 — pricing engine

- `src/lib/pricing.server.ts`:
  - Support `allow_multiple` groups: in `priceLines` (lines ~157-194), stop
    rejecting duplicate `group_key` for multi-select groups; `required` means
    "≥1 selection".
  - Percentage deposit: compute `line_due_now_cents` from `deposit_percent`
    (fall back to `deposit_cents` for legacy rows).
  - Add the custom-cake minimum-order check (buttercream $130 / fondant $280)
    in `priceCart`/`priceOrderBasket`; throw `PricingError` when under minimum.
- `src/lib/order-create.server.ts`: pass `deposit_percent` into `create_order`
  and line snapshots; include it in `toLines`.
- `src/lib/order-schemas.ts`: `itemSchema.choices` already supports multiple
  choices per group (array) — no change needed, just confirm engine accepts it.

### Stage 2 — admin server functions

- `src/lib/admin.functions.ts` `productSchema` (~212-267): add `deposit_percent`
  (int, 1–100, nullable); when `payment_rule === 'deposit'`, require
  `deposit_percent` instead of a fixed `deposit_cents`; drop the
  `deposit_cents <= price_cents` superRefine in favour of the percentage rule.
- `src/lib/admin.functions.ts` `adminSaveProduct`: persist `deposit_percent`.
- `src/lib/admin.functions.ts` option-group save: persist `allow_multiple`.

### Stage 3 — data (live + seed, keep in sync)

- Rewrite `deploy/supabase/02-data.sql` and `supabase/02-data.sql` identically:
  - Categories: `custom cakes`, `cake loaves`, `cupcakes` (new), `drinks`,
    `pastries` (rename from "Small chops & party food").
  - One configurable **custom celebration cake** (`deposit_percent = 70`) with
    the §2 size×layers group + add-on groups + extra-tier choices.
  - Cupcakes, loaves, drinks, pastries per §2.
  - Delivery zones: Etobicoke `{M8,M9}` = 3000, GTA
    `{M1,M2,M3,M4,M5,M6,M7,L4,L5,L6}` = 3500 (best-effort GTA boundary — flag
    to owner to confirm).
  - `settings`: `delivery_mode = 'fixed_zones'` (was `distance`); remove the
    stale distance band.
  - Remove "models and figures" copy; add "sculpted figures not offered" note.
- Update `deploy/DEPLOYMENT.md` delivery-zone wording if it mentions distance
  fees.

### Stage 4 — storefront UI

- `src/components/site/SiteHeader.tsx` + `SiteFooter.tsx`: nav labels (§1.6),
  add Policies link, drop Contact.
- `src/routes/index.tsx`: replace "Both sides of the table" (line ~256) and
  savoury hero copy with the cake benefit; fix `DESC`.
- `src/routes/menu.index.tsx` (line ~90) + `menu.$slug.tsx` (lines ~75, ~143):
  strip "quote"/"sculpted" wording.
- `src/components/site/AddToBasket.tsx`: render the size×layers matrix +
  multi-select add-ons; show the 70% deposit estimate + balance client-side
  (authoritative total still server-side via `previewCart`).
- `src/lib/cart.tsx` `lineDueCents` (lines 32-40): account for percentage
  deposit in the client estimate.
- `src/routes/checkout.tsx`: add a required policies-acknowledgement checkbox
  (all methods), surface the full terms, keep due-now/balance rendering.
- New `src/routes/policies.tsx` (policies + FAQ + social + pickup).

### Stage 5 — admin UI

- `src/components/admin/AdminProducts.tsx`: replace the fixed "Deposit (CAD)"
  input (~349-356) with a "70% custom-cake deposit" selector driven by
  `deposit_percent`.
- `src/components/admin/AdminProductOptions.tsx`: add an "Allow multiple"
  toggle per group (for add-ons).

### Stage 6 — booking month + cleanup

- Add one helper, e.g. in `src/data/catalog.ts` or `src/lib/utils.ts`:
  `bookingMonth = Intl.DateTimeFormat('en-CA', { month: 'long', timeZone: 'America/Toronto' }).format(new Date())`.
  Use it in `SiteHeader.tsx` (~25), `index.tsx` (~62), `contact.tsx` (~115) /
  wherever "Now booking" appears. Note: it must resolve identically on server
  and client to avoid hydration mismatch.
- `src/data/catalog.ts`: remove `bookingMonth: "August"`, delete dead
  `PRODUCTS`/`PRICE_BANDS`, migrate `FAQS` into policy content (keep `BUSINESS`).

## 5. Verification

```sh
bunx tsc --noEmit
bun run build
bun run lint
```

- Seed a fresh Supabase: run `01-schema → 02-data → 03-storage → 04-admin-user`
  in order.
- Place a multi-add-on custom-cake order with delivery; confirm: 70% deposit
  (rounded), full delivery, balance, Stripe/bank amounts, and the admin
  snapshot all agree; confirm the minimum-order refusal fires.
- Grep customer-facing copy for banned strings: `August`, `DM for price`,
  `quoted`, `sculpted`, `figures`, and any meat/poultry-as-headline copy.

## 6. Critical gotchas (from `AGENTS.md`, applied here)

- Money is always **integer cents**, priced only in `src/lib/pricing.server.ts`.
  Never compute prices client-side; the browser must never influence an amount.
- Server-only modules (`.server.ts`) must be **dynamically imported** inside
  handlers; `*.functions.ts` and route files ship to the client bundle.
- `src/routes/routeTree.gen.ts` is generated — never edit by hand.
- `src/start.ts` re-adds CSRF + error middleware — do not delete.
- `src/integrations/supabase/*` is auto-generated — do not edit.
- Admin roles resolved server-side via `is_admin` / `is_staff` RPCs — never
  trust the browser.
- Drizzle is not used for schema; `drizzle/schema.ts` is intentionally blank.
- Lovable: never rewrite published git history (no force-push/rebase/amend).

## 7. Ownership / confirm-later items

- **GTA delivery zone boundary**: the postal-prefix list in §3 is best-effort;
  confirm the exact "wider GTA" prefix set with the owner.
- **Tiering fee + fondant "per tier"**: v1 uses explicit flat add-on choices;
  if the owner wants auto-derived per-tier pricing, that is a follow-up engine
  change, not part of v1.
- **Minimum-order rule**: applied to custom-cake lines only, exclusive of
  delivery; confirm this scoping with the owner if ambiguous.
