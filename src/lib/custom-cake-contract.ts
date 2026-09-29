export const CUSTOM_CAKE_PRODUCT_ID = "44ded383-6c8e-4cbd-a8a4-e42da64c0c8b";
export const CUSTOM_CAKE_PRODUCT_SLUG = "tiered-celebration-cake";
export const CUSTOM_CAKE_CATEGORY_ID = "382b2742-6d74-4a4c-9a1f-dabaf5755a2d";
export const CUSTOM_CAKE_DESIGN_GROUP_ID = "aab61c6f-909a-416c-b9b3-40647ff36d5f";

/**
 * Example celebration-cake photos shown in the "Build your own" gallery.
 * Stored in the private `product-images` bucket and served through the app's
 * own image endpoint, so they never reference a host-specific CDN.
 */
export const CUSTOM_CAKE_GALLERY = [
  "storage:custom-cakes/cake-example-01.jpg",
  "storage:custom-cakes/cake-example-02.jpg",
  "storage:custom-cakes/cake-example-03.jpg",
  "storage:custom-cakes/cake-example-04.jpg",
  "storage:custom-cakes/cake-example-05.jpg",
  "storage:custom-cakes/cake-example-06.jpg",
  "storage:custom-cakes/cake-example-07.jpg",
  "storage:custom-cakes/cake-example-08.jpg",
  "storage:custom-cakes/cake-example-09.jpg",
  "storage:custom-cakes/cake-example-10.jpg",
] as const;

export const CUSTOM_CAKE_RULE_GROUPS = {
  sizeLayers: {
    id: "30594a40-1fd1-4cca-8f80-280c9d975ec7",
    key: "size-layers",
    required: true,
    allowMultiple: false,
  },
  extraTiers: {
    id: "f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d510",
    key: "extra-tiers",
    required: false,
    allowMultiple: true,
  },
  fondantCovering: {
    id: "f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d511",
    key: "fondant-covering",
    required: false,
    allowMultiple: false,
  },
  tieringFee: {
    id: "f25d4b7e-4f5f-4cab-8a2d-8ea0a9c8d512",
    key: "tiering-fee",
    required: false,
    allowMultiple: false,
  },
} as const;

export type CustomCakeRuleGroup =
  (typeof CUSTOM_CAKE_RULE_GROUPS)[keyof typeof CUSTOM_CAKE_RULE_GROUPS];

/** UUIDs are case-insensitive in Postgres; normalize before comparing. */
function normUuid(id: string): string {
  return id.toLowerCase();
}

export function customCakeRuleGroup(id: string): CustomCakeRuleGroup | undefined {
  const normalised = normUuid(id);
  return Object.values(CUSTOM_CAKE_RULE_GROUPS).find((group) => group.id === normalised);
}

export function isCustomCakeRuleGroup(id: string): boolean {
  return customCakeRuleGroup(id) != null;
}

export function isCustomCakeOptionGroup(id: string): boolean {
  return normUuid(id) === CUSTOM_CAKE_DESIGN_GROUP_ID || isCustomCakeRuleGroup(id);
}

export function isCustomCakeProduct(id: string): boolean {
  return normUuid(id) === CUSTOM_CAKE_PRODUCT_ID;
}

export function isCustomCakeCartItem(item: { product_id?: string; slug: string }): boolean {
  return isCustomCakeProduct(item.product_id ?? "") || item.slug === CUSTOM_CAKE_PRODUCT_SLUG;
}

export function isCustomCakeCategory(id: string): boolean {
  return normUuid(id) === CUSTOM_CAKE_CATEGORY_ID;
}
