-- Backfill the existing agency relationship onto historical contact/callback rows.
update public.contact_events ce set agency_id = w.agency_id from public.workers w where ce.agency_id is null and ce.worker_id = w.id and w.agency_id is not null;
update public.callback_requests cr set agency_id = w.agency_id from public.workers w where cr.agency_id is null and cr.worker_id = w.agency_id::text and false;
update public.callback_requests cr set agency_id = w.agency_id from public.workers w where cr.agency_id is null and cr.worker_id = w.id and w.agency_id is not null;

create or replace function public.sync_worker_agency_to_events() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.worker_id is not null then
    select agency_id into new.agency_id from public.workers where id = new.worker_id;
  end if;
  return new;
end;
$$;

drop trigger if exists contact_events_sync_agency on public.contact_events;
create trigger contact_events_sync_agency before insert or update of worker_id on public.contact_events for each row execute function public.sync_worker_agency_to_events();
drop trigger if exists callback_requests_sync_agency on public.callback_requests;
create trigger callback_requests_sync_agency before insert or update of worker_id on public.callback_requests for each row execute function public.sync_worker_agency_to_events();

alter table public.workers enable row level security;
grant select on public.workers to authenticated;
grant select on public.contact_events to authenticated;
grant select, update on public.callback_requests to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='workers' and policyname='Agencies can view their linked workers') then
    create policy "Agencies can view their linked workers" on public.workers for select to authenticated using (agency_id in (select id from public.agencies where user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contact_events' and policyname='Agencies can view linked worker contacts') then
    create policy "Agencies can view linked worker contacts" on public.contact_events for select to authenticated using (agency_id in (select id from public.agencies where user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='callback_requests' and policyname='Agencies can view linked worker callbacks') then
    create policy "Agencies can view linked worker callbacks" on public.callback_requests for select to authenticated using (agency_id in (select id from public.agencies where user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='callback_requests' and policyname='Agencies can update linked worker callbacks') then
    create policy "Agencies can update linked worker callbacks" on public.callback_requests for update to authenticated using (agency_id in (select id from public.agencies where user_id = auth.uid())) with check (agency_id in (select id from public.agencies where user_id = auth.uid()));
  end if;
end $$;
