import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import meatPies from "@/assets/meat-pies.jpg";
import cakeLoaves from "@/assets/cake-loaves.jpg";
import { CtaBand, Eyebrow, PageHeader, Section } from "@/components/site/Bits";

const TITLE = "Our story — Naija Cakes & Pastries in Toronto";
const DESC =
  "A one-woman Etobicoke bakehouse: Certified Food Handler, made-to-order celebration cakes, and the Nigerian meat pies and cake loaves Toronto's diaspora asks for.";

export const Route = createFileRoute("/about")({
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
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="One baker, one kitchen, two traditions."
        lead="Wendy's Bakehouse is a made-to-order bakery in Etobicoke. Not a chain, not a shopfront — one Certified Food Handler baking to a date you have circled on a calendar."
      />

      <Section>
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="text-lg leading-relaxed">
              Most orders start the same way: someone has a party in ten days and needs a cake that
              looks like the one in their head. Some of them also want three dozen meat pies,
              because in a Nigerian house a celebration is not only sweet.
            </p>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              That is the whole reason this bakehouse exists in the shape it does. Toronto has good
              cake decorators and it has good Naija kitchens; it has very few places where you can
              order a fondant birthday cake and a tray of properly seasoned pies in one message and
              collect them together. Everything is baked to order for your pickup slot — nothing is
              made ahead and frozen.
            </p>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              Buttercream and ganache are the house strengths; fondant is available and takes
              longer, which is why it is quoted separately. Bookings run by the month so that the
              number of cakes leaving this kitchen stays honest.
            </p>

            <div className="mt-10 flex items-start gap-4 rounded-lg border border-border bg-secondary p-6">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-gold" aria-hidden="true" />
              <p className="text-sm">
                <strong className="block font-display text-lg">Certified Food Handler</strong>
                Ontario food handler certification covers safe preparation, storage and
                temperature control. It is why allergen questions get a straight answer rather
                than a shrug.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:col-span-5">
            <img
              src={meatPies}
              alt="Golden hand-crimped Nigerian meat pies cooling on parchment"
              loading="lazy"
              className="w-full rounded-[1.5rem] object-cover"
            />
            <img
              src={cakeLoaves}
              alt="Sliced red velvet and vanilla cake loaves"
              loading="lazy"
              className="w-full rounded-[1.5rem] object-cover"
            />
          </div>
        </div>
      </Section>

      <Section tone="cocoa">
        <Eyebrow>The Naija side of the menu</Eyebrow>
        <h2 className="mt-4 max-w-3xl text-3xl md:text-4xl">
          Meat pies and cake loaves get the same care as a wedding tier.
        </h2>
        <p className="mt-5 max-w-[64ch] text-cocoa-foreground/75">
          Nothing on this menu is a novelty item. The pies are hand-crimped and baked the morning
          you collect them; the loaves come in six flavours and get cheaper by the loaf when you
          order for a crowd. If you are ordering for a naming ceremony, an introduction or a
          Sunday gathering, say so — the quantities and the timing are different, and I plan for it.
        </p>
      </Section>

      <CtaBand />
    </>
  );
}
