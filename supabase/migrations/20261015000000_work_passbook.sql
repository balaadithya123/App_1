-- Work Passbook + Fair Rate Guide.
-- Both tables are written and read ONLY through the app server (service role),
-- which checks who the caller is. RLS is enabled with no policies, so the public
-- anon key cannot read tokens, rates or customer ids directly.
-- NOT applied automatically. Review, then run in the Supabase SQL editor.

create table if not exists public.job_records (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  worker_category text,
  service_label text not null check (char_length(service_label) between 2 and 60),
  description text check (description is null or char_length(description) <= 300),
  locality text,
  job_date date not null,
  agreed_rate numeric not null check (agreed_rate > 0 and agreed_rate <= 1000000),
  rate_unit text not null check (rate_unit in ('job', 'day', 'hour')),
  advance numeric not null default 0 check (advance >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  claim_token text not null unique,
  customer_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists job_records_worker_idx on public.job_records (worker_id, status);
create index if not exists job_records_guide_idx on public.job_records (worker_category, status, rate_unit);

create table if not exists public.worker_rates (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  service_label text not null check (char_length(service_label) between 2 and 60),
  rate_min numeric not null check (rate_min > 0),
  rate_max numeric not null check (rate_max >= rate_min and rate_max <= 1000000),
  rate_unit text not null check (rate_unit in ('job', 'day', 'hour')),
  updated_at timestamptz not null default now()
);

create index if not exists worker_rates_worker_idx on public.worker_rates (worker_id);

alter table public.job_records enable row level security;
alter table public.worker_rates enable row level security;
