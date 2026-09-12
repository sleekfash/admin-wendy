import heroCake from "@/assets/hero-cake.jpg";
import meatPies from "@/assets/meat-pies.jpg";
import cakeLoaves from "@/assets/cake-loaves.jpg";
import cupcakes from "@/assets/cupcakes.jpg";

export const BUSINESS = {
  name: "Wendy's Bakehouse",
  descriptor: "Custom Cakes in Toronto & Etobicoke",
  tagline: "Toronto celebration cakes with a Naija heart.",
  phoneDisplay: "647-620-2518",
  phoneE164: "16476202518",
  whatsapp: "https://wa.me/16476202518",
  pickup: "Etobicoke, Toronto — exact address shared once your date is confirmed",
  bookingMonth: "August",
  instagram: "https://www.instagram.com/wendys.bakehouse/",
  tiktok: "https://www.tiktok.com/@wendys.bakehouse",
  threads: "https://www.threads.net/@wendys.bakehouse",
  facebook: "https://www.facebook.com/246575736114342",
} as const;

export type CategoryId = "cakes" | "pastries" | "cupcakes" | "gift-boxes";

export const CATEGORIES: {
  id: CategoryId;
  name: string;
  blurb: string;
  image: string;
}[] = [
  {
    id: "cakes",
    name: "Celebration cakes",
    blurb: "Buttercream, ganache and fondant cakes made to order for birthdays, showers and weddings.",
    image: heroCake,
  },
  {
    id: "pastries",
    name: "Naija pastries & loaves",
    blurb: "Meat pies and cake loaves, baked the Nigerian way, for pickup in Etobicoke.",
    image: meatPies,
  },
  {
    id: "cupcakes",
    name: "Cupcakes",
    blurb: "Regular and themed sets of six or twelve, priced up front.",
    image: cupcakes,
  },
  {
    id: "gift-boxes",
    name: "Gift boxes",
    blurb: "Mixed pastry and cake boxes put together for a person, not a shelf.",
    image: cakeLoaves,
  },
];

export type Product = {
  slug: string;
  name: string;
  category: CategoryId;
  priceBand: string;
  priceNote?: string;
  lead: string;
  short: string;
  description: string;
  options: { label: string; values: string[] }[];
  includes: string[];
  image: string;
};

