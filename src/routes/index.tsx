import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, MapPin, Clock, Sparkles } from "lucide-react";
import heroArtwork from "@/assets/brand/wendys-billboard.jpeg.asset.json";
import reviewArtwork from "@/assets/customer-review.png.asset.json";
import { BUSINESS } from "@/data/catalog";
import {
  CtaBand,
  Eyebrow,
  ProductCard,
  ProductCardSkeleton,
  Section,
} from "@/components/site/Bits";
import { SmartImage } from "@/components/site/SmartImage";
import { catalogQueryOptions, categoryImage, formatMoney, packLabel } from "@/lib/shop";

const TITLE = "Wendy's Bakehouse — Custom Cakes in Toronto & Etobicoke";
const DESC =
  "Toronto celebration cakes with a Naija heart. Custom cakes from $130, cupcakes from $35, meat pies and cake loaves — made to order for pickup in Etobicoke.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STEPS = [
  { n: "01", t: "Tell me the details", d: "Flavour, size, date and the look you want — through the order form or WhatsApp." },
  { n: "02", t: "I confirm your date", d: "You see the price as you order, and I confirm your pickup window." },
  { n: "03", t: "Pay to hold the slot", d: "Payment secures your date. I only take what I can bake properly." },
  { n: "04", t: "Collect in Etobicoke", d: "Address shared on confirmation. Delivery is available for a fee." },
];

