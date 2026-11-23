-- Zero to Diamond cloud schema. APPLICATO SOLO a Supabase personale nqnmlsmeiynxbdojeyjt, 23/11/2026.
-- Isolato dalle tabelle f1_ / case247_ / rmp_. Nessuna policy pubblica.
create extension if not exists pgcrypto;
create table if not exists public.ztd_daily_runs (
  day date primary key,
  status text not null default 'PREPARING'
    check (status in ('PREPARING','READY','PUBLISHED','FAILED')),
  source_issue text,
  source_sha256 text,
  magazine_drive_id text,
  magazine_drive_url text,
  magazine_name text,
  magazine_storage_path text,
  letter_drive_id text,
  letter_drive_url text,
  letter_name text,
  letter_storage_path text,
  public_path text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  published_at timestamptz,
  published_by uuid
);
create table if not exists public.ztd_daily_tasks (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.ztd_daily_runs(day) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 99),
  start_at time not null,
  end_at time,
  title text not null check (length(title) between 1 and 255),
  origin text not null default 'SYSTEM' check (origin in ('SYSTEM','CALENDAR')),
  status text not null default 'PENDING' check (status in ('PENDING','DONE')),
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz not null default now(),
  unique(day,ordinal)
);
create table if not exists public.ztd_audit_events (
  id bigint generated always as identity primary key,
  day date not null,
  action text not null,
  actor_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ztd_tasks_by_day on public.ztd_daily_tasks(day,start_at,ordinal);
create index if not exists ztd_events_by_day on public.ztd_audit_events(day,created_at);
alter table public.ztd_daily_runs enable row level security;
alter table public.ztd_daily_tasks enable row level security;
alter table public.ztd_audit_events enable row level security;
revoke all on public.ztd_daily_runs,public.ztd_daily_tasks,public.ztd_audit_events from anon,authenticated;
revoke all on sequence public.ztd_audit_events_id_seq from anon,authenticated;
grant select,insert,update,delete on public.ztd_daily_runs,public.ztd_daily_tasks,public.ztd_audit_events to service_role;
grant usage,select on sequence public.ztd_audit_events_id_seq to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ztd-documents','ztd-documents',false,15728640,array['application/pdf'])
on conflict (id) do nothing;
-- Atomic audit triggers: a publication/physical completion cannot persist without its audit row.
-- SECURITY INVOKER, never SECURITY DEFINER. All schema names fully qualified.
create or replace function public.ztd_log_publication() returns trigger
language plpgsql security invoker set search_path = ''
as $body$
begin
 if new.status = 'PUBLISHED' and old.status is distinct from new.status then
  insert into public.ztd_audit_events(day,action,actor_id,details)
  values(new.day,'APPROVED_AND_PUBLISHED',new.published_by,
   jsonb_build_object('source_sha256',new.source_sha256));
 end if;
 return new;
end
$body$;
revoke all on function public.ztd_log_publication() from public,anon,authenticated;
grant execute on function public.ztd_log_publication() to service_role;
drop trigger if exists ztd_run_publish_audit on public.ztd_daily_runs;
create trigger ztd_run_publish_audit after update of status on public.ztd_daily_runs
for each row execute function public.ztd_log_publication();

create or replace function public.ztd_log_task_completion() returns trigger
language plpgsql security invoker set search_path = ''
as $body$
begin
 if new.status = 'DONE' and old.status is distinct from new.status then
  insert into public.ztd_audit_events(day,action,actor_id,details)
  values(new.day,'TASK_DONE',new.completed_by,
   jsonb_build_object('task_id',new.id,'title',new.title));
 end if;
 return new;
end
$body$;
revoke all on function public.ztd_log_task_completion() from public,anon,authenticated;
grant execute on function public.ztd_log_task_completion() to service_role;
drop trigger if exists ztd_task_done_audit on public.ztd_daily_tasks;
create trigger ztd_task_done_audit after update of status on public.ztd_daily_tasks
for each row execute function public.ztd_log_task_completion();

-- Private storage bucket. No grants for browser clients.
-- No client-side grants/policies: secret-key server only. Supabase Auth checks
-- and approved operator allowlists are enforced before service-role calls.
