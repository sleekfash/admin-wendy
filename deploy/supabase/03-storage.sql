-- Wendy's Bakehouse — file storage (private buckets for product images and payment slips)
-- Run this THIRD, after 02-data.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'testimonial-images',
  'testimonial-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Product images: admins only. Public pages read them through the app's own
-- image endpoint (/api/public/product-image/*), never straight from storage.
drop policy if exists "admins read product images" on storage.objects;
create policy "admins read product images"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Payment slips: no client-side access at all. Customers upload and admins view
-- them through the app's server code using the secret service key.

-- Testimonial images follow the same server-mediated model. Staff receive a
-- short-lived signed upload URL and storefront visitors receive a short-lived
-- redirect from /api/public/testimonial-image/*.
