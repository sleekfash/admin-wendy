-- Wendy's Bakehouse catalogue + settings seed.
-- Fresh install: run after 01-schema.sql.
-- Existing install: run 05-cake-pricing.sql first, then this file.
-- Idempotent by stable IDs; historical orders and order-item snapshots are untouched.

BEGIN;

INSERT INTO public.categories (
  id, slug, name, blurb, image_key, image_url, sort_order, visible
) VALUES
  (
    '382b2742-6d74-4a4c-9a1f-dabaf5755a2d', 'celebration-cakes', 'Custom cakes',
    'Custom buttercream and fondant cakes with every base size and design extra priced upfront.',
    'hero-cake', NULL, 1, true
  ),
  (
    'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d501', 'cupcakes', 'Cupcakes',
    'Fresh cupcakes in boxes of 6, 12 or 20.',
    'cupcakes', NULL, 2, true
  ),
  (
    '696773f9-538d-464b-becb-02989fadb3fd', 'cake-loaves', 'Cake loaves',
    'Rich butter and fruit loaves, baked fresh and packed for gifting.',
    'cake-loaves', NULL, 3, true
  ),
  (
    '6044569e-55de-4f3a-a13c-3db4db2a6b3c', 'drinks', 'Drinks',
    'Bottled party drinks mixed to order for your celebration.',
    NULL, NULL, 4, true
  ),
  (
    'c1a00f1c-148e-4241-a67d-b8df36f6ec86', 'pastries', 'Pastries',
    'Meat pies, chicken pies, Scotch eggs, sausage rolls, samosa, spring rolls and small chops.',
    'meat-pies', NULL, 5, true
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  blurb = EXCLUDED.blurb,
  image_key = EXCLUDED.image_key,
  image_url = EXCLUDED.image_url,
  sort_order = EXCLUDED.sort_order,
  visible = EXCLUDED.visible,
  updated_at = now();

INSERT INTO public.products (
  id, slug, name, category_id, short, description, pricing_mode,
  price_cents, deposit_cents, deposit_percent, price_note, price_band,
  lead_time, serves, image_key, image_url, options, includes,
  available, sort_order, status, payment_rule, pack_size, pack_unit
) VALUES
  (
    '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b', 'tiered-celebration-cake',
    'Custom celebration cake', '382b2742-6d74-4a4c-9a1f-dabaf5755a2d',
    'Base cakes from $70; custom buttercream orders start at $130.',
    'Choose one of nine size-and-layer combinations, then add only the design details you want. Tiered cakes combine full three-layer cakes in different sizes. Fondant sculpted figures and models are not offered.',
    'deposit', 7000, NULL, 70,
    NULL,
    NULL, '2 weeks', 'Varies by size', 'hero-cake',
    NULL,
    '[]', '["Cake board and box", "Chosen base cake", "Itemised design total"]',
    true, 1, 'available', 'deposit', NULL, NULL
  ),
  (
    'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d502', 'cupcakes', 'Cupcakes',
    'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d501',
    '6 for $35, 12 for $60, or 20 for $110.',
    'Piped cupcakes baked to order for birthdays, gifts and dessert tables.',
    'fixed', 3500, NULL, NULL, NULL, NULL, '3 days', NULL,
    'cupcakes', NULL, '[]', '["Presentation box", "Buttercream finish"]',
    true, 2, 'available', 'full', NULL, NULL
  ),
  (
    '80067c7f-4957-4aba-9cf9-e0a778337abf', 'cake-loaf', 'Cake loaf',
    '696773f9-538d-464b-becb-02989fadb3fd',
    '$28 per loaf, 9cm x 4cm x 3cm, boxed.',
    'A dense, buttery loaf baked fresh to order and boxed for gifting. Flavours rotate weekly.',
    'fixed', 2800, NULL, NULL, NULL, NULL, '3 days', '4-6 slices',
    'cake-loaves', NULL, '[]', '["9cm x 4cm x 3cm loaf", "Gift box"]',
    true, 3, 'available', 'full', NULL, NULL
  ),
  (
    '736d1787-0f3e-48f2-a424-550138fd0e1b', 'cocktail-drinks', 'Cocktail drinks',
    '6044569e-55de-4f3a-a13c-3db4db2a6b3c',
    '$25 per bottle, mixed to order.',
    'Bottled party cocktails mixed to order - chapman, zobo punch or a classic rum punch.',
    'fixed', 2500, NULL, NULL, NULL, NULL, '3 days', NULL, NULL,
    NULL,
    '[]', '["750ml bottle"]', true, 4, 'available', 'full', NULL, NULL
  ),
  (
    '9edda639-cc76-49cf-8af3-b5867f0346bf', 'meat-pie-pack', 'Meat pie pack',
    'c1a00f1c-148e-4241-a67d-b8df36f6ec86', '$28 for a pack of 12.',
    'Flaky Nigerian-style meat pies with a seasoned beef and potato filling.',
    'fixed', 2800, NULL, NULL, NULL, NULL, '3 days', NULL, 'meat-pies', NULL,
    '[]', '["12 pies per pack"]', true, 10, 'available', 'full', 12, 'pies'
  ),
  (
    '3bfbe35c-0fd8-4c53-9325-bba29e1ded6f', 'chicken-pie-pack', 'Chicken pie pack',
    'c1a00f1c-148e-4241-a67d-b8df36f6ec86', '$28 for a pack of 12.',
    'Golden chicken pies with a seasoned filling, baked the morning of collection.',
    'fixed', 2800, NULL, NULL, NULL, NULL, '3 days', NULL, 'meat-pies', NULL,
    '[]', '["12 pies per pack"]', true, 11, 'available', 'full', 12, 'pies'
  ),
  (
    '2e9508c8-3e9b-4a84-bb7c-cf4fff8b82c7', 'scotch-eggs', 'Scotch eggs',
    'c1a00f1c-148e-4241-a67d-b8df36f6ec86', '$26 for a pack of 6.',
    'Soft-centred eggs wrapped in seasoned sausage meat and crumbed by hand.',
    'fixed', 2600, NULL, NULL, NULL, NULL, '3 days', NULL, 'meat-pies', NULL,
    '[]', '["6 eggs per pack"]', true, 12, 'available', 'full', 6, 'eggs'
  ),
  (
    '9046ead7-7219-430b-833e-51df115b424c', 'sausage-rolls', 'Sausage rolls',
    'c1a00f1c-148e-4241-a67d-b8df36f6ec86', '$25 for a pack of 12.',
    'Buttery puff pastry rolls with a seasoned sausage filling.',
    'fixed', 2500, NULL, NULL, NULL, NULL, '3 days', NULL, 'meat-pies', NULL,
    '[]', '["12 rolls per pack"]', true, 13, 'available', 'full', 12, 'rolls'
  ),
  (
    '7d913909-4b38-4400-aef3-c8b334bd8fcb', 'samosa', 'Samosa',
    'c1a00f1c-148e-4241-a67d-b8df36f6ec86', '$25 for a pack of 20.',
    'Crisp beef, chicken or vegetable samosa, fried to order.',
    'fixed', 2500, NULL, NULL, NULL, NULL, '3 days', NULL, 'meat-pies', NULL,
    '[]', '["20 pieces per pack"]', true, 14, 'available', 'full', 20, 'pieces'
  ),
  (
    'fada9878-9892-4488-a5a2-b92bc5bd7d7d', 'spring-rolls', 'Spring rolls',
    'c1a00f1c-148e-4241-a67d-b8df36f6ec86', '$25 for a pack of 20.',
    'Light spring rolls fried to order and served with dipping sauce.',
    'fixed', 2500, NULL, NULL, NULL, NULL, '3 days', NULL, 'meat-pies', NULL,
    '[]', '["20 pieces per pack", "Dipping sauce"]', true, 15, 'available', 'full', 20, 'pieces'
  ),
  (
    'c0c91f66-f236-4b92-b6c4-a4531a164f8d', 'small-chops-package', 'Small chops package',
    'c1a00f1c-148e-4241-a67d-b8df36f6ec86', '$28 per package, including barbecued chicken.',
    'A mixed small-chops package with puff puff, samosa, spring rolls and barbecued chicken.',
    'fixed', 2800, NULL, NULL, NULL, NULL, '3 days', '1-2 people', 'meat-pies', NULL,
    '[]', '["Mixed small chops", "Barbecued chicken portion"]',
    true, 16, 'available', 'full', NULL, NULL
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  short = EXCLUDED.short,
  description = EXCLUDED.description,
  pricing_mode = EXCLUDED.pricing_mode,
  price_cents = EXCLUDED.price_cents,
  deposit_cents = EXCLUDED.deposit_cents,
  deposit_percent = EXCLUDED.deposit_percent,
  price_note = EXCLUDED.price_note,
  price_band = EXCLUDED.price_band,
  lead_time = EXCLUDED.lead_time,
  serves = EXCLUDED.serves,
  image_key = EXCLUDED.image_key,
  image_url = EXCLUDED.image_url,
  options = EXCLUDED.options,
  includes = EXCLUDED.includes,
  available = EXCLUDED.available,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status,
  payment_rule = EXCLUDED.payment_rule,
  pack_size = EXCLUDED.pack_size,
  pack_unit = EXCLUDED.pack_unit,
  updated_at = now();

-- Keep old cake rows for order-history foreign keys, but remove them from sale.
UPDATE public.products
SET status = 'archived', available = false, updated_at = now()
WHERE id IN (
  '6f015a12-e88e-4241-9645-cc4e8a4c20e7',
  '2a42edb8-ddc7-426c-9c17-47e6cd842779',
  '9d202fdf-dcc9-487f-a3ea-a5f7331bfd5d'
);

-- Rebuild only the two products whose option model changed. Order snapshots do
-- not reference these rows, so historical orders retain every selected label.
DELETE FROM public.product_option_groups
WHERE product_id IN (
  '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b',
  'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d502'
);

INSERT INTO public.product_option_groups (
  id, product_id, key, label, required, allow_multiple, available, sort_order
) VALUES
  ('30594a40-1fd1-4cca-8f80-280c9d975ec7', '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b', 'size-layers', 'Size and layers', true, false, true, 1),
  ('aab61c6f-909a-416c-b9b3-40647ff36d5f', '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b', 'cake-add-ons', 'Design add-ons', false, true, true, 2),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510', '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b', 'extra-tiers', 'Extra tiers', false, true, true, 3),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d511', '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b', 'fondant-covering', 'Fondant covering', false, false, true, 4),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d512', '44ded383-6c8e-4cbd-a8a4-e42da64c0c8b', 'tiering-fee', 'Tiering fee', false, false, true, 5),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d503', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d502', 'box-size', 'Box size', true, false, true, 1);

INSERT INTO public.product_option_choices (
  id, group_id, key, label, price_delta_cents, available, sort_order
) VALUES
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d520', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '6-inch-1-layer', '6 inch - 1 layer', 0, true, 1),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d521', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '6-inch-2-layers', '6 inch - 2 layers', 6000, true, 2),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d522', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '6-inch-3-layers', '6 inch - 3 layers', 11000, true, 3),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d523', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '8-inch-1-layer', '8 inch - 1 layer', 3000, true, 4),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d524', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '8-inch-2-layers', '8 inch - 2 layers', 11000, true, 5),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d525', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '8-inch-3-layers', '8 inch - 3 layers', 18000, true, 6),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d526', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '10-inch-1-layer', '10 inch - 1 layer', 8000, true, 7),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d527', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '10-inch-2-layers', '10 inch - 2 layers', 18000, true, 8),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d528', '30594a40-1fd1-4cca-8f80-280c9d975ec7', '10-inch-3-layers', '10 inch - 3 layers', 25000, true, 9),

  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d530', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'simple-edible-topper', 'Simple edible topper', 2500, true, 1),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d531', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'custom-edible-topper', 'Custom edible topper', 5000, true, 2),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d532', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'fondant-small-detail', 'Fondant letters or small detail', 1000, true, 3),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d533', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'special-colours', 'Special colours', 2000, true, 4),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d534', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'bows', 'Bows', 500, true, 5),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d535', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'cherries', 'Cherries', 500, true, 6),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d536', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'edible-glitter', 'Edible glitter', 500, true, 7),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d537', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'pearls', 'Pearls', 500, true, 8),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d538', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'crowns', 'Crowns', 500, true, 9),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d539', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'detailed-piping', 'Detailed piping work', 1000, true, 10),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d53a', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'edible-printed-image', 'Edible printed image', 2000, true, 11),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d53b', 'aab61c6f-909a-416c-b9b3-40647ff36d5f', 'rush-under-48-hours', 'Rush order under 48 hours', 2000, true, 12),

  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d540', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510', 'second-tier-6-inch', 'Add a 2nd tier - 6 inch (3 layers)', 18000, true, 1),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d541', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510', 'second-tier-8-inch', 'Add a 2nd tier - 8 inch (3 layers)', 25000, true, 2),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d542', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510', 'second-tier-10-inch', 'Add a 2nd tier - 10 inch (3 layers)', 32000, true, 3),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d543', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510', 'third-tier-6-inch', 'Add a 3rd tier - 6 inch (3 layers)', 18000, true, 4),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d544', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510', 'third-tier-8-inch', 'Add a 3rd tier - 8 inch (3 layers)', 25000, true, 5),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d545', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510', 'third-tier-10-inch', 'Add a 3rd tier - 10 inch (3 layers)', 32000, true, 6),

  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d550', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d511', 'fondant-1-tier', 'Fondant covering - 1 tier', 10000, true, 1),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d551', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d511', 'fondant-2-tiers', 'Fondant covering - 2 tiers', 20000, true, 2),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d552', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d511', 'fondant-3-tiers', 'Fondant covering - 3 tiers', 30000, true, 3),

  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d560', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d512', 'tiering-2-tiers', 'Tiering fee - 2 tiers', 4000, true, 1),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d561', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d512', 'tiering-3-tiers', 'Tiering fee - 3 tiers', 6000, true, 2),

  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d570', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d503', 'box-6', 'Box of 6', 0, true, 1),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d571', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d503', 'box-12', 'Box of 12', 2500, true, 2),
  ('f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d572', 'f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d503', 'box-20', 'Box of 20', 7500, true, 3);

