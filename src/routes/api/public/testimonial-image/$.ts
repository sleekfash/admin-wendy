import { createFileRoute } from "@tanstack/react-router";

const TESTIMONIAL_PATH = /^testimonials\/[0-9a-f-]{36}\.(?:jpe?g|png|webp)$/i;

export const Route = createFileRoute("/api/public/testimonial-image/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!TESTIMONIAL_PATH.test(path)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("testimonial-images")
          .createSignedUrl(path, 3600);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(null, {
          status: 302,
          headers: {
            location: data.signedUrl,
            "cache-control": "public, max-age=300",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
