import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: unknown; userId: string };

type Rpc = { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> };

/** Roles are resolved server-side on every call, never trusted from the browser. */
async function roleOf(context: Ctx): Promise<"admin" | "staff" | null> {
  const supabase = context.supabase as Rpc;
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin === true) return "admin";
  const { data: staff } = await supabase.rpc("is_staff");
  if (staff === true) return "staff";
  return null;
}

async function assertStaff(context: Ctx) {
  const role = await roleOf(context);
  if (!role) throw new Error("Forbidden");
  return role;
}

async function assertAdmin(context: Ctx) {
  const role = await roleOf(context);
  if (role !== "admin") throw new Error("Forbidden");
  return role;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  nextOrderStatuses,
  nextPaymentStatuses,
} from "@/lib/order-status";

export { ORDER_STATUSES, PAYMENT_STATUSES, nextOrderStatuses, nextPaymentStatuses };



/** Who am I, as far as the server is concerned. */
export const adminWhoAmI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ role: await assertStaff(context) }));

/** Orders list with their items, newest first. */
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data, error } = await db
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Operational counters for the dashboard, derived from real rows. */
export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const db = await admin();

    const today = new Date().toISOString().slice(0, 10);
    const [ordersRes, itemsRes] = await Promise.all([
      db
        .from("orders")
        .select(
          "id, reference, customer_name, created_at, pickup_date, fulfilment, status, payment_status, due_now_cents",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      db.from("order_items").select("name, quantity").limit(2000),
    ]);
    if (ordersRes.error) throw new Error(ordersRes.error.message);

    const orders = ordersRes.data ?? [];
    const live = orders.filter((o) => o.status !== "cancelled");

    const counts = {
      today: orders.filter((o) => o.created_at.slice(0, 10) === today).length,
      pendingVerification: live.filter((o) => o.payment_status === "pending_verification").length,
      needsAttention: live.filter((o) => o.status === "new").length,
      baking: live.filter((o) => o.status === "baking").length,
      ready: live.filter((o) => o.status === "ready").length,
      upcomingPickup: live.filter(
        (o) => o.fulfilment === "pickup" && (o.pickup_date ?? "") >= today,
      ).length,
      upcomingDelivery: live.filter(
        (o) => o.fulfilment === "delivery" && (o.pickup_date ?? "") >= today,
      ).length,
    };

    const dueCents = live
      .filter((o) => o.payment_status !== "paid" && o.payment_status !== "refunded")
      .reduce((sum, o) => sum + (o.due_now_cents ?? 0), 0);

    const collectedCents = live
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + (o.due_now_cents ?? 0), 0);

    const tally = new Map<string, number>();
    for (const row of itemsRes.data ?? []) {
      tally.set(row.name, (tally.get(row.name) ?? 0) + row.quantity);
    }
    const bestSellers = [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    return {
      counts,
      dueCents,
      collectedCents,
      totalOrders: orders.length,
      bestSellers,
      recent: orders.slice(0, 6),
      upcoming: live
        .filter((o) => (o.pickup_date ?? "") >= today)
        .sort((a, b) => (a.pickup_date ?? "").localeCompare(b.pickup_date ?? ""))
        .slice(0, 8),
    };
  });

/** Short-lived signed URL for a payment slip. */
export const adminSlipUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: z.string().min(1).max(300) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data: signed, error } = await db.storage
      .from("payment-slips")
      .createSignedUrl(data.path, 60 * 30);
    if (error || !signed) throw new Error("Could not open that slip.");
    return { url: signed.signedUrl };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(ORDER_STATUSES).optional(),
        payment_status: z.enum(PAYMENT_STATUSES).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();

    const { data: current, error: readError } = await db
      .from("orders")
      .select("status, payment_status")
      .eq("id", data.id)
      .single();
    if (readError || !current) throw new Error("That order no longer exists.");

    const patch: { status?: string; payment_status?: string } = {};
    if (data.status && data.status !== current.status) {
      if (!nextOrderStatuses(current.status).includes(data.status)) {
        throw new Error(`An order cannot go from ${current.status} to ${data.status}.`);
      }
      patch.status = data.status;
    }
    if (data.payment_status && data.payment_status !== current.payment_status) {
      if (!nextPaymentStatuses(current.payment_status).includes(data.payment_status)) {
        throw new Error(
          `Payment cannot go from ${current.payment_status} to ${data.payment_status}.`,
        );
      }
      patch.payment_status = data.payment_status;
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await db.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Full product list, including unavailable and archived items. */
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const db = await admin();
    const [prods, cats] = await Promise.all([
      db.from("products").select("*").order("sort_order"),
      db.from("categories").select("*").order("sort_order"),
    ]);
    if (prods.error) throw new Error(prods.error.message);
    if (cats.error) throw new Error(cats.error.message);
    return { products: prods.data ?? [], categories: cats.data ?? [] };
  });