-- Preserve useful zero-cost choices on retained products.
INSERT INTO public.product_option_groups (
  id, product_id, key, label, required, allow_multiple, available, sort_order
) VALUES
  ('15409fe5-8ce2-4c8b-b601-997752a84997', '80067c7f-4957-4aba-9cf9-e0a778337abf', 'flavour', 'Flavour', true, false, true, 1),
  ('2de1cb9a-c45e-459b-9897-f354f2c6a860', '7d913909-4b38-4400-aef3-c8b334bd8fcb', 'filling', 'Filling', true, false, true, 1),
  ('8fa08c2a-4d8f-4bd7-bbd5-35dc9529a2d7', 'fada9878-9892-4488-a5a2-b92bc5bd7d7d', 'filling', 'Filling', true, false, true, 1),
  ('15a09299-1b45-43c3-99a8-23cfc2c85a58', '736d1787-0f3e-48f2-a424-550138fd0e1b', 'mix', 'Cocktail', true, false, true, 1)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  key = EXCLUDED.key,
  label = EXCLUDED.label,
  required = EXCLUDED.required,
  allow_multiple = EXCLUDED.allow_multiple,
  available = EXCLUDED.available,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.product_option_choices (
  id, group_id, key, label, price_delta_cents, available, sort_order
) VALUES
  ('8e41f440-0831-4e58-b3e6-b96d831173f9', '15409fe5-8ce2-4c8b-b601-997752a84997', 'butter', 'Butter', 0, true, 1),
  ('e5483ec8-bc3d-4cd0-a5d4-63818ede820b', '15409fe5-8ce2-4c8b-b601-997752a84997', 'coconut', 'Coconut', 0, true, 2),
  ('14a9e7f5-0106-470a-aca3-4b1d6bfb4e70', '15409fe5-8ce2-4c8b-b601-997752a84997', 'fruit', 'Fruit and nut', 0, true, 3),
  ('59c8a6b3-87df-41b7-bade-5e4b128e70e2', '15409fe5-8ce2-4c8b-b601-997752a84997', 'red-velvet', 'Red velvet', 0, true, 4),
  ('ac8807e3-cf20-4aa7-a22e-b60dcc9c2469', '2de1cb9a-c45e-459b-9897-f354f2c6a860', 'beef', 'Beef', 0, true, 1),
  ('af6c90b4-1631-4854-94ec-d413274e709d', '2de1cb9a-c45e-459b-9897-f354f2c6a860', 'chicken', 'Chicken', 0, true, 2),
  ('6424022b-84a2-4978-96bc-72ca5af2a2ff', '2de1cb9a-c45e-459b-9897-f354f2c6a860', 'vegetable', 'Vegetable', 0, true, 3),
  ('a7bc447c-1054-4174-97fe-a0c94e07ad35', '8fa08c2a-4d8f-4bd7-bbd5-35dc9529a2d7', 'beef', 'Beef', 0, true, 1),
  ('561920fd-fe44-48c5-85ca-bca338f3a7e3', '8fa08c2a-4d8f-4bd7-bbd5-35dc9529a2d7', 'chicken', 'Chicken', 0, true, 2),
  ('d80f19a9-b149-434c-9cac-189984e05d08', '8fa08c2a-4d8f-4bd7-bbd5-35dc9529a2d7', 'vegetable', 'Vegetable', 0, true, 3),
  ('a35581f9-405d-4cf1-84d4-80a1c0af3713', '15a09299-1b45-43c3-99a8-23cfc2c85a58', 'chapman', 'Chapman', 0, true, 1),
  ('bff2da5c-c5a7-4ac5-bb99-28da81630836', '15a09299-1b45-43c3-99a8-23cfc2c85a58', 'zobo', 'Zobo punch', 0, true, 2),
  ('2b83de25-2a01-4bad-b7c6-0ced2daab12d', '15a09299-1b45-43c3-99a8-23cfc2c85a58', 'rum-punch', 'Rum punch', 0, true, 3)
