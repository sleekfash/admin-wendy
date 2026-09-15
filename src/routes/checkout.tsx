import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Landmark, Upload, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Section } from "@/components/site/Bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart, lineDueCents } from "@/lib/cart";
import {
  catalogQueryOptions,
  bankDetailsQueryOptions,
  formatMoney,
  FALLBACK_SETTINGS,
  FALLBACK_BANK_DETAILS,
} from "@/lib/shop";
import { placeOrder, previewCart, type PlaceOrderInput } from "@/lib/orders.functions";
import { cardPaymentsEnabled, startCardPayment } from "@/lib/payments.functions";

type PayMethod = "whatsapp" | "bank_transfer" | "card";

const TITLE = "Checkout — Wendy's Bakehouse, Cakes in Toronto";
const DESC =
  "Confirm your order over WhatsApp or by bank transfer, for collection in Etobicoke, Toronto.";

const MAX_SLIP_BYTES = 5 * 1024 * 1024;
const ALLOWED_SLIP_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function minDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

type Receipt = {
  reference: string;
  dueNowCents: number;
  hasQuoteItems: boolean;
  method: PayMethod;
  waLink: string;
};

function CheckoutPage() {
  const { items, dueNowCents, hasQuoteItems, clear } = useCart();
  const submitOrder = useServerFn(placeOrder);
  const payByCard = useServerFn(startCardPayment);
  const checkCard = useServerFn(cardPaymentsEnabled);
  const { data: catalog } = useQuery(catalogQueryOptions);
  const settings = catalog?.settings ?? FALLBACK_SETTINGS;
  const { data: bankData } = useQuery(bankDetailsQueryOptions(items.map((i) => i.slug)));
  const bank = bankData ?? FALLBACK_BANK_DETAILS;
  const { data: cardState } = useQuery({
    queryKey: ["card-payments-enabled"],
    queryFn: () => checkCard({}),
    staleTime: 5 * 60 * 1000,
  });
  const cardEnabled = cardState?.enabled === true;

  const [method, setMethod] = useState<PayMethod>("whatsapp");
  const [busy, setBusy] = useState(false);
  const [slip, setSlip] = useState<File | null>(null);
  const [done, setDone] = useState<Receipt | null>(null);
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    pickup_date: "",
    pickup_window: "Flexible",
    fulfilment: "pickup" as "pickup" | "delivery",
    delivery_area: "",
    delivery_postal_code: "",
    occasion: "",
    notes: "",
    allergies: "",
    payer_name: "",
    transfer_reference: "",
    transfer_date: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const preview = useServerFn(previewCart);
  const cartRequest = items.map((i) => ({
    slug: i.slug,
    quantity: i.quantity,
    options: i.options,
    choices: i.choices ?? [],
    notes: i.notes,
  }));
  const postal = form.delivery_postal_code.trim();
  const { data: quote, isFetching: quoting } = useQuery({
    queryKey: ["checkout-total", cartRequest, form.fulfilment, postal],
    enabled: items.length > 0 && (form.fulfilment === "pickup" || postal.length >= 3),
    queryFn: () =>
      preview({
        data: {
          fulfilment: form.fulfilment,
          ...(postal ? { delivery_postal_code: postal } : {}),
          items: cartRequest,
        },
      }),
  });
  const totals = quote?.ok ? quote.cart : null;

  function buildWhatsAppLink(reference: string) {
    const lines = items.map((i) => {
      const total = lineDueCents(i);
      const opts = Object.entries(i.options)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return `• ${i.quantity} × ${i.name}${opts ? ` (${opts})` : ""} — ${
        total > 0 ? formatMoney(total) : "quoted"
      }`;
    });
    const body = [
      `Hi Wendy, here is my order ${reference}.`,
      "",
      ...lines,
      "",
      `Total due: ${formatMoney(dueNowCents)}${hasQuoteItems ? " + quoted items" : ""}`,
      `Name: ${form.customer_name}`,
      `Phone: ${form.phone}`,
      form.pickup_date ? `Date needed: ${form.pickup_date} (${form.pickup_window})` : "",
      form.fulfilment === "delivery"
        ? `Delivery to: ${form.delivery_area || "to confirm"}`
        : "Pickup in Etobicoke",
      form.occasion ? `Occasion: ${form.occasion}` : "",
      form.notes ? `Notes: ${form.notes}` : "",
      form.allergies ? `Allergies: ${form.allergies}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const digits = settings.whatsapp_number.replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (method === "bank_transfer") {
      if (!form.payer_name.trim()) {
        toast.error("Add the name the transfer was sent from.");
        return;
      }
      if (slip && slip.size > MAX_SLIP_BYTES) {
        toast.error("Payment slips must be smaller than 5MB.");
        return;
      }
    }

    setBusy(true);
    try {
      const core = {
        customer_name: form.customer_name,
        phone: form.phone,
        email: form.email || undefined,
        pickup_date: form.pickup_date || undefined,
        pickup_window: form.pickup_window,
        fulfilment: form.fulfilment,
        delivery_area: form.fulfilment === "delivery" ? form.delivery_area : undefined,
        delivery_postal_code:
          form.fulfilment === "delivery" ? form.delivery_postal_code.trim() : undefined,
        occasion: form.occasion || undefined,
        notes: form.notes || undefined,
        allergies: form.allergies || undefined,
        items: items.map((i) => ({
          slug: i.slug,
          quantity: i.quantity,
          options: i.options,
          choices: i.choices ?? [],
          notes: i.notes,
        })),
      };

      if (method === "card") {
        // The amount is worked out on the server; we only follow its redirect.
        const session = await payByCard({ data: core });
        clear();
        window.location.assign(session.url);
        return;
      }

      const payload: PlaceOrderInput = {
        ...core,
        checkout_method: method,
        payer_name: method === "bank_transfer" ? form.payer_name : undefined,
        transfer_reference:
          method === "bank_transfer" ? form.transfer_reference || undefined : undefined,
        transfer_date: method === "bank_transfer" ? form.transfer_date || undefined : undefined,
        items: items.map((i) => ({
          slug: i.slug,
          quantity: i.quantity,
          options: i.options,
          choices: i.choices ?? [],
          notes: i.notes,
        })),
      };

      if (method === "bank_transfer" && slip) {
        payload.slip = {
          filename: slip.name,
          content_type: slip.type as NonNullable<PlaceOrderInput["slip"]>["content_type"],
          data_base64: await readFileAsBase64(slip),
        };
      }

      const result = await submitOrder({ data: payload });


      const waLink = buildWhatsAppLink(result.reference);
      clear();
      setDone({
        reference: result.reference,
        dueNowCents: result.dueNowCents,
        hasQuoteItems: result.hasQuoteItems,
        method,
        waLink,
      });
      if (method === "whatsapp") window.open(waLink, "_blank", "noopener");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <PageHeader
          eyebrow={`Order ${done.reference}`}
          title="Your order is in the book."
          lead="Here is what happens next."
        />
        <Section>
          <ol className="max-w-[70ch] space-y-6">
            <li className="border-t border-border pt-5">
              <h2 className="font-display text-xl">
                {done.method === "whatsapp"
                  ? "Send your receipt on WhatsApp"
                  : "Payment verification"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {done.method === "whatsapp"
                  ? "Your itemised receipt is ready to send — tap the button below if the chat did not open."
                  : "Wendy checks your slip against the account and marks the order paid, usually within a few hours."}
              </p>
            </li>
            <li className="border-t border-border pt-5">
              <h2 className="font-display text-xl">
                {done.dueNowCents > 0 ? `Due now ${formatMoney(done.dueNowCents)}` : "Pricing"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your order is marked Not Paid until Wendy verifies your payment.
              </p>
            </li>
            <li className="border-t border-border pt-5">
              <h2 className="font-display text-xl">Collection in Etobicoke</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The pickup address is released once your order is confirmed.
              </p>
            </li>
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={done.waLink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Send receipt on WhatsApp
            </a>
            <Link
              to="/menu"
              search={{}}
              className="rounded-sm border border-input px-5 py-3 text-sm font-semibold"
            >
              Back to the menu
            </Link>
          </div>
        </Section>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Checkout" title="There is nothing to check out yet." />
        <Section>
          <Link
            to="/menu"
            search={{}}
            className="rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Browse the menu
          </Link>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title="Your details, then how you'd like to pay."
        lead="Confirm over WhatsApp with an itemised receipt, or pay by bank transfer and upload your slip."
      />

      <Section>
        <form className="grid gap-10 md:grid-cols-12" onSubmit={handleSubmit}>
          <div className="space-y-6 md:col-span-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  required
                  maxLength={100}
                  value={form.customer_name}
                  onChange={(e) => set("customer_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  required
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date you need it</Label>
                <Input
                  id="date"
                  type="date"
                  min={minDate()}
                  value={form.pickup_date}
                  onChange={(e) => set("pickup_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="window">Preferred window</Label>
                <select
                  id="window"
                  value={form.pickup_window}
                  onChange={(e) => set("pickup_window", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {["Morning", "Afternoon", "Evening", "Flexible"].map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Collection</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["pickup", "Pickup in Etobicoke"],
                    ["delivery", "Delivery to your postal code"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("fulfilment", value)}
                    className={`rounded-sm border px-4 py-2.5 text-sm font-medium ${
                      form.fulfilment === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-card"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {form.fulfilment === "delivery" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="postal">Postal code</Label>
                  <Input
                    id="postal"
                    maxLength={12}
                    placeholder="M9C 1A1"
                    value={form.delivery_postal_code}
                    onChange={(e) => set("delivery_postal_code", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Street address</Label>
                  <Input
                    id="area"
                    maxLength={160}
                    value={form.delivery_area}
                    onChange={(e) => set("delivery_area", e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="occasion">Occasion (optional)</Label>
              <Input
                id="occasion"
                maxLength={80}
                value={form.occasion}
                onChange={(e) => set("occasion", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Design notes (optional)</Label>
              <Textarea
                id="notes"
                maxLength={1000}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies (optional)</Label>
              <Input
                id="allergies"
                maxLength={500}
                value={form.allergies}
                onChange={(e) => set("allergies", e.target.value)}
              />
            </div>

            <div className="rounded-[1.5rem] border border-border bg-card p-5">
              <h2 className="eyebrow text-muted-foreground">How you&rsquo;d like to pay</h2>
              <Tabs
                value={method}
                onValueChange={(v) => setMethod(v as "whatsapp" | "bank_transfer")}
                className="mt-4"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="whatsapp" className="gap-2">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="bank_transfer" className="gap-2">
                    <Landmark className="h-4 w-4" aria-hidden="true" />
                    Bank transfer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="whatsapp" className="mt-5 text-sm text-muted-foreground">
                  We place the order and open WhatsApp with an itemised receipt already written out,
                  so Wendy can confirm your date and send payment details.
                </TabsContent>

                <TabsContent value="bank_transfer" className="mt-5 space-y-4">
                  <div className="rounded-[1rem] bg-secondary p-4 text-sm">
                    <p className="font-semibold">{bank.bank_account_name}</p>
                    <p className="text-muted-foreground">{bank.bank_name}</p>
                    <p className="text-muted-foreground">Account {bank.bank_account_number}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{bank.bank_note}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="payer">Name on the transfer</Label>
                      <Input
                        id="payer"
                        maxLength={100}
                        value={form.payer_name}
                        onChange={(e) => set("payer_name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tref">Transfer reference</Label>
                      <Input
                        id="tref"
                        maxLength={80}
                        value={form.transfer_reference}
                        onChange={(e) => set("transfer_reference", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tdate">Date sent</Label>
                    <Input
                      id="tdate"
                      type="date"
                      value={form.transfer_date}
                      onChange={(e) => set("transfer_date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slip">Payment slip (JPG, PNG, WEBP or PDF, max 5MB)</Label>
                    <div className="flex items-center gap-3">
                      <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="slip"
                        type="file"
                        accept={ALLOWED_SLIP_TYPES.join(",")}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          if (!file) return setSlip(null);
                          if (!ALLOWED_SLIP_TYPES.includes(file.type as never)) {
                            toast.error("Upload a JPG, PNG, WEBP or PDF.");
                            e.target.value = "";
                            return setSlip(null);
                          }
                          if (file.size > MAX_SLIP_BYTES) {
                            toast.error("That file is larger than 5MB.");
                            e.target.value = "";
                            return setSlip(null);
                          }
                          setSlip(file);
                        }}
                      />
                    </div>
                    {slip && (
                      <p className="text-xs text-muted-foreground">
                        {slip.name} · {(slip.size / 1024 / 1024).toFixed(2)}MB
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <aside className="md:col-span-5">
            <div className="rounded-[1.5rem] border border-border bg-secondary p-6 md:sticky md:top-28">
              <h2 className="eyebrow text-muted-foreground">Your order</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {(totals?.lines ?? []).map((line, i) => (
                  <li key={`${line.product_slug}-${i}`} className="flex justify-between gap-4">
                    <span>
                      {line.quantity} × {line.name}
                      {line.options_snapshot.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {line.options_snapshot.map((o) => o.choice_label).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatMoney(line.line_total_cents)}
                    </span>
                  </li>
                ))}
                {!totals &&
                  items.map((item, i) => (
                    <li key={`${item.slug}-${i}`} className="flex justify-between gap-4">
                      <span>
                        {item.quantity} × {item.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatMoney(lineDueCents(item))}
                      </span>
                    </li>
                  ))}
              </ul>
              <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(totals?.subtotal_cents ?? dueNowCents)}</span>
                </div>
                {totals && form.fulfilment === "delivery" && (
                  <div className="flex justify-between">
                    <span>
                      Delivery
                      {totals.delivery.detail ? (
                        <span className="block text-xs text-muted-foreground">
                          {totals.delivery.detail}
                        </span>
                      ) : null}
                    </span>
                    <span>{formatMoney(totals.delivery.fee_cents)}</span>
                  </div>
                )}
                {totals && (
                  <>
                    <div className="flex justify-between border-t border-border pt-2 font-semibold">
                      <span>Order total</span>
                      <span>{formatMoney(totals.total_cents)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">Due now</span>
                      <span className="font-display text-xl">
                        {formatMoney(totals.due_now_cents)}
                      </span>
                    </div>
                    {totals.balance_cents > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Balance of {formatMoney(totals.balance_cents)} due before collection.
                      </p>
                    )}
                  </>
                )}
              </div>
              {quoting && (
                <p className="mt-3 text-xs text-muted-foreground">Working out your total…</p>
              )}
              {quote && !quote.ok && (
                <p className="mt-3 text-xs text-destructive">{quote.message}</p>
              )}
              <button
                type="submit"
                disabled={busy || (form.fulfilment === "delivery" && !totals)}
                className="mt-6 w-full rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy
                  ? "Placing your order…"
                  : method === "whatsapp"
                    ? "Place order & open WhatsApp"
                    : "Place order & submit slip"}
              </button>
              <p className="mt-3 text-xs text-muted-foreground">
                Orders start as Not Paid until Wendy verifies payment.
              </p>
            </div>
          </aside>
        </form>
      </Section>
    </>
  );
}
