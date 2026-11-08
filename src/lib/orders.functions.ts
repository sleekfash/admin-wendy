import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  itemSchema,
  orderSchema,
  MAX_TRANSFER_RECEIPT_BYTES,
  PAYMENT_SLIPS_BUCKET,
  TRANSFER_RECEIPT_TYPES,
  type PlaceOrderInput,
} from "@/lib/order-schemas";

export type { PlaceOrderInput };

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { createPricedOrder } = await import("@/lib/order-create.server");

    const isTransfer = data.checkout_method === "bank_transfer";

    // Every price, and the delivery fee, is recalculated server-side from
    // current rows; order + items are written in one database transaction.
    const { id, reference, cart, lines } = await createPricedOrder(data, {
      checkout_method: data.checkout_method,
      payment_provider: isTransfer ? "bank_transfer" : "whatsapp",
      payment_status: "not_paid",
    });

    return {
      reference,
      dueNowCents: cart.due_now_cents,
      subtotalCents: cart.subtotal_cents,
      deliveryFeeCents: cart.delivery.fee_cents,
      totalCents: cart.total_cents,
      balanceCents: cart.balance_cents,
      hasQuoteItems: false,
      slipUploaded: false,
      ...(isTransfer
        ? {
            paymentAccess: (await import("@/lib/order-access.server")).issueOrderPaymentAccess(
              id,
              reference,
            ),
          }
        : {}),
      lines: lines.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        pricing_mode: l.pricing_mode,
        payment_rule: l.payment_rule,
        unit_price_cents: l.unit_price_cents,
        line_total_cents: l.line_total_cents,
        line_due_now_cents: l.line_due_now_cents,
        deposit_cents: l.deposit_cents,
        deposit_percent: l.deposit_percent,
        options: l.options,
      })),
    };
  });

/**
 * Authoritative checkout preview. The browser never computes money; it asks
 * here and renders exactly what comes back.
 */
export const previewCart = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        fulfilment: z.enum(["pickup", "delivery"]),
        delivery_postal_code: z.string().trim().max(12).optional(),
        items: z.array(itemSchema).min(1).max(30),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { priceCart, PricingError } = await import("@/lib/pricing.server");
    try {
      const cart = await priceCart(
        data.items.map((i) => ({
          slug: i.slug,
          quantity: i.quantity,
          choices: i.choices,
          notes: i.notes ?? null,
        })),
        data.fulfilment,
        data.delivery_postal_code ?? null,
      );
      return { ok: true as const, cart };
    } catch (error) {
      return {
        ok: false as const,
        message:
          error instanceof PricingError
            ? error.message
            : "We could not work out your total. Please try again.",
      };
    }
  });

/** Public, reference-only payment lookup used by the card confirmation page. */
export const getOrderPaymentState = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ reference: z.string().trim().min(4).max(40) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("reference, payment_status, due_now_cents, balance_cents, total_cents")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!order) return { found: false as const };
    return {
      found: true as const,
      reference: order.reference,
      payment_status: order.payment_status,
      due_now_cents: order.due_now_cents,
      balance_cents: order.balance_cents,
      total_cents: order.total_cents,
    };
  });

/** Read bank details only for a committed transfer order with its bearer access key. */
export const getTransferPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      reference: z.string().trim().min(4).max(40),
      access: z.string().regex(/^[a-f0-9]{64}$/),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyOrderPaymentAccess } = await import("@/lib/order-access.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, checkout_method, payment_status, status, total_cents, due_now_cents, balance_cents, slip_path")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!order || order.checkout_method !== "bank_transfer" ||
        !verifyOrderPaymentAccess(order.id, order.reference, data.access)) {
      throw new Error("This payment link is invalid. Please use the link from your order confirmation.");
    }
    const { data: settings, error } = await supabaseAdmin
      .from("settings")
      .select("bank_account_name, bank_account_number, bank_name, bank_note")
      .limit(1)
      .maybeSingle();
    if (error || !settings?.bank_account_number) {
      throw new Error("Bank transfer details are currently unavailable. Please contact the bakery.");
    }
    return {
      reference: order.reference,
      paymentStatus: order.payment_status,
      cancelled: order.status === "cancelled",
      totalCents: order.total_cents,
      dueNowCents: order.due_now_cents,
      balanceCents: order.balance_cents,
      slipUploaded: Boolean(order.slip_path),
      bank: settings,
    };
  });

const receiptUploadSchema = z.object({
  reference: z.string().trim().min(4).max(40),
  access: z.string().regex(/^[a-f0-9]{64}$/),
  uploadId: z.string().uuid(),
  contentType: z.enum(TRANSFER_RECEIPT_TYPES),
});

export const prepareTransferReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => receiptUploadSchema.extend({
    size: z.number().int().positive().max(MAX_TRANSFER_RECEIPT_BYTES),
  }).parse(input))
  .handler(async ({ data }) => {
    const { receiptTarget } = await import("@/lib/transfer-receipt.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { path, alreadySubmitted } = await receiptTarget(data);
    if (alreadySubmitted) return { state: "confirmed" as const };

    const bucket = supabaseAdmin.storage.from(PAYMENT_SLIPS_BUCKET);
    const { data: exists } = await bucket.exists(path);
    if (exists) return { state: "uploaded" as const };

    const { data: upload, error } = await bucket.createSignedUploadUrl(path, { upsert: false });
    if (error || !upload) throw new Error("Could not start the receipt upload. Please try again.");
    return { state: "ready" as const, path, token: upload.token };
  });

export const submitTransferReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => receiptUploadSchema.extend({
    payer_name: z.string().trim().min(1).max(100),
    transfer_reference: z.string().trim().max(80).optional(),
    transfer_date: z.string().date().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const { receiptTarget, matchesReceiptImage } = await import("@/lib/transfer-receipt.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { order, path, alreadySubmitted } = await receiptTarget(data);
    if (alreadySubmitted) return { ok: true as const, reference: order.reference };

    const bucket = supabaseAdmin.storage.from(PAYMENT_SLIPS_BUCKET);
    const { data: file, error: downloadError } = await bucket.download(path);
    if (downloadError || !file) {
      throw new Error("Could not find the uploaded receipt. Please try again.");
    }
    const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    if (
      file.size === 0 || file.size > MAX_TRANSFER_RECEIPT_BYTES ||
      file.type !== data.contentType || !matchesReceiptImage(header, data.contentType)
    ) {
      await bucket.remove([path]);
      throw new Error("The receipt must be a JPG, PNG, WebP or HEIC image up to 15 MB.");
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        slip_path: path,
        payer_name: data.payer_name,
        transfer_reference: data.transfer_reference || null,
        transfer_date: data.transfer_date || null,
        payment_status: "pending_verification",
      })
      .eq("id", order.id)
      .eq("payment_status", "not_paid")
      .neq("status", "cancelled")
      .is("slip_path", null)
      .select("id")
      .maybeSingle();

    if (updateError) throw new Error("Could not confirm the receipt. Please try again.");
    if (!updated) {
      const result = await supabaseAdmin.from("orders").select("slip_path").eq("id", order.id).single();
      if (result.data?.slip_path === path) return { ok: true as const, reference: order.reference };
      if (result.data) await bucket.remove([path]);
      throw new Error("Payment status changed. Please refresh your order before retrying.");
    }
    return { ok: true as const, reference: order.reference };
  });
