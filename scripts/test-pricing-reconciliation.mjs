import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const temp = await mkdtemp(join(tmpdir(), "wendy-pricing-"));
try {
  await build({
    entryPoints: ["src/lib/public-pricing.ts"],
    outfile: join(temp, "public.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
  });
  await build({
    entryPoints: ["src/lib/pricing.server.ts"],
    outfile: join(temp, "server.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    plugins: [
      {
        name: "fixture-db",
        setup(b) {
          b.onLoad({ filter: /client\.server\.ts$/ }, () => ({
            contents: "export const supabaseAdmin=globalThis.__PRICING_TEST_DB;",
            loader: "js",
          }));
        },
      },
    ],
  });
  const fixture = JSON.parse(
    await readFile("scripts/fixtures/public-catalog-2026-10-14.json", "utf8"),
  );
  const data = structuredClone(fixture);
  globalThis.__PRICING_TEST_DB = {
    from(table) {
      let rows = data[table] ?? [];
      const q = {
        select() {
          return q;
        },
        in(k, values) {
          rows = rows.filter((r) => values.includes(r[k]));
          return q;
        },
        eq(k, v) {
          rows = rows.filter((r) => r[k] === v);
          return q;
        },
        then(resolve) {
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
      };
      return q;
    },
  };
  const { directCakeSizes, startingPrice } = await import(
    pathToFileURL(join(temp, "public.mjs")).href
  );
  const { priceLines } = await import(pathToFileURL(join(temp, "server.mjs")).href);
  const cake = data.products.find((p) => p.slug === "tiered-celebration-cake");
  assert.ok(cake, "Cake must be present in the verified catalogue fixture");
  const groups = data.product_option_groups
    .filter((g) => g.product_id === cake.id && g.available)
    .map((g) => ({
      ...g,
      choices: data.product_option_choices.filter((c) => c.group_id === g.id && c.available),
    }));
  let passed = 0;
  const check = (name, fn) => {
    fn();
    passed++;
    console.log(`PASS ${name}`);
  };
  check("lowest genuinely orderable cake price", () =>
    assert.equal(startingPrice(cake, groups), 13000),
  );
  check("required empty selection fails closed", () =>
    assert.equal(
      startingPrice({ id: "other", price_cents: 2800 }, [
        { key: "required", required: true, allow_multiple: false, choices: [] },
      ]),
      null,
    ),
  );
  check("required size adjustment is included", () =>
    assert.equal(
      startingPrice({ id: "other", price_cents: 7000 }, [
        {
          key: "size",
          required: true,
          allow_multiple: false,
          choices: [{ key: "small", price_delta_cents: 6000 }],
        },
      ]),
      13000,
    ),
  );
  check("negative adjustments still produce the genuine minimum", () =>
    assert.equal(
      startingPrice({ id: "other", price_cents: 2800 }, [
        {
          key: "offer",
          required: false,
          allow_multiple: true,
          choices: [
            { key: "a", price_delta_cents: -100 },
            { key: "b", price_delta_cents: -200 },
          ],
        },
      ]),
      2500,
    ),
  );
  check("invalid protected cake groups fail closed", () =>
    assert.equal(
      startingPrice(
        cake,
        groups.map((g) => (g.key === "size-layers" ? { ...g, required: false } : g)),
      ),
      null,
    ),
  );
  const base = groups
    .find((g) => g.key === "size-layers")
    .choices.find((c) => c.key === "6-inch-2-layers");
  assert.ok(base);
  const req = {
    slug: cake.slug,
    quantity: 1,
    choices: [{ group_key: "size-layers", choice_key: base.key }],
  };
  const [line] = await priceLines([req]);
  check("actual checkout engine agrees with listing", () =>
    assert.equal(line.unit_total_cents, startingPrice(cake, groups)),
  );
  check("deposit uses the authoritative price", () =>
    assert.equal(
      line.line_due_now_cents,
      Math.round((line.line_total_cents * cake.deposit_percent) / 100),
    ),
  );
  await assert.rejects(
    () =>
      priceLines([
        { ...req, choices: [{ group_key: "size-layers", choice_key: "6-inch-1-layer" }] },
      ]),
    /minimum/,
  );
  passed++;
  console.log("PASS under-minimum configuration is rejected");
  await assert.rejects(
    () =>
      priceLines([
        {
          ...req,
          choices: [
            { group_key: "size-layers", choice_key: "6-inch-3-layers" },
            { group_key: "extra-tiers", choice_key: "second-tier-6-inch" },
            { group_key: "tiering-fee", choice_key: "tiering-2-tiers" },
          ],
        },
      ]),
    /different cake size/,
  );
  passed++;
  console.log("PASS duplicate tier sizes are rejected");
  check("direct-order size skips the below-minimum size", () =>
    assert.deepEqual(directCakeSizes(cake, groups)[0], {
      key: "6-inch-2-layers",
      price_cents: line.unit_total_cents,
    }),
  );
  const topper = { group_key: "cake-add-ons", choice_key: "simple-edible-topper" };
  const [topperLine] = await priceLines([{ ...req, choices: [...req.choices, topper] }]);
  check("topper-only customization quotes without a stacking fee", () => {
    assert.equal(topperLine.unit_total_cents, line.unit_total_cents + 2500);
    assert.equal(
      topperLine.options_snapshot.some((o) => o.group_key === "tiering-fee"),
      false,
    );
  });
  const tierChoices = [
    { group_key: "size-layers", choice_key: "6-inch-3-layers" },
    { group_key: "extra-tiers", choice_key: "second-tier-8-inch" },
  ];
  for (const tierCount of [2, 3]) {
    const choices = [
      ...tierChoices,
      ...(tierCount === 3 ? [{ group_key: "extra-tiers", choice_key: "third-tier-10-inch" }] : []),
      { group_key: "fondant-covering", choice_key: `fondant-${tierCount}-tiers` },
    ];
    const fee = { group_key: "tiering-fee", choice_key: `tiering-${tierCount}-tiers` };
    const [automatic, legacy] = await priceLines([
      { ...req, choices, notes: "Design reference: fixture" },
      { ...req, choices: [...choices, fee] },
    ]);
    check(`automatic ${tierCount}-tier fee matches legacy checkout and is charged once`, () => {
      assert.equal(automatic.unit_total_cents, legacy.unit_total_cents);
      assert.equal(automatic.line_due_now_cents, legacy.line_due_now_cents);
      assert.deepEqual(
        automatic.options_snapshot.filter((option) => option.group_key === fee.group_key),
        legacy.options_snapshot.filter((option) => option.group_key === fee.group_key),
      );
      assert.equal(
        automatic.options_snapshot.filter((option) => option.group_key === fee.group_key).length,
        1,
      );
      assert.equal(automatic.notes, "Design reference: fixture");
    });
  }
  const twoTierFee = data.product_option_choices.find((choice) => choice.key === "tiering-2-tiers");
  await assert.rejects(
    () =>
      priceLines([
        {
          ...req,
          choices: [...tierChoices, { group_key: "tiering-fee", choice_key: "tiering-3-tiers" }],
        },
      ]),
    /stacking fee no longer matches/,
  );
  twoTierFee.available = false;
  await assert.rejects(
    () => priceLines([{ ...req, choices: tierChoices }]),
    /Stacking is unavailable/,
  );
  twoTierFee.available = true;
  passed += 2;
  console.log("PASS conflicting and unavailable stacking fees fail closed");
  const oldMinimum = cake.buttercream_minimum_cents;
  cake.buttercream_minimum_cents = 13500;
  await assert.rejects(() => priceLines([req]), /minimum/);
  check("dynamic database minimum excludes old configuration", () =>
    assert.equal(
      startingPrice(
        cake,
        groups.filter((g) => g.key !== "cake-add-ons"),
      ),
      15000,
    ),
  );
  cake.buttercream_minimum_cents = oldMinimum;
  const category = data.categories.find((c) => c.id === cake.category_id);
  category.visible = false;
  await assert.rejects(() => priceLines([req]), /not available/);
  passed++;
  console.log("PASS hidden category is not orderable");
  category.visible = true;
  const design = {
    ...cake,
    id: "c2026101-0001-4000-8000-000000000001",
    slug: "racing-adventure-cake",
    name: "Racing Adventure Cake",
    price_cents: null,
  };
  data.products.push(design);
  await assert.rejects(
    () => priceLines([{ slug: design.slug, quantity: 1, choices: [] }]),
    /configurator/,
  );
  passed++;
  console.log("PASS design listings cannot bypass the authoritative configurator");
  const dynamicDesign = {
    ...design,
    id: "eeeeeeee-1111-4111-8111-111111111111",
    slug: "new-admin-design",
  };
  data.products.push(dynamicDesign);
  await assert.rejects(
    () => priceLines([{ slug: dynamicDesign.slug, quantity: 1, choices: [] }]),
    /configurator/,
  );
  passed++;
  console.log("PASS newly-created designs cannot bypass canonical pricing");
  console.log(`${passed} pricing regressions passed; no production write or payment was made.`);
} finally {
  delete globalThis.__PRICING_TEST_DB;
  await rm(temp, { recursive: true, force: true });
}
