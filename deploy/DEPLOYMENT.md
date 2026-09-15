# Moving Wendy's Bakehouse to your own Supabase + Vercel

Everything below is copy-and-paste. Nothing here changes the site you already
have running — the current site keeps working until you switch the domain over
at the very end.

You will need three free accounts: **GitHub**, **Supabase**, **Vercel**.

Total time: about an hour, most of it waiting.

---

## Part 1 — Get the code into GitHub

The project is already connected to GitHub from inside Lovable
(top right menu → GitHub → Connect). Do that first if it isn't connected yet.

Your repository: `https://github.com/sleekfash/admin-wendy.git`

Everything after this reads from that repository. The site currently live on
Lovable is `https://admin-wendy.lovable.app/` and it keeps working untouched
until you switch the domain over at the very end.

---

## Part 2 — Create your database

1. Go to https://supabase.com and sign up.
2. Click **New project**.
   - Name: `wendys-bakehouse`
   - Database password: generate a strong one and **save it in your password
     manager** — you cannot see it again.
   - Region: `East US (North Virginia)` or `Canada (Central)` if offered.
3. Wait for it to finish setting up (2–3 minutes).

### Load the shop into it

In the left sidebar open **SQL Editor**, then run these four files **in order**.
Open each file from the `deploy/supabase/` folder of this project, copy the whole
contents, paste it into a new query, and press **Run**.

| Order | File | What it does |
| --- | --- | --- |
| 1 | `01-schema.sql` | Creates all the tables, security rules and functions |
| 2 | `02-data.sql` | Loads your categories, products, options, prices and delivery zones |
| 3 | `03-storage.sql` | Creates the private folders for product photos and payment slips |
| 4 | `04-admin-user.sql` | Gives your login admin access — **run this one last, after the next step** |

### Create your admin login

1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email: `admin@wendysbakehouse.ca` (or whatever you prefer), set a strong
   password, and turn **Auto Confirm User** on.
3. Now run `04-admin-user.sql` in the SQL Editor. If you used a different email,
   change the email inside the file first. It prints one row back when it worked.

### Turn public sign-ups off

Left sidebar → **Authentication** → **Sign In / Providers** → **Email**: leave
email/password enabled but switch **Allow new users to sign up** off. Only you
should be able to log in.

### Copy your keys

Left sidebar → **Project Settings** → **API**. Keep this tab open, you need:

- **Project URL** (looks like `https://abcdefgh.supabase.co`)
- **Project reference ID** (the `abcdefgh` part)
- **publishable / anon key** (safe to be public)
- **service_role key** (secret — never share it, never post it anywhere)

---

## Part 3 — Put the website on Vercel

1. Go to https://vercel.com and sign up **with your GitHub account**.
2. **Add New** → **Project** → pick the repository from Part 1 → **Import**.
3. Leave the build settings alone — the project already tells Vercel what to do.
4. Open **Environment Variables** and add these eight, using the values you
   copied above (this list also lives in `.env.example`):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | your publishable / anon key |
   | `VITE_SUPABASE_PROJECT_ID` | your project reference ID |
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | your publishable / anon key |
   | `SUPABASE_PROJECT_ID` | your project reference ID |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key (secret) |
   | `GOOGLE_MAPS_API_KEY` | only if you want distance-based delivery fees (see Part 5) |

5. Click **Deploy** and wait a few minutes. You get a temporary address like
   `wendys-bakehouse.vercel.app`.

---

## Part 4 — Check everything before switching the domain

On the temporary Vercel address, walk through:

- Home page, menu, and a product page — photos and prices show
- Add something to the basket, go to checkout, choose **Pickup**
- Place a bank-transfer order and upload any image as the slip
- Log in at `/auth` with your admin email, open `/admin`, and confirm the order
  appears with the right total and the slip attached
- Delete that test order when you're happy

If a page errors, Vercel → your project → **Logs** shows why. Nine times out of
ten it's a mistyped environment variable.

---

## Part 5 — Point your domain at it

Your domain is registered at Namecheap. You do **not** need the cPanel hosting
for this — Vercel serves the site.

1. Vercel → your project → **Settings** → **Domains** → add
   `wendysbakehouse.ca` and `www.wendysbakehouse.ca`.
2. Vercel shows you the DNS records to create. In Namecheap: **Domain List** →
   **Manage** → **Advanced DNS**, and add exactly what Vercel shows —
   usually an **A record** for `@` pointing to `76.76.21.21` and a **CNAME** for
   `www` pointing to `cname.vercel-dns.com`.
3. Delete any old A/CNAME records for `@` and `www` that pointed at cPanel.
4. Wait for the padlock to appear in Vercel (minutes to a few hours). SSL is
   automatic and free.

Delivery fees: the seeded delivery zones (Etobicoke, West Toronto,
Mississauga/Brampton) work with no extra setup. Only the optional
distance-based mode needs a Google Maps key — create one at
https://console.cloud.google.com with the **Routes API** enabled, restrict it to
your Vercel project, and add it as `GOOGLE_MAPS_API_KEY`.

---

## Afterwards

- **Changing the site**: edit in Lovable as usual; each change pushes to GitHub
  and Vercel rebuilds automatically within a minute or two.
- **Backups**: Supabase → **Database** → **Backups**. The free plan keeps recent
  daily backups; the paid plan keeps more. Consider exporting monthly.
- **Costs**: Vercel Hobby and Supabase Free cover a shop of this size. Watch
  Supabase storage if you upload many product photos.
- **Cancelling nothing yet**: keep the Lovable-published site live for a week
  after the switch, in case you want to fall back.

## What is intentionally not copied

- **Orders and payment slips.** The new shop starts with an empty order book, so
  the one test order and its slip stay behind. Your catalogue, prices, options,
  delivery zones, bank details and WhatsApp number all come across.
