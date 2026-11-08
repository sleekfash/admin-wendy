import assert from "node:assert/strict";
import { test } from "node:test";
import { CUSTOM_CAKE_PRODUCT_ID, CUSTOM_CAKE_RULE_GROUPS } from "../src/lib/custom-cake-contract.ts";
import { directCakeSizes, startingPrice } from "../src/lib/public-pricing.ts";

const prices = {
  "6-inch-2-layers": 13000,
  "6-inch-3-layers": 18000,
  "8-inch-1-layer": 10000,
  "8-inch-2-layers": 17000,
  "8-inch-3-layers": 23000,
  "10-inch-1-layer": 15000,
  "10-inch-2-layers": 28000,
  "10-inch-3-layers": 35000,
} as const;

const product = { id: CUSTOM_CAKE_PRODUCT_ID, price_cents: 0 };
const groups = Object.values(CUSTOM_CAKE_RULE_GROUPS).map((rule) => ({
  id: rule.id,
  key: rule.key,
  required: rule.required,
  allow_multiple: rule.allowMultiple,
  choices: rule.key === "size-layers"
    ? Object.entries(prices).map(([key, price_delta_cents]) => ({ key, price_delta_cents }))
    : rule.key === "fondant-covering"
      ? [{ key: "fondant-1-tier", price_delta_cents: 4500 }]
      : [],
}));

test("custom cake advertises exactly eight approved size/layer prices", () => {
  const sizes = directCakeSizes(product, groups);
  assert.equal(sizes.length, 8);
  assert.deepEqual(Object.fromEntries(sizes.map(({ key, price_cents }) => [key, price_cents])), prices);
  assert.equal(sizes.some(({ key }) => key === "6-inch-1-layer"), false);
});

test("size price is the complete starting amount, not a surcharge on base", () => {
  assert.equal(startingPrice(product, groups), 10000);
  assert.equal(startingPrice({ ...product, price_cents: 5000 }, groups), 10000);
});

test("non-cake products retain base plus option pricing", () => {
  const regular = { id: "00000000-0000-4000-8000-000000000001", price_cents: 2500 };
  const choices = [{ key: "icing", price_delta_cents: 500 }];
  assert.equal(startingPrice(regular, [{ key: "icing", required: true, allow_multiple: false, choices }]), 3000);
});

test("incomplete custom cake pricing rules fail closed", () => {
  assert.equal(startingPrice(product, groups.filter((g) => g.key !== "size-layers")), null);
  assert.deepEqual(directCakeSizes(product, groups.filter((g) => g.key !== "size-layers")), []);
});
