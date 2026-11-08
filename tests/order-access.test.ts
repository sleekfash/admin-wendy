import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { issueOrderPaymentAccess, verifyOrderPaymentAccess } from "../src/lib/order-access.server.ts";

const original = process.env.ORDER_PAYMENT_ACCESS_SECRET;
before(() => { process.env.ORDER_PAYMENT_ACCESS_SECRET = "e2e-test-signing-secret-keep-out-of-production-123"; });
after(() => {
  if (original === undefined) delete process.env.ORDER_PAYMENT_ACCESS_SECRET;
  else process.env.ORDER_PAYMENT_ACCESS_SECRET = original;
});

test("issue a 256-bit order-scoped bearer capability", () => {
  const key = issueOrderPaymentAccess("order-1", "WB-260001");
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(verifyOrderPaymentAccess("order-1", "WB-260001", key), true);
});

test("reject access to a different order or reference", () => {
  const key = issueOrderPaymentAccess("order-1", "WB-260001");
  assert.equal(verifyOrderPaymentAccess("order-2", "WB-260001", key), false);
  assert.equal(verifyOrderPaymentAccess("order-1", "WB-260002", key), false);
});

test("reject invalid, truncated, and altered capabilities", () => {
  const key = issueOrderPaymentAccess("order-1", "WB-260001");
  assert.equal(verifyOrderPaymentAccess("order-1", "WB-260001", ""), false);
  assert.equal(verifyOrderPaymentAccess("order-1", "WB-260001", key.slice(1)), false);
  assert.equal(verifyOrderPaymentAccess("order-1", "WB-260001", "g".repeat(64)), false);
  assert.equal(verifyOrderPaymentAccess("order-1", "WB-260001", "0".repeat(64)), false);
});
