import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, packLabel, type ShopProduct } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import { previewCart } from "@/lib/orders.functions";
import { CUSTOM_CAKE_RULE_GROUPS, isCustomCakeProduct } from "@/lib/custom-cake-contract";

const { sizeLayers, extraTiers, tieringFee, fondantCovering } = CUSTOM_CAKE_RULE_GROUPS;

export function AddToBasket({
  product,
  design,
}: {
  product: ShopProduct;
  design?: ShopProduct | undefined;
}) {
  const preview = useServerFn(previewCart);
  const { add } = useCart();
  const [selections, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  const [customizing, setCustomizing] = useState(false);
  const customizationId = useId();
  const customCake = isCustomCakeProduct(product.id);
  const directSizes = product.direct_cake_sizes ?? [];
  const defaultSize = directSizes[0]?.key;
  const selected =
    customCake && !selections[sizeLayers.key] && defaultSize
      ? { ...selections, [sizeLayers.key]: [defaultSize] }
      : selections;
  const groups = product.options.filter((group) => !customCake || group.key !== tieringFee.key);
  const choices = groups.flatMap((group) =>
    (selected[group.key] ?? []).map((choiceKey) => ({
      group_key: group.key,
      choice_key: choiceKey,
    })),
  );
  const hasRequiredChoices = groups.every(
    (group) => !group.required || (selected[group.key]?.length ?? 0) > 0,
  );

  const pricing = useQuery({
    queryKey: ["product-price", product.slug, quantity, choices],
    enabled: hasRequiredChoices,
    queryFn: () =>
      preview({
        data: {
          fulfilment: "pickup",
          items: [
            {
              slug: product.slug,
              quantity,
              choices,
            },
          ],
        },
      }),
  });

  const quote = pricing.data?.ok ? pricing.data.cart : null;
  const line = quote?.lines[0];
  const pack = packLabel(product);
  const isDeposit = product.payment_rule === "deposit";
  const pricingError = pricing.isError
    ? "We could not confirm the price. Please try again."
    : pricing.data && !pricing.data.ok
      ? pricing.data.message
      : null;
  const sizeGroup = groups.find((group) => group.key === sizeLayers.key);
  const size = selected[sizeLayers.key]?.[0] ?? "";
  const tierChoices = groups.find((group) => group.key === extraTiers.key)?.choices ?? [];
  const tiers = selected[extraTiers.key] ?? [];
  const secondTier = tiers.find((choice) => choice.startsWith("second-tier-"));
  const thirdTier = tiers.find((choice) => choice.startsWith("third-tier-"));
  const tierCount = tiers.length + 1;
  const fondant = groups
    .find((group) => group.key === fondantCovering.key)
    ?.choices.find(
      (choice) => choice.key === `fondant-${tierCount}-${tierCount === 1 ? "tier" : "tiers"}`,
    );
  const visibleGroups = customCake
    ? groups.flatMap((group) => {
        if (Object.values(CUSTOM_CAKE_RULE_GROUPS).some((rule) => rule.key === group.key))
          return [];
        if (group.key !== "cake-add-ons" || group.required || !group.allow_multiple) return [group];

        const toppers = group.choices.filter((choice) => choice.key.endsWith("-topper"));
        if (toppers.length === 0) return [group];
        const decorations = group.choices.filter((choice) => !toppers.includes(choice));
        return [
          { ...group, label: "Add a topper", choices: toppers },
          ...(decorations.length
            ? [{ ...group, label: "Other decorations and extras", choices: decorations }]
            : []),
        ];
      })
    : groups;

  function changeTier(tier: "second" | "third", choice: string) {
    const next = tier === "second" ? [choice] : [secondTier, choice];
    setSelected((current) => ({
      ...current,
      [extraTiers.key]: next.filter((value): value is string => Boolean(value)),
      [fondantCovering.key]: [],
    }));
  }

  function toggleChoice(groupKey: string, choiceKey: string, checked: boolean) {
    setSelected((current) => {
      const values = current[groupKey] ?? [];
      return {
        ...current,
        [groupKey]: checked
          ? [...values, choiceKey]
          : values.filter((value) => value !== choiceKey),
      };
    });
  }

  return (
    <div className="rounded-[1.5rem] border border-border bg-secondary p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-display text-2xl text-gold">
          {line
            ? formatMoney(line.unit_total_cents)
            : `From ${formatMoney(product.starting_price_cents)}`}
        </p>
        {pack && <p className="text-sm text-muted-foreground">{pack}</p>}
        {isDeposit && (
          <p className="text-sm text-muted-foreground">
            {product.deposit_percent != null
              ? `${product.deposit_percent}% deposit holds your date`
              : `${formatMoney(product.deposit_cents)} deposit holds your date`}
          </p>
        )}
      </div>

      {customCake && sizeGroup && (
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-semibold">
            Choose size and layers
            <select
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
              value={size}
              onChange={(event) => {
                const value = event.target.value;
                setSelected((current) => ({
                  ...current,
                  [sizeLayers.key]: value ? [value] : [],
                  [extraTiers.key]: [],
                  [fondantCovering.key]: [],
                }));
                if (value && !directSizes.some((choice) => choice.key === value))
                  setCustomizing(true);
              }}
            >
              <option value="">Choose a size</option>
              {sizeGroup.choices.map((choice) => {
                const direct = directSizes.find((option) => option.key === choice.key);
                return (
                  <option key={choice.key} value={choice.key}>
                    {choice.label} —{" "}
                    {direct ? formatMoney(direct.price_cents) : "Customize to price"}
                  </option>
                );
              })}
            </select>
          </label>
          <button
            type="button"
            className="rounded-sm border border-input px-4 py-2 text-sm font-semibold"
            aria-expanded={customizing}
            aria-controls={
              visibleGroups.length
                ? `${customizationId} ${customizationId}-extras`
                : customizationId
            }
            onClick={() => setCustomizing((open) => !open)}
          >
            Customize this cake
          </button>
          <div id={customizationId} hidden={!customizing} className="space-y-3">
            {tierChoices.length > 0 && (
              <details className="rounded-md border border-input bg-background p-3 text-sm">
                <summary className="cursor-pointer font-semibold">Extra tiers</summary>
                {size.endsWith("3-layers") ? (
                  <div className="mt-3 space-y-3">
                    {(["second", "third"] as const).map((tier) => {
                      if (tier === "third" && !secondTier) return null;
                      const options = tierChoices.filter(
                        (choice) =>
                          choice.key.startsWith(`${tier}-tier-`) &&
                          !choice.key.endsWith(size.split("-").slice(0, 2).join("-")) &&
                          (tier !== "third" ||
                            !secondTier?.endsWith(choice.key.replace("third-tier-", ""))),
                      );
                      if (!options.length) return null;
                      return (
                        <label key={tier} className="block">
                          {tier === "second" ? "Second tier" : "Third tier"}
                          <select
                            className="mt-1 h-10 w-full rounded-md border border-input px-3"
                            value={(tier === "second" ? secondTier : thirdTier) ?? ""}
                            onChange={(event) => changeTier(tier, event.target.value)}
                          >
                            <option value="">None</option>
                            {options.map((choice) => (
                              <option key={choice.key} value={choice.key}>
                                {choice.label} ({formatMoney(choice.price_delta_cents)})
                              </option>
                            ))}
                          </select>
                        </label>
                      );
                    })}
                    <p className="text-muted-foreground">
                      Stacking fees are included in your quote.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-muted-foreground">
                    Choose a three-layer base to add tiers.
                  </p>
                )}
              </details>
            )}
            {fondant && (
              <details className="rounded-md border border-input bg-background p-3 text-sm">
                <summary className="cursor-pointer font-semibold">Fondant finish</summary>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected[fondantCovering.key]?.[0] === fondant.key}
                    onChange={(event) =>
                      toggleChoice(fondantCovering.key, fondant.key, event.target.checked)
                    }
                  />
                  {fondant.label} ({formatMoney(fondant.price_delta_cents)})
                </label>
              </details>
            )}
          </div>
        </div>
      )}

      {visibleGroups.length > 0 && (
        <div
          id={customCake ? `${customizationId}-extras` : undefined}
          hidden={customCake && !customizing}
        >
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {visibleGroups.map((group) => {
              const control = group.allow_multiple ? (
                <fieldset key={group.key} className="sm:col-span-2">
                  <legend className="text-sm font-semibold">
                    {group.label}
                    {group.required && <span className="text-gold"> *</span>}
                    <span className="ml-2 font-normal text-muted-foreground">Choose any</span>
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {group.choices.map((choice) => (
                      <label
                        key={choice.key}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-background px-3 py-2.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(selected[group.key] ?? []).includes(choice.key)}
                          onChange={(event) =>
                            toggleChoice(group.key, choice.key, event.target.checked)
                          }
                          className="mt-0.5 h-4 w-4 accent-primary"
                        />
                        <span>
                          {choice.label}
                          {choice.price_delta_cents !== 0 && (
                            <span className="ml-1 text-muted-foreground">
                              ({choice.price_delta_cents > 0 ? "+" : "-"}
                              {formatMoney(Math.abs(choice.price_delta_cents))})
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <label key={group.key} className="block text-sm font-semibold">
                  {group.label}
                  {group.required && <span className="text-gold"> *</span>}
                  <select
                    value={selected[group.key]?.[0] ?? ""}
                    onChange={(event) =>
                      setSelected((current) => ({
                        ...current,
                        [group.key]: event.target.value ? [event.target.value] : [],
                      }))
                    }
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                  >
                    <option value="">{group.required ? "Choose one" : "None"}</option>
                    {group.choices.map((choice) => (
                      <option key={choice.key} value={choice.key}>
                        {choice.label}
                        {choice.price_delta_cents !== 0
                          ? ` (${choice.price_delta_cents > 0 ? "+" : "-"}${formatMoney(Math.abs(choice.price_delta_cents))})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              );
              return customCake && !group.required ? (
                <details
                  key={`${group.key}:${group.label}`}
                  className="rounded-md border border-input bg-background p-3 sm:col-span-2"
                >
                  <summary className="cursor-pointer text-sm font-semibold">{group.label}</summary>
                  <div className="mt-3">{control}</div>
                </details>
              ) : (
                control
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 min-h-5 text-sm" aria-live="polite">
        {pricing.isFetching && <p className="text-muted-foreground">Checking your total...</p>}
        {!pricing.isFetching && pricingError && (
          <p className="text-destructive">
            {pricingError}{" "}
            {pricing.isError && (
              <button type="button" className="underline" onClick={() => void pricing.refetch()}>
                Retry
              </button>
            )}
          </p>
        )}
        {!pricing.isFetching && !pricingError && line && (
          <p className="text-muted-foreground">
            Order total {formatMoney(line.line_total_cents)}
            {isDeposit &&
              `; ${formatMoney(line.line_due_now_cents)} due now and ${formatMoney(quote?.balance_cents)} due before pickup or delivery`}
            .
          </p>
        )}
      </div>

      {customCake &&
        !pricing.isFetching &&
        !pricingError &&
        line?.options_snapshot
          .filter((option) => option.group_key === tieringFee.key)
          .map((option) => (
            <p key={option.choice_key} className="mt-1 text-sm text-muted-foreground">
              {option.choice_label} included ({formatMoney(option.price_delta_cents * quantity)})
            </p>
          ))}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold">
          Qty
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(event) =>
              setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))
            }
            className="ml-3 h-10 w-20 rounded-md border border-input bg-background px-3 text-sm font-normal"
          />
        </label>
        <button
          type="button"
          disabled={pricing.isFetching || (customCake && (!line || Boolean(pricingError)))}
          onClick={() => {
            const missing = groups.find(
              (group) => group.required && (selected[group.key]?.length ?? 0) === 0,
            );
            if (missing) {
              toast.error(`Choose a ${missing.label.toLowerCase()} first.`);
              return;
            }
            if (!line) {
              toast.error(pricingError ?? "We could not confirm that total. Please try again.");
              return;
            }

            add({
              product_id: product.id,
              slug: product.slug,
              name: product.name,
              quantity,
              pricing_mode: isDeposit ? "deposit" : "fixed",
              price_cents: line.unit_total_cents,
              deposit_cents: product.deposit_cents,
              deposit_percent: product.deposit_percent,
              choices,
              options: line.options,
              image_key: product.image_key,
              image_url: product.image_url,
              ...(design
                ? {
                    image_url: design.image_url,
                    notes: `Design reference: ${design.name} (${design.slug}). Decorations depend on selected options.`,
                  }
                : {}),
            });
            toast.success(`${product.name} added to your basket.`);
          }}
          className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {line
            ? customCake
              ? "Add to basket"
              : `Add to basket - ${formatMoney(line.line_due_now_cents)}`
            : "Choose options to price"}
        </button>
        <Link
          to="/cart"
          className="text-sm font-semibold underline decoration-gold underline-offset-4"
        >
          View basket
        </Link>
      </div>
    </div>
  );
}
