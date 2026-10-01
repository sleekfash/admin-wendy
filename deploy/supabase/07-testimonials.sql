-- Wendy's Bakehouse — testimonial slider and branded review-image uploads
-- Existing projects: run after 06-product-image-storage.sql.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  alt_text text not null default 'Customer review for Wendy''s Bakehouse',
  customer_label text not null default 'Wendy''s Bakehouse customer',
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonials_image_path_check
    check (image_path ~ '^testimonials/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  constraint testimonials_sort_order_check check (sort_order between 0 and 9999)
);

drop trigger if exists testimonials_updated_at on public.testimonials;
create trigger testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.update_updated_at_column();

alter table public.testimonials enable row level security;

drop policy if exists "staff manage testimonials" on public.testimonials;
create policy "staff manage testimonials"
  on public.testimonials to authenticated
  using (public.is_staff())
  with check (public.is_staff());

revoke all on table public.testimonials from public, anon, authenticated;
grant all on table public.testimonials to service_role;

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

-- Bytes move through signed URLs issued by authenticated server functions;
-- public storefront reads are signed by /api/public/testimonial-image/*.
