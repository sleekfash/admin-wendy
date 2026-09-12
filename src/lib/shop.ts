import { queryOptions } from "@tanstack/react-query";
import { getCatalog, getBankDetails } from "@/lib/catalog.functions";

import heroCake from "@/assets/hero-cake.jpg";
import meatPies from "@/assets/meat-pies.jpg";
import cakeLoaves from "@/assets/cake-loaves.jpg";
import cupcakes from "@/assets/cupcakes.jpg";

export type PricingMode = "fixed" | "deposit" | "quote";

export type ShopCategory = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  image_key: string | null;
  image_url: string | null;
  sort_order: number;
};

export type ProductOptionChoice = {
  key: string;
  label: string;
  price_delta_cents: number;
};

export type ProductOptionGroup = {
  key: string;
  label: string;
  required: boolean;
  choices: ProductOptionChoice[];
};

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  short: string;
  description: string;
  pricing_mode: PricingMode;
  price_cents: number | null;
  deposit_cents: number | null;
  price_note: string | null;
  price_band: string | null;
  lead_time: string;
  serves: string | null;
  image_key: string | null;
  image_url: string | null;
  options: ProductOptionGroup[];
  includes: string[];
  available: boolean;
  sort_order: number;
  payment_rule: "full" | "deposit";
  pack_size: number | null;
  pack_unit: string | null;
};

export type ShopSettings = {
  whatsapp_number: string;
};

export const FALLBACK_SETTINGS: ShopSettings = {
  whatsapp_number: "+1 647 620 2518",
};

export type BankDetails = {
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  bank_note: string;
};

export const FALLBACK_BANK_DETAILS: BankDetails = {
  bank_account_name: "Wendy's Bakehouse",
  bank_account_number: "0011223344",
  bank_name: "Wends bakery",
  bank_note: "Use your order reference as the transfer description.",
};

const BUNDLED: Record<string, string> = {
  "hero-cake": heroCake,
  "meat-pies": meatPies,
  "cake-loaves": cakeLoaves,
  cupcakes: cupcakes,
};

/** Resolves an image reference to a URL the browser can load. */
export function imageSrc(
  ref: { image_url?: string | null; image_key?: string | null } | null | undefined,
): string {
  const url = ref?.image_url;
  if (url) {
    if (url.startsWith("storage:")) {
      return `/api/public/product-image/${url.slice("storage:".length)}`;
    }
    return url;
  }
  return BUNDLED[ref?.image_key ?? "hero-cake"] ?? heroCake;
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Short label used on cards and listings. */
export function priceLabel(p: {
  price_cents: number | null;
  options?: ProductOptionGroup[];
}): string {
  if (p.price_cents == null) return "Ask for a price";
  const hasUpgrades = (p.options ?? []).some((g) =>
    g.choices.some((c) => c.price_delta_cents > 0),
  );
  return `${hasUpgrades ? "From " : ""}${formatMoney(p.price_cents)}`;
}

/** "12 pies per pack" style label, when the product is sold by the pack. */
export function packLabel(p: { pack_size: number | null; pack_unit: string | null }): string | null {
  if (!p.pack_size) return null;
  return `${p.pack_size} ${p.pack_unit ?? "pieces"} per pack`;
}

function parseStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export async function fetchCatalog(): Promise<{
  categories: ShopCategory[];
  products: ShopProduct[];
  settings: ShopSettings;
}> {
  const data = await getCatalog();

  const choicesByGroup = new Map<string, ProductOptionChoice[]>();
  for (const c of data.option_choices) {
    const list = choicesByGroup.get(c.group_id) ?? [];
    list.push({ key: c.key, label: c.label, price_delta_cents: c.price_delta_cents });
    choicesByGroup.set(c.group_id, list);
  }
  const groupsByProduct = new Map<string, ProductOptionGroup[]>();
  for (const g of data.option_groups) {
    const choices = choicesByGroup.get(g.id) ?? [];
    if (choices.length === 0) continue;
    const list = groupsByProduct.get(g.product_id) ?? [];
    list.push({ key: g.key, label: g.label, required: g.required, choices });
    groupsByProduct.set(g.product_id, list);
  }

  return {
    categories: data.categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      blurb: c.blurb,
      image_key: c.image_key,
      image_url: c.image_url,
      sort_order: c.sort_order,
    })),
    products: data.products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category_id: p.category_id,
      short: p.short,
      description: p.description,
      pricing_mode: p.pricing_mode as PricingMode,
      price_cents: p.price_cents,
      deposit_cents: p.deposit_cents,
      price_note: p.price_note,
      price_band: p.price_band,
      lead_time: p.lead_time,
      serves: p.serves,
      image_key: p.image_key,
      image_url: p.image_url,
      options: groupsByProduct.get(p.id) ?? [],
      includes: parseStrings(p.includes),
      available: p.available,
      sort_order: p.sort_order,
      payment_rule: (p.payment_rule ?? "full") as "full" | "deposit",
      pack_size: p.pack_size,
      pack_unit: p.pack_unit,
    })),
    settings: data.settings ?? FALLBACK_SETTINGS,
  };
}

/** Bank details are only served for a real basket, so the slugs are required. */
export function bankDetailsQueryOptions(slugs: string[]) {
  return queryOptions({
    queryKey: ["bank-details", [...slugs].sort()],
    enabled: slugs.length > 0,
    queryFn: async (): Promise<BankDetails> =>
      (await getBankDetails({ data: { slugs } })) ?? FALLBACK_BANK_DETAILS,
    staleTime: 60_000,
  });
}

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalog"],
  queryFn: fetchCatalog,
  staleTime: 30_000,
});

export function categoryImage(category: ShopCategory, products: ShopProduct[]): string {
  if (category.image_url || category.image_key) return imageSrc(category);
  const first = products.find((p) => p.category_id === category.id);
  return imageSrc(first ?? null);
}
