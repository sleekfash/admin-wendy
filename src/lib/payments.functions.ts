import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { cardOrderSchema, type CardOrderInput } from "@/lib/order-schemas";

export type { CardOrderInput };

/** Whether the card option should appear at checkout. */
export const cardPaymentsEnabled = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: Boolean(process.env["STRIPE_SECRET_KEY"]),
}));

/**
 * Creates the order in a pending state, then a Stripe Checkout Session for the
 * server-computed amount due. The browser only receives a redirect URL, so it
 * can never influence what is charged.
 */
export const startCardPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => cardOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const secret = process.env["STRIPE_SECRET_KEY"];
    if (!secret) throw new Error("Card payments are not switched on yet.");

    const { createPricedOrder } = await import("@/lib/order-create.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { default: Stripe } = await import("stripe");

    const { id, reference, cart } = await createPricedOrder(data, {
      checkout_method: "card",
      payment_provider: "stripe",
      payment_status: "pending",
    });

    if (cart.due_now_cents < 100) {
      throw new Error("That amount is too small to charge by card.");
    }

    const origin = new URL(getRequest().url).origin;
    const stripe = new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() });

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          client_reference_id: reference,
          metadata: { order_id: id, reference },
          ...(data.email ? { customer_email: data.email } : {}),
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "cad",
                unit_amount: cart.due_now_cents,
                product_data: {
                  name:
                    cart.balance_cents > 0
                      ? `Wendy's Bakehouse order ${reference} — deposit`
                      : `Wendy's Bakehouse order ${reference}`,
                },
              },
            },
          ],
          success_url: `${origin}/order-confirmed?ref=${reference}`,
          cancel_url: `${origin}/checkout?cancelled=${reference}`,
        },
        { idempotencyKey: `order-${id}` },
      );

      await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", id);

      if (!session.url) throw new Error("no session url");

      return { reference, url: session.url, dueNowCents: cart.due_now_cents };
    } catch (error) {
      // The order stays on record as failed rather than silently disappearing.
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", id);
      console.error("stripe session create failed", error);
      throw new Error("We could not open the card payment page. Please try again.");
    }
  });
