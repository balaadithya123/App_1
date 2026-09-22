-- Create maintenance_reminders table for recurring home maintenance items
create table if not exists public.maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('ac_servicing', 'geyser', 'water_pump', 'ro_purifier')),
  title text not null,
  category_search_term text not null,
  last_serviced_at date,
  due_date date not null,
  reminder_interval_months integer not null default 6,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for querying reminders per user
create index if not exists idx_maintenance_reminders_user_id on public.maintenance_reminders(user_id);
create index if not exists idx_maintenance_reminders_due_date on public.maintenance_reminders(due_date);

-- Enable RLS
alter table public.maintenance_reminders enable row level security;

-- Grants
grant select, insert, update, delete on public.maintenance_reminders to authenticated;

-- Policies for maintenance_reminders
drop policy if exists "Users can manage their own maintenance reminders" on public.maintenance_reminders;
create policy "Users can manage their own maintenance reminders"
  on public.maintenance_reminders
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