export const PRODUCTS: Product[] = [
  {
    slug: "signature-6-inch-celebration-cake",
    name: 'Signature 6" two-layer cake',
    category: "cakes",
    priceBand: "$130 – $150 CAD",
    priceNote: "Band, not a fixed price — finish and detail move it.",
    lead: "5–7 days notice",
    short: "The house cake: two layers, smooth buttercream, your colours.",
    description:
      "A two-layer six-inch cake finished in smooth buttercream, ganache or fondant. Serves 8–12 depending on how you cut it. Colours, lettering and simple toppers are included in the band; sculpted work and sugar florals are quoted separately.",
    options: [
      { label: "Finish", values: ["Buttercream", "Ganache", "Fondant"] },
      { label: "Flavour", values: ["Vanilla", "Red Velvet", "Chocolate", "Cookies & Cream", "Coconut", "Strawberry"] },
      { label: "Size", values: ['6" two-layer', '8" two-layer (quoted)', "Tiered (quoted)"] },
    ],
    includes: ["Colour matching", "Message or lettering", "Cake board and box", "Pickup in Etobicoke"],
    image: heroCake,
  },
  {
    slug: "wedding-and-tiered-cakes",
    name: "Wedding & tiered cakes",
    category: "cakes",
    priceBand: "Quoted per design",
    priceNote: "Tasting and consultation before any deposit.",
    lead: "4–8 weeks notice",
    short: "Multi-tier cakes for weddings, anniversaries and introductions.",
    description:
      "Two tiers and up, built for a room rather than a table. We agree the design, servings and finish first, then a written quote and a date hold. Traditional-wedding and introduction cakes welcome.",
    options: [
      { label: "Tiers", values: ["2 tiers", "3 tiers", "More"] },
      { label: "Finish", values: ["Buttercream", "Fondant"] },
    ],
    includes: ["Design consultation", "Written quote before deposit", "Delivery quoted separately"],
    image: heroCake,
  },
  {
    slug: "baby-shower-cake",
    name: "Baby shower & gender reveal cake",
    category: "cakes",
    priceBand: "From $130 CAD",
    lead: "5–7 days notice",
    short: "Six-inch and eight-inch cakes for showers and reveals.",
    description:
      "Shower cakes in the palette you have already picked for the day, with a reveal filling if you want one. Send the invite and I will match it.",
    options: [
      { label: "Size", values: ['6" two-layer', '8" two-layer'] },
      { label: "Reveal filling", values: ["Yes", "No"] },
    ],
    includes: ["Palette matching", "Reveal filling on request", "Cake board and box"],
    image: heroCake,
  },
  {
    slug: "nigerian-meat-pies",
    name: "Nigerian meat pies",
    category: "pastries",
    priceBand: "Quoted by the dozen",
    priceNote: "Price confirmed with your order — ask for the current rate.",
    lead: "3–4 days notice",
    short: "Flaky, properly seasoned, baked the day you collect them.",
    description:
      "Hand-crimped meat pies with a short, flaky crust and a seasoned beef and potato filling. Baked fresh for your pickup slot, not frozen ahead. Sold by the dozen for parties, meetings and church.",
    options: [
      { label: "Quantity", values: ["1 dozen", "2 dozen", "3+ dozen"] },
      { label: "Serving", values: ["Room temperature", "Warm for pickup"] },
    ],
    includes: ["Baked the morning of pickup", "Party trays on request", "Pickup in Etobicoke"],
    image: meatPies,
  },
  {
    slug: "cake-loaves",
    name: "Cake loaves",
    category: "pastries",
    priceBand: "Quoted per loaf",
    priceNote: "Discount when you order more than one.",
    lead: "3–4 days notice",
    short: "Six flavours, sliceable, made for sharing and gifting.",
    description:
      "Moist cake loaves in Vanilla, Red Velvet, Chocolate, Cookies & Cream, Coconut and Strawberry. Order two or more and the price per loaf drops. Popular as a house gift and for office trays.",
    options: [
      { label: "Flavour", values: ["Vanilla", "Red Velvet", "Chocolate", "Cookies & Cream", "Coconut", "Strawberry"] },
      { label: "Quantity", values: ["1 loaf", "2 loaves", "3+ loaves"] },
    ],
    includes: ["Sliced on request", "Gift wrapping available", "Pickup in Etobicoke"],
    image: cakeLoaves,
  },
  {
    slug: "small-chops-and-party-pastries",
    name: "Small chops & party pastries",
    category: "pastries",
    priceBand: "Quoted per tray",
    lead: "1 week notice for trays",
    short: "Party trays for naming ceremonies, showers and get-togethers.",
    description:
      "Mixed party pastry trays put together around your guest count. Tell me the number of guests and the occasion and I will come back with a tray size and a price.",
    options: [
      { label: "Guests", values: ["Up to 20", "20–50", "50+"] },
    ],
    includes: ["Guest-count sizing", "Serving trays", "Pickup in Etobicoke"],
    image: meatPies,
  },
  {
    slug: "cupcakes-set-of-six",
    name: "Cupcakes, set of six",
    category: "cupcakes",
    priceBand: "$35 regular · $45 themed",
    lead: "3–5 days notice",
    short: "Six cupcakes, plain buttercream or themed to your event.",
    description:
      "Six cupcakes with piped buttercream. Regular sets come in your chosen colour; themed sets add toppers, characters and lettering matched to the occasion.",
    options: [
      { label: "Style", values: ["Regular — $35", "Themed — $45"] },
      { label: "Flavour", values: ["Vanilla", "Red Velvet", "Chocolate", "Cookies & Cream"] },
    ],
    includes: ["Presentation box", "Colour matching", "Pickup in Etobicoke"],
    image: cupcakes,
  },
  {
    slug: "cupcakes-set-of-twelve",
    name: "Cupcakes, set of twelve",
    category: "cupcakes",
    priceBand: "$65 regular · $75 themed",
    lead: "3–5 days notice",
    short: "A dozen cupcakes — the office, classroom and small-party size.",
    description:
      "Twelve cupcakes with piped buttercream, regular or fully themed. The most-ordered set for offices, classrooms and small birthdays.",
    options: [
      { label: "Style", values: ["Regular — $65", "Themed — $75"] },
      { label: "Flavour", values: ["Vanilla", "Red Velvet", "Chocolate", "Cookies & Cream"] },
    ],
    includes: ["Presentation box", "Mixed flavours allowed", "Pickup in Etobicoke"],
    image: cupcakes,
  },
  {
    slug: "celebration-gift-box",
    name: "Celebration gift box",
    category: "gift-boxes",
    priceBand: "From $30+ CAD",
    lead: "3–5 days notice",
    short: "A boxed mix of cake, pastry and treats, wrapped and ready to hand over.",
    description:
      "A gift box built around a budget you set. Cake loaf slices, cupcakes, meat pies and treats, boxed and wrapped with a card. Good for birthdays you cannot attend and for saying thank you.",
    options: [
      { label: "Budget", values: ["$30–$50", "$50–$80", "$80+"] },
      { label: "Contents", values: ["Sweet only", "Sweet and savoury"] },
    ],
    includes: ["Wrapping and card", "Contents agreed with you", "Pickup in Etobicoke"],
    image: cakeLoaves,
  },
  {
    slug: "corporate-gift-boxes",
    name: "Corporate & bulk gift boxes",
    category: "gift-boxes",
    priceBand: "Quoted per order",
    lead: "2 weeks notice",
    short: "Multiple boxes for teams, clients and events.",
    description:
      "Repeat boxes for teams and clients, packed to the same spec. Tell me the box count, budget per box and the date they need to be collected.",
    options: [
      { label: "Boxes", values: ["5–10", "10–25", "25+"] },
    ],
    includes: ["Consistent packing", "Invoice on request", "Bulk pickup slot"],
    image: cakeLoaves,
  },
];

