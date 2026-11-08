-- Configure the existing private bucket before enabling direct receipt uploads.
-- Existing receipts remain readable by the admin workflow.
update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
where id = 'payment-slips' and not public;
