# Cake pricing, policies, and current booking month

## Goal

Make Wendy’s Bakehouse cake-focused, rebuild the empty remixed catalogue with the supplied price guide, calculate custom-cake deposits correctly, and publish the complete ordering policies in clear customer-facing places.

## 1. Restore a cake-focused catalogue

- Repopulate the empty remixed backend with only the retained collections: custom cakes, cake loaves, cupcakes, and drinks (do not generate pictures, rather pause and request).
- Categorize and seperate the pastries: meat and chicken pies, Scotch eggs, sausage rolls, samosa, spring rolls, and small chops. Put them under a seperate menu name it pastries, rename other items like, "cakes and treats" if recommended, rename "pricing" to "menu & pricing", remove "contact" entirely).
- Remove savoury products as a selling point from the homepage.
- Replace the homepage’s “both sides of the table” message with a cake-focused benefit: custom design choices with every price shown upfront.
- Remove claims that contradict the new offering, including sculpted models and figures.

## 2. Correct cake and cupcake pricing

Publish the supplied base-cake matrix exactly (include pricing for other category products as provided (pastries):

| Size    | 1 layer | 2 layers | 3 layers |
| ------- | ------: | -------: | -------: |
| 6 inch  |     $70 |     $130 |     $180 |
| 8 inch  |    $100 |     $180 |     $250 |
| 10 inch |    $150 |     $250 |     $320 |

- Represent each size/layer combination with a stable choice and authoritative backend price so checkout cannot accept a browser-supplied amount.
- Set cupcakes to 6 for $35, 12 for $60, and 20 for $110.
- Keep cake loaves and drinks available at their existing published prices unless a supplied figure replaces them.
- Explain tiered cakes as the sum of each tier’s base price plus the tiering fee, matching the guide.

## 3. Add the complete add-on price list

Add and display these cake extras (including pastries):

- Simple edible topper — $25
- Custom edible topper — $50
- Fondant covering — $100 per tier
- Fondant letters or small detail — $10
- Special colours — $20
- Bows, cherries, edible glitter, pearls, or crowns — $5 each
- Detailed piping work — $10
- Edible printed image — $20
- Tiering fee — $40 for 2 tiers; $60 for 3 tiers
- Rush order under 48 hours — $20
- Local Etobicoke delivery — $30
- GTA delivery — $35

Add a prominent note that fondant sculpted figures and models are not offered. Model independently combinable add-ons so customers can select more than one and every selected amount is included in the server-calculated order snapshot.

## 4. Enforce the 70% custom-cake deposit.

The implemented v1 checkout uses the product's configured payment rule. It does
not offer a customer-selected full-payment override for a deposit product.

- Replace fixed-dollar custom-cake deposits with a 70% rule calculated from the complete custom-cake line price, including selected paid add-ons.
- Keep cupcakes, loaves, drinks, and other non-custom items payable in full (include pastries).
- Charge delivery in full alongside the amount due now.
- Round to whole cents, store the percentage/payment rule in immutable order snapshots, and show total, due now, and remaining balance consistently in product selection, basket, checkout, Stripe, bank transfer, and admin order history.
- Update the admin product editor so staff select “70% custom-cake deposit” rather than entering a contradictory fixed amount.

## 5. Publish the full policies

Create a dedicated Policies page and link it from the footer. Also surface the key payment, notice, cancellation, pickup, and delivery terms during product selection and checkout:

- Minimum order: $130 buttercream; $280 fondant
- Custom cakes require 2 weeks’ notice
- Orders are confirmed only after the required product-level payment
- Balance is due before pickup or delivery
- All payments are non-refundable
- Pickup is in Etobicoke
- Delivery is $30 within Etobicoke and $35 elsewhere within the GTA
- Pickup/delivery time changes require 12 hours’ notice
- Size, design, flavour, or add-on changes require 1 week’s notice before the event

Require customers to acknowledge the policies before placing an order or starting card payment. Keep the policy text visible rather than hiding it behind “available on request.”

## 6. Prevent the booking banner from going stale

Replace the hard-coded August value with the current month generated in the Toronto time zone. Use the same source everywhere “Now booking” appears, including the top banner, homepage (make a visible "back to bakery").

## 7. Data and delivery consistency

- Configure fixed delivery areas for Etobicoke ($30) and the wider GTA ($35), replacing the incomplete distance configuration currently stored in the seed.
- Update both the live remixed backend and the reusable deployment seed so future remixes receive identical prices, products, options, policies, and delivery fees.
- Preserve existing historical orders and their saved product and financial snapshots.

## 8. Verification

- Check desktop and mobile views for homepage, Cakes & treats, product details, pricing, policies, basket, checkout, and admin products/settings/orders (same for other categories.
- Verify every listed price and add-on against the supplied guide.
- Test a custom-cake order with multiple add-ons and delivery, confirming the 70% cake deposit, full delivery charge, balance, Stripe/bank-transfer amount, and admin snapshot all agree.
- Confirm current-month text is consistent and no “August,” “DM for price,” “quoted,” meat/poultry selling copy, or sculpted-model offer remains customer-facing (generate an exciting and compelling replacement phrase).

## Technical notes

- A schema update will replace fixed `deposit_cents` behavior with a percentage-capable payment rule while retaining legacy fields for old order compatibility.
- The existing one-choice-per-group model will be extended for independently combinable add-ons, with stable identifiers and server-side validation.
- Catalogue and configuration changes will be applied as data updates/upserts; no historical orders will be deleted or rewritten.
- The uploaded price-guide image is a content reference only; its prices and rules will be implemented as accessible site content rather than embedding the flyer itself.
