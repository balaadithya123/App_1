-- Migration: Home Reminders and Maintenance Catalog
-- Standalone migration for recurring home-maintenance tracking for customers

-- 1. home_items table: private per-user recurring maintenance tracking
create table if not exists public.home_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,
  label text not null,
  last_serviced_date date not null,
  interval_months integer not null check (interval_months > 0),
  category_slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_home_items_user_id on public.home_items(user_id);
create index if not exists idx_home_items_last_serviced on public.home_items(last_serviced_date);

alter table public.home_items enable row level security;

-- Grants for home_items
grant select, insert, update, delete on public.home_items to authenticated;

-- RLS: A user can only select/insert/update/delete their own rows.
-- Private per-user; no admin or worker visibility.
drop policy if exists "Users can select their own home_items" on public.home_items;
create policy "Users can select their own home_items"
  on public.home_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own home_items" on public.home_items;
create policy "Users can insert their own home_items"
  on public.home_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own home_items" on public.home_items;
create policy "Users can update their own home_items"
  on public.home_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own home_items" on public.home_items;
create policy "Users can delete their own home_items"
  on public.home_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2. maintenance_catalog table: static reference data, admin-only write
create table if not exists public.maintenance_catalog (
  id uuid primary key default gen_random_uuid(),
  item_type text not null unique,
  default_label text not null,
  default_interval_months integer not null check (default_interval_months > 0),
  category_slug text not null,
  icon_name text not null,
  created_at timestamptz not null default now()
);

alter table public.maintenance_catalog enable row level security;

-- Grants for maintenance_catalog
grant select on public.maintenance_catalog to anon, authenticated;
grant insert, update, delete on public.maintenance_catalog to authenticated;

-- RLS: Public/authenticated can read catalog
drop policy if exists "Anyone can read maintenance_catalog" on public.maintenance_catalog;
create policy "Anyone can read maintenance_catalog"
  on public.maintenance_catalog
  for select
  to anon, authenticated
  using (true);

-- Admin-only write
drop policy if exists "Admins can manage maintenance_catalog" on public.maintenance_catalog;
create policy "Admins can manage maintenance_catalog"
  on public.maintenance_catalog
  for all
  to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true')
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true');

-- Seed maintenance_catalog with recurring periodic items (no one-time services)
insert into public.maintenance_catalog (item_type, default_label, default_interval_months, category_slug, icon_name)
values
  ('ac_servicing', 'AC servicing', 4, 'ac-servicing', 'Wind'),
  ('geyser_service', 'Geyser/water heater service', 12, 'geyser-service', 'Flame'),
  ('ro_filter', 'RO/water purifier filter', 6, 'ro-water-purifier', 'Droplets'),
  ('water_pump_service', 'Water pump/motor service', 12, 'water-pump-motor', 'Gauge'),
  ('inverter_battery_check', 'Inverter battery check', 3, 'inverter-battery', 'BatteryCharging'),
  ('pest_control', 'Pest control', 4, 'pest-control', 'Bug'),
  ('chimney_exhaust_clean', 'Chimney/exhaust deep clean', 6, 'chimney-exhaust', 'Sparkles'),
  ('washing_machine_service', 'Washing machine service', 12, 'washing-machine', 'RotateCw'),
  ('overhead_tank_clean', 'Overhead tank/sump cleaning', 6, 'overhead-tank-sump', 'Waves')
on conflict (item_type) do update set
  default_label = excluded.default_label,
  default_interval_months = excluded.default_interval_months,
  category_slug = excluded.category_slug,
  icon_name = excluded.icon_name;
