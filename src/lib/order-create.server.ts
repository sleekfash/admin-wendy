import type { OrderCoreInput } from "./order-schemas";
import { priceCart, PricingError, leadTimeDays, type PricedCart } from "./pricing.server";

/**
 * Single server-side path that prices a basket and writes the order.
 * Every checkout method (WhatsApp, bank transfer, card) goes through here, so
 * money is calculated in exactly one place and the browser can never influence it.
 */

export type OrderMeta = {
  checkout_method: "whatsapp" | "bank_transfer" | "card";
  payment_provider: string;
  payment_status: string;
  payer_name?: string | null;
  transfer_reference?: string | null;
  transfer_date?: string | null;
};

export type CreatedOrder = {
  id: string;
  reference: string;
  cart: PricedCart;
  lines: ReturnType<typeof toLines>;
};

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function toLines(cart: PricedCart) {
  return cart.lines.map((l) => ({
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
}

export async function priceOrderBasket(data: OrderCoreInput): Promise<PricedCart> {
  let cart: PricedCart;
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

  // Lead time is enforced server-side from the product records.
  if (data.pickup_date) {
    const today = new Date().toISOString().slice(0, 10);
    const notice = daysBetween(today, data.pickup_date);
    if (notice < 0) throw new Error("Please choose a collection date in the future.");
    const required = Math.max(0, ...cart.lines.map((l) => leadTimeDays(l.lead_time)));
    if (notice < required) {
      throw new Error(
        `Those items need at least ${required} day${required === 1 ? "" : "s"} notice. Please pick a later date.`,
      );
    }
  }

  return cart;
}

export async function createPricedOrder(
  data: OrderCoreInput,
  meta: OrderMeta,
): Promise<CreatedOrder> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cart = await priceOrderBasket(data);
  const lines = toLines(cart);

  const reference = `WB-${new Date().getFullYear().toString().slice(2)}${Math.floor(
    100000 + Math.random() * 900000,
  )}`;

  const { data: created, error } = await supabaseAdmin.rpc("create_order", {
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
      subtotal_cents: cart.subtotal_cents,
      due_now_cents: cart.due_now_cents,
      delivery_fee_cents: cart.delivery.fee_cents,
      total_cents: cart.total_cents,
      balance_cents: cart.balance_cents,
      delivery_postal_code: cart.delivery.postal_code,
      delivery_snapshot: cart.delivery,
      has_quote_items: false,
      status: "new",
      checkout_method: meta.checkout_method,
      payer_name: meta.payer_name || null,
      transfer_reference: meta.transfer_reference || null,
      transfer_date: meta.transfer_date || null,
      payment_provider: meta.payment_provider,
      payment_status: meta.payment_status,
    },
    _items: lines,
  });

  const order = Array.isArray(created) ? created[0] : created;
  if (error || !order) throw new Error("We could not save your order. Please try again.");

  return { id: order.id, reference: order.reference, cart, lines };
}