/**
 * Payment rule is an explicit choice, never guessed from empty prices.
 * `pricing_mode` is derived from it so old readers stay correct.
 */
const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
    name: z.string().trim().min(2).max(120),
    category_id: z.string().uuid().nullable(),
    short: z.string().trim().max(240).default(""),
    description: z.string().trim().max(4000).default(""),
    payment_rule: z.enum(["full", "deposit"]),
    price_cents: z.number().int().min(0).max(10_000_00).nullable(),
    deposit_cents: z.number().int().min(0).max(10_000_00).nullable(),
    pack_size: z.number().int().min(1).max(1000).nullable(),
    pack_unit: z.string().trim().max(40).nullable(),
    price_note: z.string().trim().max(200).nullable(),
    lead_time: z.string().trim().max(80).default(""),
    serves: z.string().trim().max(80).nullable(),
    includes: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
    image_url: z.string().trim().max(500).nullable(),
    status: z.enum(["available", "unavailable", "archived"]),
    sort_order: z.number().int().min(0).max(9999),
  })
  .superRefine((v, ctx) => {
    if (v.price_cents == null) {
      ctx.addIssue({
        code: "custom",
        message: "Every product needs a published price.",
        path: ["price_cents"],
      });
      return;
    }
    if (v.payment_rule === "deposit") {
      if (v.deposit_cents == null) {
        ctx.addIssue({
          code: "custom",
          message: "A deposit product needs a deposit amount.",
          path: ["deposit_cents"],
        });
      } else if (v.deposit_cents > v.price_cents) {
        ctx.addIssue({
          code: "custom",
          message: "The deposit cannot be larger than the price.",
          path: ["deposit_cents"],
        });
      } else if (v.deposit_cents <= 0) {
        ctx.addIssue({
          code: "custom",
          message: "The deposit must be more than zero.",
          path: ["deposit_cents"],
        });
      }
    }
    if (v.pack_size != null && !v.pack_unit) {
      ctx.addIssue({
        code: "custom",
        message: "Say what the pack contains, for example \"pies\".",
        path: ["pack_unit"],
      });
    }
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();

    const row = {
      slug: data.slug,
      name: data.name,
      category_id: data.category_id,
      short: data.short,
      description: data.description,
      payment_rule: data.payment_rule,
      pricing_mode: (data.payment_rule === "deposit" ? "deposit" : "fixed") as "fixed" | "deposit",
      price_cents: data.price_cents,
      deposit_cents: data.payment_rule === "deposit" ? data.deposit_cents : null,
      price_band: null,
      price_note: data.price_note,
      lead_time: data.lead_time,
      serves: data.serves,
      includes: data.includes,
      image_url: data.image_url,
      status: data.status,
      sort_order: data.sort_order,
    };

    if (data.id) {
      const { error } = await db.from("products").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await db.from("products").insert(row).select("id").single();
    if (error || !created) throw new Error(error?.message ?? "Could not create the product.");
    return { ok: true, id: created.id };
  });

/**
 * Hard delete is admin-only and refuses any product that appears in an order,
 * so historical orders keep their commercial meaning. Archive instead.
 */
export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();

    const { count } = await db
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", data.id);
    if (count && count > 0) {
      throw new Error(
        "This cake appears in past orders, so it cannot be deleted. Archive it instead.",
      );
    }

    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
  name: z.string().trim().min(2).max(120),
  blurb: z.string().trim().max(400).default(""),
  image_url: z.string().trim().max(500).nullable(),
  visible: z.boolean(),
  sort_order: z.number().int().min(0).max(9999),
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { id, ...row } = data;
    if (id) {
      const { error } = await db.from("categories").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: created, error } = await db.from("categories").insert(row).select("id").single();
    if (error || !created) throw new Error(error?.message ?? "Could not create the collection.");
    return { ok: true, id: created.id };
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data, error } = await db.from("settings").select("*").limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const distanceBandSchema = z.object({
  up_to_km: z.number().min(0).max(500),
  fee_cents: z.number().int().min(0).max(100_000),
});

