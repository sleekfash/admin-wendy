import { createFileRoute } from "@tanstack/react-router";
import { nextOrderStatuses, nextPaymentStatuses } from "@/lib/order-status";

type StripeOrder = {
  id: string;
  status: string;
  payment_status: string;
  payment_provider: string | null;
  stripe_session_id: string | null;
};

type StripeOrderPatch = {
  status?: string;
  payment_status: string;
  payment_reference?: string | null;
  stripe_payment_intent_id?: string | null;
  paid_at?: string;
};

function planCheckoutUpdate(
  order: StripeOrder,
  eventType: "checkout.session.completed" | "checkout.session.expired",
  session: import("stripe").Stripe.Checkout.Session,
  paidAt: string,
): StripeOrderPatch | null {
  if (eventType === "checkout.session.expired") {
    if (order.payment_status !== "pending") return null;
    if (!nextPaymentStatuses(order.payment_status).includes("expired")) {
      throw new Error(`Invalid payment transition from ${order.payment_status} to expired.`);
    }
    return { payment_status: "expired" };
  }

  if (session.payment_status !== "paid") return null;
  if (order.payment_status === "paid" || order.payment_status === "refunded") return null;
  if (!nextPaymentStatuses(order.payment_status).includes("paid")) {
    throw new Error(`Invalid payment transition from ${order.payment_status} to paid.`);
  }

  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const patch: StripeOrderPatch = {
    payment_status: "paid",
    payment_reference: intent,
    stripe_payment_intent_id: intent,
    paid_at: paidAt,
  };

  if (order.status === "new") {
    if (!nextOrderStatuses(order.status).includes("confirmed")) {
      throw new Error(`Invalid order transition from ${order.status} to confirmed.`);
    }
    patch.status = "confirmed";
  }

  return patch;
}

function planRefundUpdate(order: StripeOrder): StripeOrderPatch | null {
  if (order.payment_status === "refunded") return null;
  if (order.payment_status !== "paid") {
    // Stripe can deliver related event types out of order. A 500 makes it retry
    // after checkout.session.completed has persisted the paid transition.
    throw new Error(`Refund arrived while payment was ${order.payment_status}.`);
  }
  if (!nextPaymentStatuses(order.payment_status).includes("refunded")) {
    throw new Error(`Invalid payment transition from ${order.payment_status} to refunded.`);
  }
  return { payment_status: "refunded" };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Stripe tells us here when a card payment succeeds, expires, or is fully
 * refunded. This — not the customer's return trip to the site — owns payment
 * state, so a closed tab can never lose a provider-confirmed transition.
 */
export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_SECRET_KEY"];
        const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret || !webhookSecret) return new Response("Not configured", { status: 503 });

        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() });

        let event: import("stripe").Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            webhookSecret,
            undefined,
            Stripe.createSubtleCryptoProvider(),
          );
        } catch {
          return new Response("Invalid signature", { status: 400 });
        }

        if (
          event.type !== "checkout.session.completed" &&
          event.type !== "checkout.session.expired" &&
          event.type !== "charge.refunded"
        ) {
          return new Response("ignored", { status: 200 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const paidAt = new Date(event.created * 1000).toISOString();
        const session =
          event.type === "charge.refunded"
            ? null
            : (event.data.object as import("stripe").Stripe.Checkout.Session);
        const charge =
          event.type === "charge.refunded"
            ? (event.data.object as import("stripe").Stripe.Charge)
            : null;
        if (charge && !charge.refunded) {
          return new Response("partial refund ignored", { status: 200 });
        }

        const intent = charge
          ? typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? null)
          : null;
        const metadataOrderId = charge?.metadata?.["order_id"] ?? null;
        const objectId = session?.id ?? charge?.id ?? "unknown";

        try {
          // Optimistic filters make duplicate and out-of-order deliveries safe.
          // One re-read resolves a concurrent admin or webhook update.
          for (let attempt = 0; attempt < 2; attempt += 1) {
            let order: StripeOrder | null = null;

            if (session) {
              const result = await supabaseAdmin
                .from("orders")
                .select("id, status, payment_status, payment_provider, stripe_session_id")
                .eq("stripe_session_id", session.id)
                .maybeSingle();
              if (result.error) throw result.error;
              order = result.data;
            } else {
              if (intent) {
                const result = await supabaseAdmin
                  .from("orders")
                  .select("id, status, payment_status, payment_provider, stripe_session_id")
                  .eq("stripe_payment_intent_id", intent)
                  .maybeSingle();
                if (result.error) throw result.error;
                order = result.data;
              }

              // PaymentIntent metadata is copied to the Charge and lets an
              // out-of-order refund find the order before completion is stored.
              if (!order && metadataOrderId && UUID_PATTERN.test(metadataOrderId)) {
                const result = await supabaseAdmin
                  .from("orders")
                  .select("id, status, payment_status, payment_provider, stripe_session_id")
                  .eq("id", metadataOrderId)
                  .maybeSingle();
                if (result.error) throw result.error;
                order = result.data;
              }
            }

            if (!order) {
              console.warn("stripe webhook could not find its order", {
                eventId: event.id,
                eventType: event.type,
                objectId,
              });
              return new Response("unknown session", { status: 200 });
            }
            if (charge && order.payment_provider !== "stripe" && !order.stripe_session_id) {
              console.warn("stripe refund did not match a card order", {
                eventId: event.id,
                objectId,
                orderId: order.id,
              });
              return new Response("unknown payment", { status: 200 });
            }

            let patch: StripeOrderPatch | null;
            if (event.type === "charge.refunded") {
              patch = planRefundUpdate(order);
            } else {
              patch = planCheckoutUpdate(
                order,
                event.type,
                event.data.object as import("stripe").Stripe.Checkout.Session,
                paidAt,
              );
            }
            if (!patch) return new Response("ok", { status: 200 });

            const { data: updated, error: updateError } = await supabaseAdmin
              .from("orders")
              .update(patch)
              .eq("id", order.id)
              .eq("status", order.status)
              .eq("payment_status", order.payment_status)
              .select("id")
              .maybeSingle();
            if (updateError) throw updateError;
            if (updated) return new Response("ok", { status: 200 });
          }

          throw new Error("The order changed repeatedly while processing the event.");
        } catch (error) {
          console.error("stripe webhook persistence failed", {
            eventId: event.id,
            eventType: event.type,
            objectId,
            error,
          });
          return new Response("Temporary persistence failure", { status: 500 });
        }
      },
    },
  },
});
