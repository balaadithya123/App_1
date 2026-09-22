-- Create worker_trust_flags table if it does not already exist
create table if not exists public.worker_trust_flags (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  flag_type text not null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for performance
create index if not exists idx_worker_trust_flags_worker on public.worker_trust_flags(worker_id);

-- Enable RLS
alter table public.worker_trust_flags enable row level security;

-- Grants
grant select on public.worker_trust_flags to anon, authenticated;
grant insert, update, delete on public.worker_trust_flags to authenticated;

-- Policies for worker_trust_flags
drop policy if exists "Admins have full access to trust flags" on public.worker_trust_flags;
create policy "Admins have full access to trust flags"
  on public.worker_trust_flags
  for all
  to authenticated
  using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true');

drop policy if exists "Workers can view flags" on public.worker_trust_flags;
create policy "Workers can view flags"
  on public.worker_trust_flags
  for select
  to authenticated
  using (true);
