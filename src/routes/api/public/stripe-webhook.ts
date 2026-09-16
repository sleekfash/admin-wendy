import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe tells us here when a card payment succeeds or expires. This — not the
 * customer's return trip to the site — is what marks an order paid, so a closed
 * tab can never lose a paid order. Nothing is trusted before the signature is
 * verified.
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
          event.type !== "checkout.session.expired"
        ) {
          return new Response("ignored", { status: 200 });
        }

        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Matching on the session id keeps this idempotent: a replayed event
        // simply rewrites the same row with the same values.
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, payment_status, due_now_cents")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (!order) return new Response("unknown session", { status: 200 });

        // Defense in depth: even a genuinely-signed Stripe event must match the
        // amount our own pricing engine calculated for this order, in CAD. A
        // mismatch is never marked paid — it stays pending for human review.
        if (event.type === "checkout.session.completed") {
          const amountOk =
            session.amount_total === order.due_now_cents &&
            (session.currency ?? "").toLowerCase() === "cad";
          if (!amountOk) return new Response("amount mismatch", { status: 400 });
        }

        if (event.type === "checkout.session.expired") {
          if (order.payment_status === "paid") return new Response("ok", { status: 200 });
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "expired" })
            .eq("id", order.id);
          return new Response("ok", { status: 200 });
        }

        const paid = session.payment_status === "paid";
        const intent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);

        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: paid ? "paid" : "pending",
            payment_reference: intent,
            stripe_payment_intent_id: intent,
            paid_at: paid ? new Date().toISOString() : null,
            ...(paid ? { status: "confirmed" } : {}),
          })
          .eq("id", order.id);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