function Index() {
  const { data, isPending } = useQuery(catalogQueryOptions);
  const products = data?.products ?? [];
  const categories = data?.categories ?? [];
  const signature = products.slice(0, 4);


  return (
    <>
      <section className="relative bg-cocoa text-cocoa-foreground">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 md:grid-cols-12 md:items-center md:py-20">
          <div className="relative md:order-2 md:col-span-6">
            <div className="absolute -inset-2 rounded-[1.65rem] border border-gold/35 bg-cocoa-blush/15 blur-sm" aria-hidden="true" />
            <img
              src={heroArtwork.url}
              alt="Wendy's Bakehouse custom cakes billboard featuring a pink leopard-print celebration cake"
              className="relative aspect-[5/4] w-full rounded-[1.35rem] border border-gold/45 object-cover shadow-2xl"
            />
          </div>
          <div className="md:order-1 md:col-span-6">
            <Eyebrow>Now booking {BUSINESS.bookingMonth}</Eyebrow>
            <h1 className="mt-5 text-[2.5rem] leading-[1.03] md:text-6xl">
              Toronto celebration cakes with a{" "}
              <span className="text-gold">Naija</span> heart.
            </h1>
            <p className="mt-6 max-w-[56ch] text-lg text-cocoa-foreground/75">
              Made to order in Etobicoke by a Certified Food Handler. Custom cakes, cupcakes and
              gift boxes alongside the meat pies and cake loaves you grew up on — with the prices
              written down, so you never have to DM to find out.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/menu"
                className="rounded-sm bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start an order
              </Link>
              <Link
                to="/menu"
                className="rounded-sm border border-cocoa-foreground/30 px-6 py-3.5 text-sm font-semibold transition-colors hover:border-gold hover:text-gold"
              >
                Browse cakes &amp; treats
              </Link>
            </div>
            <ul className="mt-10 grid gap-4 border-t border-cocoa-foreground/15 pt-6 text-sm text-cocoa-foreground/75 sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" /> Certified Food Handler
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold" aria-hidden="true" /> Pickup in Etobicoke
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" /> Gift boxes from $30
              </li>
            </ul>
          </div>
        </div>
      </section>

      <Section>
        <Eyebrow>Shop by collection</Eyebrow>
        <h2 className="mt-4 text-3xl md:text-4xl">Two collections, one kitchen.</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/menu"
              search={{ category: c.slug }}
              className="group overflow-hidden rounded-[1.5rem] border border-border bg-card p-2"
            >
              <SmartImage
                src={categoryImage(c, products)}
                alt={c.name}
                ratio="aspect-[4/3]"
                className="transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="p-5">
                <h3 className="font-display text-xl group-hover:text-primary">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.blurb}</p>
              </div>
            </Link>
          ))}
        </div>

      </Section>

      <Section tone="sand">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Eyebrow>Prices at a glance</Eyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl">No &ldquo;DM for price&rdquo;.</h2>
            <p className="mt-5 max-w-[46ch] text-muted-foreground">
              These are the real prices you pay, in CAD. Sizes and finishes that cost more are
              listed with exactly how much they add, so nothing is a surprise at checkout.
            </p>
            <Link
              to="/pricing"
              className="mt-6 inline-block border-b-2 border-gold pb-1 text-sm font-semibold"
            >
              Full pricing &amp; lead times
            </Link>
          </div>
          <div className="md:col-span-7">
            <dl className="divide-y divide-border border-y border-border">
              {products
                .filter((p) => p.available && p.price_cents != null)
                .slice(0, 8)
                .map((p) => (
                  <div key={p.slug} className="flex items-baseline justify-between gap-6 py-4">
                    <dt className="text-sm md:text-base">
                      {p.name}
                      {packLabel(p) && (
                        <span className="block text-xs text-muted-foreground">{packLabel(p)}</span>
                      )}
                    </dt>
                    <dd className="shrink-0 font-display text-lg text-gold">
                      {formatMoney(p.price_cents)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
      </Section>

      <Section>
        <Eyebrow>How ordering works</Eyebrow>
        <h2 className="mt-4 text-3xl md:text-4xl">Four steps, one conversation.</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t-2 border-gold/50 pt-5">
              <span className="font-display text-3xl text-gold">{s.n}</span>
              <h3 className="mt-3 font-display text-xl">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <SmartImage
              src={reviewArtwork.url}
              alt="Customer review messages praising Wendy's Bakehouse vanilla and red velvet cake"
              ratio="aspect-square"
            />
          </div>
          <div className="md:col-span-7">
            <Eyebrow>Real feedback, real love</Eyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl">What customers say.</h2>
            <figure className="mt-8 border-l-2 border-gold pl-5">
              <blockquote className="text-lg">
                &ldquo;I just tasted the cake and it tastes so rich. Both vanilla and red velvet.
                Just the right amount of sugar. Not sugary!! Thank you so much.&rdquo;
              </blockquote>
              <figcaption className="mt-3 text-sm text-muted-foreground">
                Birthday cake customer, Etobicoke
              </figcaption>
            </figure>
            <figure className="mt-6 border-l-2 border-gold/50 pl-5">
              <blockquote className="text-lg">
                &ldquo;Thank you, I just got the cake — absolutely loved it!&rdquo;
              </blockquote>
              <figcaption className="mt-3 text-sm text-muted-foreground">
                Celebration cake customer, Toronto
              </figcaption>
            </figure>
            <ul className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" /> Rich flavour
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" /> Just-right sweetness
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gold" aria-hidden="true" /> Ready on your date
              </li>
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="sand">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Signature bakes</Eyebrow>
            <h2 className="mt-4 text-3xl md:text-4xl">Most-ordered this season.</h2>
          </div>
          <Link to="/menu" className="border-b-2 border-gold pb-1 text-sm font-semibold">
            View the whole menu
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isPending
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : signature.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>

      </Section>

      <Section tone="cocoa">
        <Eyebrow>Why order here</Eyebrow>
        <div className="mt-8 grid gap-10 md:grid-cols-3">
          <div>
            <ShieldCheck className="h-6 w-6 text-gold" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl">Certified and careful</h3>
            <p className="mt-3 text-cocoa-foreground/70">
              Ontario Certified Food Handler. Everything is baked to order for your date — nothing
              is pulled out of a freezer.
            </p>
          </div>
          <div>
            <Sparkles className="h-6 w-6 text-gold" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl">Both sides of the table</h3>
            <p className="mt-3 text-cocoa-foreground/70">
              A fondant birthday cake and three dozen meat pies can come from the same order. Very
              few Toronto bakers do both properly.
            </p>
          </div>
          <div>
            <Clock className="h-6 w-6 text-gold" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl">Dates you can trust</h3>
            <p className="mt-3 text-cocoa-foreground/70">
              Bookings run by the month with a fixed pickup window, so your slot is real and your
              cake is ready when you arrive.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
