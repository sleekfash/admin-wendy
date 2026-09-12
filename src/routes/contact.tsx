import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, Clock, Instagram, Music2, AtSign, Facebook } from "lucide-react";
import { BUSINESS, FAQS } from "@/data/catalog";
import { CtaBand, PageHeader, Section } from "@/components/site/Bits";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "Contact & Etobicoke Pickup — Wendy's Bakehouse";
const DESC =
  "Reach Wendy's Bakehouse on 647-620-2518 or WhatsApp. Pickup in Etobicoke, Toronto, delivery quoted by postcode, and answers on lead times, deposits and allergens.";

export const Route = createFileRoute("/contact")({
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
  component: ContactPage,
});

const SOCIALS = [
  { href: BUSINESS.instagram, label: "Instagram", handle: "@wendys.bakehouse", Icon: Instagram },
  { href: BUSINESS.tiktok, label: "TikTok", handle: "@wendys.bakehouse", Icon: Music2 },
  { href: BUSINESS.threads, label: "Threads", handle: "@wendys.bakehouse", Icon: AtSign },
  { href: BUSINESS.facebook, label: "Facebook", handle: "Wendy's Bakehouse", Icon: Facebook },
];

function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to Wendy, collect in Etobicoke."
        lead="One person answers this phone, so messages get a real reply — usually the same day, always within 24 hours."
      />

      <Section>
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl">Reach me</h2>
            <ul className="mt-6 space-y-4">
              <li>
                <a
                  href={`tel:+${BUSINESS.phoneE164}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 hover:border-primary"
                >
                  <Phone className="h-5 w-5 text-gold" aria-hidden="true" />
                  <span>
                    <span className="block font-display text-xl">{BUSINESS.phoneDisplay}</span>
                    <span className="text-sm text-muted-foreground">Call or text</span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={BUSINESS.whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 hover:border-primary"
                >
                  <MessageCircle className="h-5 w-5 text-gold" aria-hidden="true" />
                  <span>
                    <span className="block font-display text-xl">WhatsApp</span>
                    <span className="text-sm text-muted-foreground">Fastest way to a quote</span>
                  </span>
                </a>
              </li>
            </ul>

            <h3 className="eyebrow mt-10 text-muted-foreground">Follow the bakes</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {SOCIALS.map(({ href, label, handle, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-3 rounded-sm border border-border p-4 text-sm hover:border-primary"
                  >
                    <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span className="text-muted-foreground">{handle}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-3xl">Pickup &amp; delivery</h2>
            <div className="mt-6 space-y-5">
              <div className="flex gap-3 rounded-lg border border-border bg-secondary p-5">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                <p className="text-sm">
                  <strong className="block font-display text-lg">Etobicoke, Toronto</strong>
                  {BUSINESS.pickup}. Delivery across west Toronto is available and quoted by
                  postcode.
                </p>
              </div>
              <div className="flex gap-3 rounded-lg border border-border bg-secondary p-5">
                <Clock className="mt-1 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                <p className="text-sm">
                  <strong className="block font-display text-lg">
                    Now booking {BUSINESS.bookingMonth}
                  </strong>
                  Bookings run by the month with a fixed pickup window. Rush dates are sometimes
                  possible — ask.
                </p>
              </div>
            </div>

            <h2 className="mt-12 text-3xl">Questions</h2>
            <Accordion type="single" collapsible className="mt-4">
              {FAQS.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <p className="mt-8 text-sm text-muted-foreground">
              Ready with the details?{" "}
              <Link to="/menu" className="font-semibold underline decoration-gold decoration-2 underline-offset-4">
                Start an order
              </Link>{" "}
              and I&rsquo;ll come back with a firm quote.
            </p>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