const settingsSchema = z
  .object({
    id: z.string().uuid(),
    bank_account_name: z.string().trim().max(120),
    bank_account_number: z.string().trim().max(60),
    bank_name: z.string().trim().max(120),
    bank_note: z.string().trim().max(400),
    whatsapp_number: z.string().trim().max(40),
    delivery_mode: z.enum(["pickup_only", "fixed_zones", "distance"]),
    delivery_origin_postal_code: z.string().trim().max(12).nullable(),
    delivery_distance_bands: z.array(distanceBandSchema).max(12).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.delivery_mode !== "distance") return;
    if (!v.delivery_origin_postal_code) {
      ctx.addIssue({
        code: "custom",
        message: "Distance pricing needs the postal code you deliver from.",
        path: ["delivery_origin_postal_code"],
      });
    }
    if (v.delivery_distance_bands.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Add at least one distance band, otherwise no fee can be worked out.",
        path: ["delivery_distance_bands"],
      });
    }
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { id, delivery_distance_bands, ...rest } = data;
    const patch = {
      ...rest,
      delivery_distance_config: {
        bands: [...delivery_distance_bands].sort((a, b) => a.up_to_km - b.up_to_km),
      },
    };
    const { error } = await db.from("settings").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Product option groups and choices
 * ------------------------------------------------------------------ */

export const adminListOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ product_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { data: groups, error } = await db
      .from("product_option_groups")
      .select("*")
      .eq("product_id", data.product_id)
      .order("sort_order");
    if (error) throw new Error(error.message);
    const ids = (groups ?? []).map((g) => g.id);
    const choices = ids.length
      ? (await db.from("product_option_choices").select("*").in("group_id", ids).order("sort_order"))
          .data ?? []
      : [];
    return { groups: groups ?? [], choices };
  });

const keyRule = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens");

export const adminSaveOptionGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        product_id: z.string().uuid(),
        key: keyRule,
        label: z.string().trim().min(1).max(120),
        required: z.boolean(),
        available: z.boolean(),
        sort_order: z.number().int().min(0).max(999),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { id, ...row } = data;
    if (id) {
      const { error } = await db.from("product_option_groups").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: created, error } = await db
      .from("product_option_groups")
      .insert(row)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save that option group.");
    return { ok: true, id: created.id };
  });

export const adminDeleteOptionGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    await db.from("product_option_choices").delete().eq("group_id", data.id);
    const { error } = await db.from("product_option_groups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveOptionChoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        group_id: z.string().uuid(),
        key: keyRule,
        label: z.string().trim().min(1).max(120),
        price_delta_cents: z.number().int().min(-100_000).max(1_000_000),
        available: z.boolean(),
        sort_order: z.number().int().min(0).max(999),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { id, ...row } = data;
    if (id) {
      const { error } = await db.from("product_option_choices").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: created, error } = await db
      .from("product_option_choices")
      .insert(row)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save that choice.");
    return { ok: true, id: created.id };
  });

export const adminDeleteOptionChoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const db = await admin();
    const { error } = await db.from("product_option_choices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Delivery zones
 * ------------------------------------------------------------------ */

export const adminListDeliveryZones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data, error } = await db.from("delivery_zones").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120),
        postal_prefixes: z
          .array(
            z
              .string()
              .trim()
              .min(1)
              .max(6)
              .transform((s) => s.toUpperCase().replace(/\s/g, "")),
          )
          .min(1)
          .max(60),
        fee_cents: z.number().int().min(0).max(100_000),
        active: z.boolean(),
        sort_order: z.number().int().min(0).max(999),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { id, ...row } = data;
    if (id) {
      const { error } = await db.from("delivery_zones").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: created, error } = await db
      .from("delivery_zones")
      .insert(row)
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not save that zone.");
    return { ok: true, id: created.id };
  });

export const adminDeleteDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.from("delivery_zones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
