import assert from "node:assert/strict";
import { test } from "node:test";
import { cardOrderSchema, orderSchema } from "../src/lib/order-schemas.ts";

const valid = {
  customer_name: "Staging Customer",
  phone: "4165550100",
  email: "",
  pickup_date: "2027-03-20",
  fulfilment: "pickup" as const,
  items: [{ slug: "synthetic-cake", quantity: 1, choices: [], options: {} }],
};

test("minimal checkout accepts pickup without delivery details or email", () => {
  assert.equal(cardOrderSchema.safeParse(valid).success, true);
  assert.equal(orderSchema.safeParse({ ...valid, checkout_method: "whatsapp" }).success, true);
  assert.equal(orderSchema.safeParse({ ...valid, checkout_method: "bank_transfer" }).success, true);
});

test("all payment paths reject missing or invalid fulfillment date", () => {
  for (const pickup_date of ["", "2027-02-30", "invalid"]) {
    assert.equal(cardOrderSchema.safeParse({ ...valid, pickup_date }).success, false);
    assert.equal(orderSchema.safeParse({ ...valid, pickup_date, checkout_method: "bank_transfer" }).success, false);
  }
  const { pickup_date: _date, ...withoutDate } = valid;
  assert.equal(cardOrderSchema.safeParse(withoutDate).success, false);
});

test("delivery requires street address and postal code on the server", () => {
  const delivery = { ...valid, fulfilment: "delivery" as const };
  for (const input of [
    delivery,
    { ...delivery, delivery_area: "   ", delivery_postal_code: "M9C 1A1" },
    { ...delivery, delivery_area: "1 Test Street", delivery_postal_code: "" },
  ]) {
    assert.equal(cardOrderSchema.safeParse(input).success, false);
    assert.equal(orderSchema.safeParse({ ...input, checkout_method: "whatsapp" }).success, false);
  }
  assert.equal(cardOrderSchema.safeParse({ ...delivery, delivery_area: "1 Test Street", delivery_postal_code: "M9C 1A1" }).success, true);
});
