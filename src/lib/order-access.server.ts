import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A payment link is an unguessable bearer capability issued only after an
 * order has been committed. Never send the signing key to the browser.
 *
 * A dedicated ORDER_PAYMENT_ACCESS_SECRET is recommended. The existing
 * server-only Supabase service key provides a safe fallback for deployments
 * that have not configured a separate secret yet.
 */
function signingKey(): string {
  const key = process.env["ORDER_PAYMENT_ACCESS_SECRET"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key || key.length < 24) throw new Error("Payment access is not configured.");
  return key;
}

export function issueOrderPaymentAccess(id: string, reference: string): string {
  return createHmac("sha256", signingKey())
    .update(`wendys:bank-transfer:v1:${id}:${reference}`)
    .digest("hex");
}

export function verifyOrderPaymentAccess(
  id: string,
  reference: string,
  supplied: string,
): boolean {
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  const expected = Buffer.from(issueOrderPaymentAccess(id, reference), "hex");
  const actual = Buffer.from(supplied, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
