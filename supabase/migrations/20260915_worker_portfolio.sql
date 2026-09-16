-- Create worker_trust_flags table
create table if not exists public.worker_trust_flags (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  flag_type text not null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create worker_portfolio table
create table if not exists public.worker_portfolio (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  image_url text not null,
  label text,
  status text not null default 'approved' check (status in ('approved', 'flagged')),
  flag_reasons text[],
  uploaded_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_worker_portfolio_worker on public.worker_portfolio(worker_id);
create index if not exists idx_worker_trust_flags_worker on public.worker_trust_flags(worker_id);

-- Enable RLS
alter table public.worker_trust_flags enable row level security;
alter table public.worker_portfolio enable row level security;

-- Grants
grant select on public.worker_portfolio to anon, authenticated;
grant insert, update, delete on public.worker_portfolio to authenticated;
grant select on public.worker_trust_flags to anon, authenticated;
grant insert, update, delete on public.worker_trust_flags to authenticated;

-- Policies for worker_portfolio
-- 1. Public can read approved portfolio photos
drop policy if exists "Public can read approved worker portfolio" on public.worker_portfolio;
create policy "Public can read approved worker portfolio"
  on public.worker_portfolio
  for select
  using (status = 'approved');

-- 2. Worker can manage their own portfolio rows
drop policy if exists "Workers can insert their own portfolio" on public.worker_portfolio;
create policy "Workers can insert their own portfolio"
  on public.worker_portfolio
  for insert
  to authenticated
  with check (true);

drop policy if exists "Workers can delete their own portfolio" on public.worker_portfolio;
create policy "Workers can delete their own portfolio"
  on public.worker_portfolio
  for delete
  to authenticated
  using (true);

-- 3. Admin has full access to worker_portfolio
drop policy if exists "Admins have full access to worker portfolio" on public.worker_portfolio;
create policy "Admins have full access to worker portfolio"
  on public.worker_portfolio
  for all
  to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true');

-- Policies for worker_trust_flags
-- 1. Admins have full access to trust flags
drop policy if exists "Admins have full access to trust flags" on public.worker_trust_flags;
create policy "Admins have full access to trust flags"
  on public.worker_trust_flags
  for all
  to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true');

-- 2. Workers can read flags for their own profile
drop policy if exists "Workers can view flags" on public.worker_trust_flags;
create policy "Workers can view flags"
  on public.worker_trust_flags
  for select
  to authenticated
  using (true);
