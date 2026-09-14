import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, MessageCircle } from "lucide-react";
import { Lockup } from "./Brand";
import { BUSINESS } from "@/data/catalog";
import { CartDrawer } from "@/components/site/CartDrawer";



const NAV = [
  { to: "/menu", label: "Cakes & treats" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "Our story" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);


  return (
    <>
      <div className="bg-cocoa text-cocoa-foreground">
        <p className="eyebrow mx-auto max-w-[1200px] px-5 py-2 text-center text-[11px] text-cocoa-foreground/80">
          Now booking {BUSINESS.bookingMonth} · Pickup in Etobicoke · Certified Food Handler
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-3">
          <Lockup />

          <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
                activeProps={{ className: "text-primary" }}
              >
                {item.label}
              </Link>
            ))}
            <CartDrawer />
            <Link
              to="/menu"
              className="rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start an order
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <CartDrawer />
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-sm border border-input px-3 py-2 text-sm font-medium"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              Menu
            </button>
          </div>

        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-cocoa px-5 py-4 text-cocoa-foreground md:hidden">
          <div className="flex items-center justify-between">
            <Lockup tone="cream" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-sm border border-cocoa-foreground/25 p-2"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile" className="mt-10 flex flex-col gap-6">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="font-display text-3xl text-cocoa-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3 pb-4">
            <Link
              to="/menu"
              onClick={() => setOpen(false)}
              className="rounded-sm bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
            >
              Start an order
            </Link>
            <a
              href={BUSINESS.whatsapp}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-cocoa-foreground/30 px-4 py-3 text-sm font-semibold"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp {BUSINESS.phoneDisplay}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
