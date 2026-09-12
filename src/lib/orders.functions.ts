import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  slug: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(99),
  options: z.record(z.string().max(80), z.string().max(200)).default({}),
  choices: z
    .array(z.object({ group_key: z.string().max(80), choice_key: z.string().max(80) }))
    .max(10)
    .default([]),
  notes: z.string().trim().max(500).optional(),
});

const MAX_SLIP_BYTES = 5 * 1024 * 1024;

const SLIP_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
} as const;

const slipSchema = z.object({
  filename: z.string().trim().min(1).max(160),
  content_type: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]),
  data_base64: z.string().min(1).max(Math.ceil((MAX_SLIP_BYTES * 4) / 3) + 1024),
});

const orderSchema = z.object({
  customer_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().min(6).max(40),
  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  pickup_window: z.string().trim().max(60).optional(),
  fulfilment: z.enum(["pickup", "delivery"]),
  delivery_area: z.string().trim().max(160).optional(),
  delivery_postal_code: z.string().trim().max(12).optional(),
  occasion: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(1000).optional(),
  allergies: z.string().trim().max(500).optional(),
  heard_from: z.string().trim().max(80).optional(),
  checkout_method: z.enum(["whatsapp", "bank_transfer"]),
  payer_name: z.string().trim().max(100).optional(),
  transfer_reference: z.string().trim().max(80).optional(),
  transfer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  slip: slipSchema.optional(),
  items: z.array(itemSchema).min(1).max(30),
});

export type PlaceOrderInput = z.input<typeof orderSchema>;

function decodeBase64(data: string): Uint8Array {
  const clean = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Reads a lead time such as "5 days" or "2 weeks" into whole days. */
export function leadTimeDays(text: string | null | undefined): number {
  if (!text) return 0;
  const match = /(\d+)\s*(day|week)/i.exec(text);
  if (!match) return 0;
  const n = Number(match[1]);
  return /week/i.test(match[2] ?? "") ? n * 7 : n;
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { priceCart, PricingError } = await import("@/lib/pricing.server");

    // Every price, and the delivery fee, is recalculated here from current rows.
    let cart;
    try {
      cart = await priceCart(
        data.items.map((i) => ({
          slug: i.slug,
          quantity: i.quantity,
          choices: i.choices,
          notes: i.notes ?? null,
        })),
        data.fulfilment,
        data.delivery_postal_code ?? null,
      );
    } catch (error) {
      throw new Error(
        error instanceof PricingError
          ? error.message
          : "We could not price your basket. Please try again.",
      );
    }
    const priced = cart.lines;

    // Lead time is enforced server-side from the product records.
    if (data.pickup_date) {
      const today = new Date().toISOString().slice(0, 10);
      const notice = daysBetween(today, data.pickup_date);
      if (notice < 0) throw new Error("Please choose a collection date in the future.");
      const required = Math.max(0, ...priced.map((l) => leadTimeDays(l.lead_time)));
      if (notice < required) {
        throw new Error(
          `Those items need at least ${required} day${required === 1 ? "" : "s"} notice. Please pick a later date.`,
        );
      }
    }

    const subtotal = cart.subtotal_cents;
    const dueNow = cart.due_now_cents;
    const hasQuoteItems = false;

    const lines = priced.map((l) => ({
      product_id: l.product_id,
      product_slug: l.product_slug,
      name: l.name,
      quantity: l.quantity,
      unit_price_cents: l.unit_total_cents,
      deposit_cents: l.deposit_cents,
      pricing_mode: l.payment_rule === "deposit" ? "deposit" : "fixed",
      payment_rule: l.payment_rule,
      pack_size: l.pack_size,
      options: l.options,
      options_snapshot: l.options_snapshot,
      base_price_cents: l.base_price_cents,
      options_total_cents: l.options_total_cents,
      line_total_cents: l.line_total_cents,
      line_due_now_cents: l.line_due_now_cents,
      notes: l.notes,
    }));

    const reference = `WB-${new Date().getFullYear().toString().slice(2)}${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const isTransfer = data.checkout_method === "bank_transfer";

    // The slip is decoded and size-checked before anything is written, so a
    // rejected file never leaves a half-finished order behind.
    let slipBytes: Uint8Array | null = null;
    if (data.slip) {
      slipBytes = decodeBase64(data.slip.data_base64);
      if (slipBytes.byteLength > MAX_SLIP_BYTES) {
        throw new Error("That payment slip is larger than 5MB. Please upload a smaller file.");
      }
    }


    // Order + items are written in one database transaction.
    const { data: created, error: orderError } = await supabaseAdmin.rpc("create_order", {
      _order: {
        reference,
        customer_name: data.customer_name,
        email: data.email || null,
        phone: data.phone,
        pickup_date: data.pickup_date || null,
        pickup_window: data.pickup_window || null,
        fulfilment: data.fulfilment,
        delivery_area: data.delivery_area || null,
        occasion: data.occasion || null,
        notes: data.notes || null,
        allergies: data.allergies || null,
        heard_from: data.heard_from || null,
        subtotal_cents: subtotal,
        due_now_cents: dueNow,
        delivery_fee_cents: cart.delivery.fee_cents,
        total_cents: cart.total_cents,
        balance_cents: cart.balance_cents,
        delivery_postal_code: cart.delivery.postal_code,
        delivery_snapshot: cart.delivery,
        has_quote_items: hasQuoteItems,
        status: "new",
        checkout_method: data.checkout_method,
        payer_name: data.payer_name || null,
        transfer_reference: data.transfer_reference || null,
        transfer_date: data.transfer_date || null,
        payment_provider: isTransfer ? "bank_transfer" : "whatsapp",
        payment_status: isTransfer ? "pending_verification" : "not_paid",
      },
      _items: lines,
    });

    const order = Array.isArray(created) ? created[0] : created;
    if (orderError || !order) throw new Error("We could not save your order. Please try again.");

    let slipUploaded = false;
    if (data.slip && slipBytes) {
      // The file name is never used to build the storage path: the extension is
      // derived from the validated content type, so nothing can escape the
      // order's own folder.
      const ext = SLIP_EXTENSIONS[data.slip.content_type];
      const path = `${order.id}/slip.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("payment-slips")
        .upload(path, slipBytes, { contentType: data.slip.content_type, upsert: true });
      if (uploadError) {
        // The order stands; it is simply flagged as missing evidence.
        await supabaseAdmin
          .from("orders")
          .update({ notes: [data.notes, "[Payment slip upload failed]"].filter(Boolean).join("\n") })
          .eq("id", order.id);
      } else {
        slipUploaded = true;
        await supabaseAdmin.from("orders").update({ slip_path: path }).eq("id", order.id);
      }
    }

    return {
      reference: order.reference,
      dueNowCents: dueNow,
      subtotalCents: subtotal,
      deliveryFeeCents: cart.delivery.fee_cents,
      totalCents: cart.total_cents,
      balanceCents: cart.balance_cents,
      hasQuoteItems,
      slipUploaded,
      lines: lines.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        pricing_mode: l.pricing_mode,
        unit_price_cents: l.unit_price_cents,
        deposit_cents: l.deposit_cents,
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
