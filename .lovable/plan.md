# Finish the build: real menu data, option pricing, delivery setup, verified order

The remix wiped all business data — the site currently has no categories, products, prices, options, shop settings or admin account, which is why the menu page looks empty. The code for pricing, checkout and the admin console is already in place. This plan fills the data back in, closes the remaining admin gaps, retires the old quote-based ordering page, and finishes with a real test order checked in the admin console.

## Stage 1 — Put the real menu and prices back

Seed the catalogue with the ten cake photos already in the project and the agreed CAD prices:

- Cake loaves — $28 (9cm x 4cm x 3cm)
- Meat pie pack — $28 for 12 | Chicken pie pack — $28 for 12
- Scotch eggs — $26 for 6 | Sausage rolls — $25 for 12
- Samosa — $25 for 20 | Spring rolls — $25 for 20
- Small chops package (with barbecued chicken) — $28
- Cocktail drinks — $25
- Tiered celebration cake — from $320 with a $100 deposit to hold the date

Every price stays fully editable in the admin console, as agreed. Categories, lead times, pack sizes and shop settings (WhatsApp number, bank transfer details as clearly-marked placeholders) are seeded too.

## Stage 2 — Cake size and finish options

Add the size/finish choices for tiered cakes with their real price differences (for example 8 inch +$30, 10 inch +$60) so the total updates as the customer chooses, and build the missing admin screen for managing those option groups and choices: add, rename, set price difference, mark required, mark sold out.

## Stage 3 — Payment rules in the admin editor

Make the payment rule an explicit choice when adding or editing a product — pay in full, or take a deposit — with validation so a product can't go on sale with an incomplete price setup. This closes the old defect where a deposit amount was entered but never actually applied.

## Stage 4 — Delivery setup and checkout totals

Add the delivery section to admin settings: choose pickup only, fixed postal-code zones (with editable zone names, postal prefixes and fees), or distance-based bands. Confirm checkout shows the server-calculated subtotal, delivery fee, total, amount due now and remaining balance, and refuses to guess a fee it can't work out.

## Stage 5 — Retire the old quote page

The `/order` enquiry page still promises "a firm quote within 24 hours" and "Delivery (quoted)", which now contradicts real prices at checkout. It becomes a short custom-cake enquiry page for bespoke work only, with all pricing language removed and clear links to the menu and checkout. Remaining "DM for price" and quote wording elsewhere is cleaned up. Past quote-era orders in the database are untouched.

## Stage 6 — Place a real order and verify it

Create the admin account (admin@wendysbakehouse.ca), then place a genuine bank-transfer order through checkout with a payment slip attached, and confirm in the admin console that it appears with the correct reference, saved item prices, delivery snapshot, amount due, payment state and viewable slip.

## Technical notes

- Data is seeded through a migration with literal INSERTs (categories, products, option groups/choices, delivery zones, settings singleton); product imagery reuses the existing project assets.
- `src/lib/pricing.server.ts` remains the single authoritative calculation path; no client-supplied money is trusted.
- New admin UI extends `AdminProducts` / `AdminSettings` plus new server functions in `admin.functions.ts` for option groups, choices and delivery zones; existing category/product/image behaviour is preserved.
- Order creation keeps using the transactional `create_order` RPC with item- and order-level snapshots, so admin history never re-derives money from current catalogue prices.
- Verification uses a scripted browser pass against the running app, plus database reads of the created order and its items.
