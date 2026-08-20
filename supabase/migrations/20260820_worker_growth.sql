alter table public.workers add column if not exists referral_source text;
alter table public.workers add column if not exists referral_code text;

update public.workers set referral_code = substr(md5(id), 1, 10) where referral_code is null;
create unique index if not exists workers_referral_code_unique on public.workers(referral_code);

alter table public.callback_requests add column if not exists status text not null default 'new';
alter table public.callback_requests drop constraint if exists callback_requests_status_check;
alter table public.callback_requests add constraint callback_requests_status_check check (status in ('new','contacted','closed'));

alter table public.analytics_events enable row level security;
alter table public.contact_events enable row level security;
alter table public.callback_requests enable row level security;

drop policy if exists "Admins can read analytics events" on public.analytics_events;
create policy "Admins can read analytics events" on public.analytics_events for select to authenticated using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true');

drop policy if exists "Admins can read contact events" on public.contact_events;
create policy "Admins can read contact events" on public.contact_events for select to authenticated using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true');

drop policy if exists "Admins can read callback requests" on public.callback_requests;
create policy "Admins can read callback requests" on public.callback_requests for select to authenticated using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true');

drop policy if exists "Admins can update callback requests" on public.callback_requests;
create policy "Admins can update callback requests" on public.callback_requests for update to authenticated using (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true') with check (coalesce((select auth.jwt() -> 'app_metadata' ->> 'is_admin'),'false') = 'true');
