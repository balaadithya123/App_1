alter table public.callback_requests alter column worker_id drop not null;
create index if not exists callback_requests_worker_id_idx on public.callback_requests(worker_id);
create index if not exists analytics_events_worker_event_created_idx on public.analytics_events(worker_id, event_type, created_at desc);
