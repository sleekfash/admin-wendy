# Rename nav labels: Menu → Cakes & treats, About → Our story

## Goal

Replace the public-facing "Menu" and "About" labels with the warmer, on-brand wording the user chose, while keeping the existing URL routes (`/menu`, `/about`) so bookmarks and SEO stay intact. 

## Changes

1. **Site header** (`src/components/site/SiteHeader.tsx`)
  - Update `NAV` array: `"Menu"` → `"Cakes & treats"`, `"About"` → `"Our story"`.
2. **Site footer** (`src/components/site/SiteFooter.tsx`)
  - Explore column: `"Menu"` link → `"Cakes & treats"`.
  - `"About Wendy"` link → `"Our story"`.
3. **Menu page** (`src/routes/menu.index.tsx`)
  - `TITLE` meta: rewrite around "Cakes & treats".
  - `PageHeader` `eyebrow`: `"Menu"` → `"Cakes & treats"`.
  - Keep the route slug `/menu` unchanged.
4. **About page** (`src/routes/about.tsx`)
  - `TITLE` meta: rewrite around "Our story".
  - `PageHeader` `eyebrow`: `"About"` → `"Our story"`.
  - Keep the route slug `/about` unchanged.
5. **Homepage CTA** (`src/routes/index.tsx`)
  - Update the secondary hero button copy from `"See the menu & prices"` to `"Browse cakes & treats"` (or similar) so it matches the new label.

## Verification

- Run `bunx tsgo --noEmit` and `bun run build`.
- Spot-check header, footer, `/menu`, `/about`, and homepage hero in the preview for the new labels.