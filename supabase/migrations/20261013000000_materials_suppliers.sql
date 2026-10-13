-- Materials & Suppliers directory (App_1)
-- Public can read VERIFIED suppliers and register new ones (unverified until
-- an admin flips is_verified in the Supabase dashboard). Quote requests are
-- logged for analytics only; the actual quote happens on WhatsApp.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  area text,
  city text,
  delivery_radius_km int,
  service_pincodes text[] not null default '{}',
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  person_name text not null,
  role text,
  whatsapp text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null,
  unit text,
  indicative_price numeric,
  price_updated_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  product_id uuid references public.supplier_products(id) on delete set null,
  quantity numeric,
  pincode text,
  created_at timestamptz not null default now()
);

create index if not exists suppliers_category_idx on public.suppliers (category);
create index if not exists suppliers_city_idx on public.suppliers (lower(city));
create index if not exists supplier_products_supplier_idx on public.supplier_products (supplier_id);
create index if not exists supplier_contacts_supplier_idx on public.supplier_contacts (supplier_id);

-- Lets anonymous registrants attach contacts/products to their own pending
-- supplier row without being able to read unverified rows back.
create or replace function public.supplier_is_pending(sid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.suppliers s
    where s.id = sid and s.is_verified = false
      and s.created_at > now() - interval '1 hour'
  );
$$;

alter table public.suppliers enable row level security;
alter table public.supplier_contacts enable row level security;
alter table public.supplier_products enable row level security;
alter table public.quote_requests enable row level security;

drop policy if exists "Public can read verified suppliers" on public.suppliers;
create policy "Public can read verified suppliers"
  on public.suppliers for select
  using (is_verified = true);

drop policy if exists "Public can register pending suppliers" on public.suppliers;
create policy "Public can register pending suppliers"
  on public.suppliers for insert
  with check (is_verified = false);

drop policy if exists "Public can read contacts of verified suppliers" on public.supplier_contacts;
create policy "Public can read contacts of verified suppliers"
  on public.supplier_contacts for select
  using (exists (select 1 from public.suppliers s where s.id = supplier_id and s.is_verified = true));

drop policy if exists "Public can add contacts to pending suppliers" on public.supplier_contacts;
create policy "Public can add contacts to pending suppliers"
  on public.supplier_contacts for insert
  with check (public.supplier_is_pending(supplier_id));

drop policy if exists "Public can read products of verified suppliers" on public.supplier_products;
create policy "Public can read products of verified suppliers"
  on public.supplier_products for select
  using (exists (select 1 from public.suppliers s where s.id = supplier_id and s.is_verified = true));

drop policy if exists "Public can add products to pending suppliers" on public.supplier_products;
create policy "Public can add products to pending suppliers"
  on public.supplier_products for insert
  with check (public.supplier_is_pending(supplier_id));

drop policy if exists "Anyone can log a quote request" on public.quote_requests;
create policy "Anyone can log a quote request"
  on public.quote_requests for insert
  with check (true);
