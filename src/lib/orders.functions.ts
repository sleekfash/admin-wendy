import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  itemSchema,
  orderSchema,
  MAX_SLIP_BYTES,
  SLIP_EXTENSIONS,
  slipSchema,
  type PlaceOrderInput,
} from "@/lib/order-schemas";

export type { PlaceOrderInput };

function decodeBase64(data: string): Uint8Array {
  const clean = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

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
      payer_name: data.payer_name ?? null,
      transfer_reference: data.transfer_reference ?? null,
      transfer_date: data.transfer_date || null,
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

/** Upload evidence against the same existing order; never create a second order. */
export const submitTransferReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      reference: z.string().trim().min(4).max(40),
      access: z.string().regex(/^[a-f0-9]{64}$/),
      payer_name: z.string().trim().min(1).max(100),
      transfer_reference: z.string().trim().max(80).optional(),
      transfer_date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(),
      slip: slipSchema,
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyOrderPaymentAccess } = await import("@/lib/order-access.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, reference, checkout_method, payment_status, status, slip_path")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!order || order.checkout_method !== "bank_transfer" ||
        !verifyOrderPaymentAccess(order.id, order.reference, data.access)) {
      throw new Error("Invalid payment link.");
    }
    if (order.status === "cancelled" || order.payment_status !== "not_paid") {
      throw new Error("This order cannot accept a new receipt. Please contact the bakery.");
    }
    if (order.slip_path) {
      throw new Error("A receipt has already been submitted for this order.");
    }
    const bytes = decodeBase64(data.slip.data_base64);
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_SLIP_BYTES) {
      throw new Error("Upload a payment receipt smaller than 5MB.");
    }
    // Validate the actual file signature, not only its declared MIME type.
    const mime = data.slip.content_type;
    const head = bytes.slice(0, 12);
    const ascii = (start: number, end: number) => String.fromCharCode(...head.slice(start, end));
    const valid = mime === "application/pdf"
      ? ascii(0, 5) === "%PDF-"
      : mime === "image/png"
        ? head[0] === 137 && ascii(1, 4) === "PNG"
        : mime === "image/jpeg"
          ? head[0] === 255 && head[1] === 216 && head[2] === 255
          : mime === "image/webp"
            ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
            : mime === "image/heic"
              ? ascii(4, 8) === "ftyp"
              : false;
    if (!valid) throw new Error("The receipt file does not match its declared format.");

    const path = `${order.id}/slip.${SLIP_EXTENSIONS[mime]}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("payment-slips")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (uploadError) throw new Error("Could not upload the receipt. Please try again.");

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
      .is("slip_path", null)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) {
      // The storage object may remain orphaned after a racing admin update.
      await supabaseAdmin.storage.from("payment-slips").remove([path]);
      throw new Error("Payment status changed. Please refresh your order before retrying.");
    }
    return { ok: true as const, reference: order.reference };
  });
