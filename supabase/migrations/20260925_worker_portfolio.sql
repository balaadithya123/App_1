-- Standalone migration for worker_portfolio table and Row Level Security policies

create table if not exists public.worker_portfolio (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  image_url text not null,
  label text,
  status text not null default 'approved' check (status in ('approved', 'flagged')),
  flag_reasons text[],
  uploaded_at timestamptz not null default now()
);

-- Performance indexes
create index if not exists idx_worker_portfolio_worker_id on public.worker_portfolio(worker_id);
create index if not exists idx_worker_portfolio_user_id on public.worker_portfolio(user_id);

-- Enable RLS
alter table public.worker_portfolio enable row level security;

-- Grant permissions
grant select, insert, update, delete on public.worker_portfolio to anon, authenticated;

-- RLS Policies

-- 1. Public read for approved portfolio items only
drop policy if exists "Public can read approved worker portfolio" on public.worker_portfolio;
create policy "Public can read approved worker portfolio"
  on public.worker_portfolio
  for select
  using (status = 'approved');

-- 2. Workers can view their own portfolio (including non-public rows)
drop policy if exists "Workers can view their own portfolio" on public.worker_portfolio;
create policy "Workers can view their own portfolio"
  on public.worker_portfolio
  for select
  to authenticated
  using (auth.uid() = user_id or worker_id = auth.uid()::text);

-- 3. Workers can insert their own portfolio items
drop policy if exists "Workers can insert their own portfolio" on public.worker_portfolio;
create policy "Workers can insert their own portfolio"
  on public.worker_portfolio
  for insert
  to authenticated
  with check (auth.uid() = user_id or worker_id = auth.uid()::text or user_id is null);

-- 4. Workers can update their own portfolio items
drop policy if exists "Workers can update their own portfolio" on public.worker_portfolio;
create policy "Workers can update their own portfolio"
  on public.worker_portfolio
  for update
  to authenticated
  using (auth.uid() = user_id or worker_id = auth.uid()::text)
  with check (auth.uid() = user_id or worker_id = auth.uid()::text);

-- 5. Workers can delete their own portfolio items
drop policy if exists "Workers can delete their own portfolio" on public.worker_portfolio;
create policy "Workers can delete their own portfolio"
  on public.worker_portfolio
  for delete
  to authenticated
  using (auth.uid() = user_id or worker_id = auth.uid()::text);

-- 6. Admins have full access override
drop policy if exists "Admins have full access to worker portfolio" on public.worker_portfolio;
create policy "Admins have full access to worker portfolio"
  on public.worker_portfolio
  for all
  to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true')
  with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'), 'false') = 'true');
