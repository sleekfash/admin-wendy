import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatMoney, imageSrc } from "@/lib/shop";
import { CustomCakeMark } from "@/components/site/CakeArtwork";
import { isCustomCakeCartItem } from "@/lib/custom-cake-contract";

export function CartDrawer({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { items, count, remove, setQuantity, quote, isPricing, pricingError } = useCart();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={`relative inline-flex items-center gap-2 rounded-sm border border-input px-3 py-2 text-sm font-medium ${className}`}
          aria-label={`Open basket, ${count} item${count === 1 ? "" : "s"}`}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Basket</span>
          {count > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-display text-2xl">Your basket</SheetTitle>
          <SheetDescription>
            {count === 0
              ? "Nothing here yet."
              : `${count} item${count === 1 ? "" : "s"} ready to order.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">Add a cake to get started.</p>
              <Link
                to="/menu"
                search={{}}
                onClick={() => setOpen(false)}
                className="mt-5 inline-block rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Browse the menu
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item, i) => {
                const line = quote?.lines[i];
                return (
                  <li
                    key={`${item.slug}-${i}`}
                    className="flex gap-3 rounded-[1rem] border border-border p-3"
                  >
                    {isCustomCakeCartItem(item) ? (
                      <CustomCakeMark className="h-16 w-16" />
                    ) : (
                      <img
                        src={imageSrc(item)}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = imageSrc({ image_key: item.image_key ?? null });
                        }}
                        className="h-16 w-16 shrink-0 rounded-[0.75rem] object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base">{item.name}</p>
                      {Object.entries(item.options).length > 0 && (
                        <p className="truncate text-xs text-muted-foreground">
                          {Object.entries(item.options)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="inline-flex items-center rounded-sm border border-input">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity(i, item.quantity - 1)}
                            className="p-1.5"
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <span className="min-w-6 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQuantity(i, item.quantity + 1)}
                            className="p-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          aria-label={`Remove ${item.name}`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="ml-auto text-right">
                          <span className="block font-display text-base text-gold">
                            {formatMoney(line?.line_total_cents)}
                          </span>
                          {line?.payment_rule === "deposit" && (
                            <span className="block text-[11px] text-muted-foreground">
                              {formatMoney(line.line_due_now_cents)} due now
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Order total</span>
                <span className="font-display text-xl">{formatMoney(quote?.total_cents)}</span>
              </div>
              <div className="flex items-baseline justify-between font-semibold">
                <span>Due now</span>
                <span className="font-display text-2xl">{formatMoney(quote?.due_now_cents)}</span>
              </div>
              {(quote?.balance_cents ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Balance of {formatMoney(quote?.balance_cents)} due before pickup or delivery.
                </p>
              )}
            </div>
            {isPricing && <p className="mt-2 text-xs text-muted-foreground">Updating total...</p>}
            {pricingError && <p className="mt-2 text-xs text-destructive">{pricingError}</p>}
            <Button asChild className="mt-4 w-full">
              <Link to="/checkout" onClick={() => setOpen(false)}>
                Checkout
              </Link>
            </Button>
            <Button asChild variant="ghost" className="mt-1 w-full">
              <Link to="/cart" onClick={() => setOpen(false)}>
                View full basket
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
