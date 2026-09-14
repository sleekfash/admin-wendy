-- Wendy's Bakehouse — give your account admin access.
-- Run this LAST, and only after you have created the login you want to use as
-- the admin (Authentication -> Users -> Add user, with "Auto Confirm User" on).
--
-- Replace the email below with that login's email address, then run.

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'admin@wendysbakehouse.ca'
on conflict (user_id, role) do nothing;

-- Check it worked: this should return one row.
select u.email, r.role
from public.user_roles r
join auth.users u on u.id = r.user_id;
