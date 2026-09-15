import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { PageHeader, Section } from "@/components/site/Bits";
import { getOrderPaymentState } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/shop";

const TITLE = "Payment received — Wendy's Bakehouse";
const DESC = "Your card payment is confirmed and your order is in the book.";

export const Route = createFileRoute("/order-confirmed")({
  validateSearch: z.object({ ref: z.string().trim().max(40).optional() }),
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
  component: OrderConfirmedPage,
});

function OrderConfirmedPage() {
  const { ref } = Route.useSearch();
  const lookup = useServerFn(getOrderPaymentState);

  const { data } = useQuery({
    queryKey: ["order-payment-state", ref],
    enabled: Boolean(ref),
    queryFn: () => lookup({ data: { reference: ref! } }),
    // Stripe's confirmation usually lands within a second or two of the return trip.
    refetchInterval: (query) =>
      query.state.data?.found && query.state.data.payment_status === "pending" ? 2000 : false,
  });

  const paid = data?.found && data.payment_status === "paid";
  const waiting = !data || (data.found && data.payment_status === "pending");

  return (
    <>
      <PageHeader
        eyebrow={ref ? `Order ${ref}` : "Order"}
        title={paid ? "Payment received. Thank you." : "Confirming your payment…"}
        lead={
          paid
            ? "Your order is in the book and Wendy has been notified."
            : "This page updates itself as soon as your bank confirms the charge."
        }
      />
      <Section>
        <div className="max-w-[70ch] space-y-6">
          {paid && data.found && (
            <div className="border-t border-border pt-5">
              <h2 className="font-display text-xl">Paid {formatMoney(data.due_now_cents)}</h2>
              {data.balance_cents > 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  That covers your deposit. The remaining {formatMoney(data.balance_cents)} is due
                  before collection.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Your order is paid in full — nothing more to send.
                </p>
              )}
            </div>
          )}

          {waiting && (
            <p className="text-sm text-muted-foreground">
              Hang on a moment. You can safely leave this page — your payment is recorded either
              way, and Wendy will be in touch about your date.
            </p>
          )}

          {data?.found && data.payment_status === "expired" && (
            <p className="text-sm text-muted-foreground">
              That payment page timed out and nothing was charged. You can place the order again.
            </p>
          )}

          {data && !data.found && (
            <p className="text-sm text-muted-foreground">
              We could not find that order reference. If you were charged, message Wendy on WhatsApp
              with your reference and it will be sorted straight away.
            </p>
          )}

          <div className="border-t border-border pt-5">
            <h2 className="font-display text-xl">Collection in Etobicoke</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The pickup address is released once your order is confirmed.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/menu"
            search={{}}
            className="rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Back to cakes &amp; treats
          </Link>
          <Link to="/contact" className="rounded-sm border border-input px-5 py-3 text-sm font-semibold">
            Contact Wendy
          </Link>
        </div>
      </Section>
    </>
  );
}
