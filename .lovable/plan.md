# Deployment Options for Wendy's Bakehouse

## Current state
- The app is a full-stack TanStack Start project using Lovable Cloud (Supabase backend).
- It is already published on Lovable at `https://discovery-bloom-kit.lovable.app`.
- It relies on server functions (`createServerFn`) for pricing, checkout, orders, admin, and storage.
- The custom domain is with Namecheap.

## Your priorities (confirmed)
- Move the backend too, not just the frontend.
- Some server setup is OK.
- Free/cheap first.
- Domain is with Namecheap.

## Four deployment options

### Option 1: Stay on Lovable managed hosting (simplest)
Keep the frontend and backend on Lovable, and point your Namecheap domain to it.

Pros:
- One-click publish, automatic SSL, global CDN, and backups.
- Server functions, storage, auth, and database keep working exactly as today.
- No migration risk or downtime.
- Fastest path to a live custom domain.

Cons:
- Does not satisfy "move the backend."
- Long-term cost and platform dependency.

Best if: you want the easiest, most reliable path and are OK staying on Lovable.

### Option 2: Managed Supabase + Namecheap cPanel frontend
Move the database/auth/storage to Supabase's managed service, then build the frontend and upload it to your existing Namecheap cPanel shared host.

Pros:
- Uses hosting you already pay for.
- Supabase has a generous free tier.
- Managed backend handles scaling, backups, and security updates.

Cons:
- cPanel shared hosting is designed for PHP/static sites, not Node.js server functions. You would likely need to build the frontend as a static export and lose some SSR/server-function features, or find a host that supports Node.js processes.
- SPA routing requires `.htaccess` rewrite rules.
- Shared hosting can be slow and has strict resource limits.

Best if: budget is the absolute top priority and you are willing to accept a simpler static frontend.

### Option 3: Managed Supabase + Vercel/Netlify/Cloudflare Pages
Move the backend to Supabase and deploy the frontend to a modern static/edge platform.

Pros:
- Free tiers on all three platforms.
- Excellent global CDN, automatic SSL, and Git-based deployments.
- Much better performance and reliability than shared hosting.
- Easy custom domain setup (can keep Namecheap as registrar).

Cons:
- TanStack Start with server functions needs a compatible runtime; Vercel or Netlify are the most straightforward. Cloudflare Pages also works but may need extra adapter config.
- Another platform to learn and trust.

Best if: you want a cheap but professional stack with good performance and minimal server administration.

### Option 4: Single VPS with Docker (full control)
Rent a small VPS (e.g., Hetzner ~€5/month, DigitalOcean ~$6/month, or AWS Lightsail) and run self-hosted Supabase via Docker Compose plus the built frontend served by Nginx.

Pros:
- Full control over data, backups, and costs.
- Predictable monthly price.
- Can run the full stack including server functions if configured correctly.

Cons:
- You become responsible for SSL certificates, security patches, backups, monitoring, and uptime.
- Higher operational burden than managed options.
- Mistakes can lead to data loss or security issues.

Best if: you want maximum control, are comfortable with Linux/Docker, and accept the admin work.

## Recommendation

Given your priorities — move backend, cheap, OK with some server setup, domain at Namecheap — **Option 3 (Managed Supabase + Vercel/Netlify/Cloudflare Pages)** is the best balance.

Reasoning:
- It is genuinely cheap (often free at your current scale).
- It removes the backend from Lovable while keeping it professionally managed.
- It avoids the limitations and fragility of cPanel shared hosting for a Node.js app.
- It requires less ongoing maintenance than a VPS.

If you are determined to use your existing Namecheap cPanel host, **Option 2** is possible but expect to simplify the frontend to a static export and re-implement any server-function logic as Supabase edge functions or database functions.

## Next steps (if Option 3 is chosen)
1. Create a managed Supabase project and migrate the schema/data from Lovable Cloud.
2. Update environment variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in the project.
3. Configure the chosen frontend platform (Vercel/Netlify/Cloudflare Pages) with build command `npm run build` and output directory `dist/`.
4. Set up the Namecheap domain DNS to point to the chosen platform.
5. Test checkout, admin login, order flow, and slip upload end-to-end.

## Open decision
Please confirm which option you want to pursue, or ask for a deeper comparison between two of them.
