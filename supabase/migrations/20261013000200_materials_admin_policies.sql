-- Lets the app owner/admin review pending suppliers inside the app.
-- Admin = a confirmed account with app_metadata.is_admin = true, or the owner
-- email. user_metadata is deliberately NOT trusted: users can edit it.

create or replace function public.is_app_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true', false)
      or coalesce(auth.jwt() ->> 'email' = 'pgbalaadithya@gmail.com', false);
$$;

drop policy if exists "Admins can read all suppliers" on public.suppliers;
create policy "Admins can read all suppliers"
  on public.suppliers for select using (public.is_app_admin());

drop policy if exists "Admins can update suppliers" on public.suppliers;
create policy "Admins can update suppliers"
  on public.suppliers for update using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists "Admins can delete suppliers" on public.suppliers;
create policy "Admins can delete suppliers"
  on public.suppliers for delete using (public.is_app_admin());

drop policy if exists "Admins can read all contacts" on public.supplier_contacts;
create policy "Admins can read all contacts"
  on public.supplier_contacts for select using (public.is_app_admin());

drop policy if exists "Admins can read all products" on public.supplier_products;
create policy "Admins can read all products"
  on public.supplier_products for select using (public.is_app_admin());