export const PRICE_BANDS = [
  { item: 'Signature 6" two-layer cake', price: "$130 – $150" },
  { item: "Cupcakes, 6 regular", price: "$35" },
  { item: "Cupcakes, 6 themed", price: "$45" },
  { item: "Cupcakes, 12 regular", price: "$65" },
  { item: "Cupcakes, 12 themed", price: "$75" },
  { item: "Gift boxes", price: "from $30+" },
  { item: "Cake loaves", price: "$28 each" },
  { item: "Meat or chicken pies, pack of 12", price: "$28" },
];

export const FAQS = [
  {
    q: "How much notice do you need?",
    a: "Three to five days for cupcakes, loaves, pies and gift boxes. Five to seven days for a custom cake. Four to eight weeks for weddings and tiered cakes. Ask anyway if your date is sooner — sometimes there is room.",
  },
  {
    q: "Where do I collect my order?",
    a: "Pickup is in Etobicoke, Toronto. The exact address is sent to you once your date and payment are confirmed.",
  },
  {
    q: "Do you deliver?",
    a: "Yes, across west Toronto and nearby. Enter your postal code at checkout and the delivery fee for your area is added to your total before you pay.",
  },
  {
    q: "How do I pay and hold my date?",
    a: "You pay at checkout — in full for everyday items, or a deposit for tiered and themed cakes with the balance due before collection. Your date is held once payment is confirmed.",
  },
  {
    q: "How are cake prices worked out?",
    a: "Every cake shows a starting price, and the size and finish you choose add a set amount on top. The total you see at checkout is the price you pay.",
  },
  {
    q: "Allergies and dietary needs?",
    a: "Everything is baked in one kitchen that handles wheat, dairy, egg and nuts, so cross-contact cannot be ruled out. Tell me about allergies in your order and I will tell you plainly whether I can do it safely.",
  },
];