ON CONFLICT (id) DO UPDATE SET
  group_id = EXCLUDED.group_id,
  key = EXCLUDED.key,
  label = EXCLUDED.label,
  price_delta_cents = EXCLUDED.price_delta_cents,
  available = EXCLUDED.available,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.delivery_zones (
  id, name, postal_prefixes, fee_cents, active, sort_order
) VALUES
  ('c3f241b5-103d-434d-8a10-7a1fa0e8d424', 'Etobicoke', '{M8,M9}', 3000, true, 1),
  ('109911cd-7abb-4146-ac9f-73b7dfd9c324', 'Greater Toronto Area',
    '{M1,M2,M3,M4,M5,M6,M7,L4,L5,L6}', 3500, true, 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  postal_prefixes = EXCLUDED.postal_prefixes,
  fee_cents = EXCLUDED.fee_cents,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

UPDATE public.delivery_zones
SET active = false, updated_at = now()
WHERE id = '8c5b6132-f41d-44c5-a4ea-3bd3bd0c0063';

INSERT INTO public.settings (
  id, singleton, bank_account_name, bank_account_number, bank_name, bank_note,
  whatsapp_number, delivery_mode, delivery_origin_postal_code,
  delivery_distance_config
) VALUES (
  '44ef8744-e1e1-4811-9968-7e69a01da15f', true, 'Wendy''s Bakehouse',
  '0011223344', 'Wends bakery',
  'Use your order reference as the transfer description, then upload your transfer slip.',
  '+1 647 620 2518', 'fixed_zones', NULL, '{"bands": []}'
)
ON CONFLICT (singleton) DO UPDATE SET
  bank_account_name = EXCLUDED.bank_account_name,
  bank_account_number = EXCLUDED.bank_account_number,
  bank_name = EXCLUDED.bank_name,
  bank_note = EXCLUDED.bank_note,
  whatsapp_number = EXCLUDED.whatsapp_number,
  delivery_mode = EXCLUDED.delivery_mode,
  delivery_origin_postal_code = EXCLUDED.delivery_origin_postal_code,
  delivery_distance_config = EXCLUDED.delivery_distance_config,
  updated_at = now();

COMMIT;
