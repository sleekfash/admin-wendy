import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Public catalogue read: categories, available products and shop settings. */
export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  // The settings row is admin-only in the Data API, so the one public field
  // (the WhatsApp number) is read server-side with the trusted client.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [cats, prods, settings, groups, choices] = await Promise.all([
    supabase.from("categories").select("*").eq("visible", true).order("sort_order"),
    supabase.from("products").select("*").eq("available", true).order("sort_order"),
    supabaseAdmin.from("settings").select("whatsapp_number").limit(1).maybeSingle(),
    supabase
      .from("product_option_groups")
      .select("id, product_id, key, label, required, available, sort_order")
      .eq("available", true)
      .order("sort_order"),
    supabase
      .from("product_option_choices")
      .select("id, group_id, key, label, price_delta_cents, available, sort_order")
      .eq("available", true)
      .order("sort_order"),
  ]);

  if (cats.error) throw new Error(cats.error.message);
  if (prods.error) throw new Error(prods.error.message);

  return {
    categories: cats.data ?? [],
    products: prods.data ?? [],
    settings: settings.data ?? null,
    option_groups: groups.data ?? [],
    option_choices: choices.data ?? [],
  };
});

/**
 * Bank transfer details. Kept out of the public Data API and returned only for
 * a real checkout context — the caller must name at least one orderable item.
 */
export const getBankDetails = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ slugs: z.array(z.string().min(1).max(120)).min(1).max(30) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .in("slug", data.slugs)
      .eq("available", true);

    if (!count) return null;

    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("bank_account_name, bank_account_number, bank_name, bank_note")
      .limit(1)
      .maybeSingle();
    return settings ?? null;
  });
