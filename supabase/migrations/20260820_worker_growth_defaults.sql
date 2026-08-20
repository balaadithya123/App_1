alter table public.workers alter column referral_code set default substr(md5(gen_random_uuid()::text), 1, 10);

update public.workers set referral_code = substr(md5(id), 1, 10) where referral_code is null;

create unique index if not exists workers_referral_code_unique on public.workers(referral_code);
