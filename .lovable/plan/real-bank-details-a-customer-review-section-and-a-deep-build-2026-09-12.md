# Real bank details, a customer-review section, and a deep build + security audit

Three pieces of work: put the customer-review graphic on the site, replace the placeholder bank details with the real ones, and run a thorough review of the whole build followed by hands-on security testing that goes beyond the automated scan.

## 1. Customer review section on the home page

The home page currently runs: hero, "Two collections, one kitchen", clear-pricing block, "Four steps, one conversation", "Most-ordered this season". There is no social-proof section anywhere on the site today.

Add a review section between "Four steps, one conversation" and "Most-ordered this season" — proof lands right before the products people buy.

- The uploaded graphic is shown as the section image, with a short heading ("What customers say") and the two quoted comments alongside it as real selectable text, so search engines and screen readers can read them.
- The image is uploaded to the project's image hosting rather than dropped into the codebase, matching how the cake photos are handled.
- It is one square-ish image; on a phone it stacks above the text, on a desktop it sits beside it.

## 2. Real bank details

Set in shop settings, so checkout transfer instructions and the order confirmation show:

- Bank name: Wends bakery
- Account number: 0011223344
- Account name stays "Wendy's Bakehouse"; the transfer note stays "Use your order reference as the transfer description."

These stay fully editable in admin Settings. Placeholder wording ("Bank name pending", "placeholder — update in admin") disappears.

## 3. Deep build review

A read-through of every part of the app against what it is meant to do, with findings reported honestly rather than a pass-mark:

- Menu, product pages, basket, checkout, confirmation.
- The single server-side money calculation: prices, options, pack sizes, deposits, delivery fees, totals, amount due, balance.
- Order saving and the frozen copy of prices kept with each order.
- The whole admin area: dashboard, orders, payment verification, products, options, categories, settings.
- Sign-in, admin-only access, image serving, and page titles/descriptions.
- Every earlier claim made in this conversation is re-checked against the actual code and database, and anything that does not hold up is listed plainly.

## 4. Advanced security testing

Beyond the automated scan, active testing against the running app:

- Try to read and write every database table as a signed-out visitor and as an ordinary signed-in customer — orders, order items, settings, roles, delivery zones, products.
- Attempt to reach admin-only actions (edit products, change settings, change order status, verify payments) without the admin role, including calling the server actions directly rather than through the buttons.
- Attempt to read other people's orders and payment slips, and to fetch a slip or product image by guessing its path.
- Try to force the price: tampered prices, negative or huge quantities, invalid option choices, options belonging to another product, a deposit larger than the price, an unserved postal code, and a swapped-in cheaper product at the final submit step.
- Check file upload handling on payment slips: file type, size, and where the file can be written.
- Check that private keys and internal details never reach the browser, and that error messages do not leak internals.
- Re-run the automated scan and the dependency check at the end.

Anything exploitable is fixed in the same pass; anything that needs your decision is brought back to you.

## Technical notes

- Review image via `lovable-assets` pointer in `src/assets`, imported into a new section in `src/routes/index.tsx`; quotes as real markup, `SmartImage` for the graphic.
- Bank fields updated with a data-only SQL update on the `settings` singleton (no schema change).
- Audit covers `src/lib/pricing.server.ts`, `orders.functions.ts`, `admin.functions.ts`, `catalog.functions.ts`, `shop.ts`, `cart.tsx`, checkout/admin components, `_authenticated` gate, and `api/public/*` routes.
- Penetration pass: scripted Playwright flows plus direct `fetch` calls to server functions and public API routes with anon, customer, and admin tokens; RLS probes with the publishable key; `supabase--linter` and dependency scan re-run at the end.
- No schema or pricing-logic changes unless a confirmed vulnerability requires one; each fix reported with what it closed.
