create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  location text not null,
  services text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agencies_phone_check check (phone ~ '^[0-9]{10}$')
);

alter table public.agencies enable row level security;
grant select, insert, update on public.agencies to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agencies' and policyname='Agencies can view their own profile') then
    create policy "Agencies can view their own profile" on public.agencies for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agencies' and policyname='Agencies can create their own profile') then
    create policy "Agencies can create their own profile" on public.agencies for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agencies' and policyname='Agencies can update their own profile') then
    create policy "Agencies can update their own profile" on public.agencies for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
