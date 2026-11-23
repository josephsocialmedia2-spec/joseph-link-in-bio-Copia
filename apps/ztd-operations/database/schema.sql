-- Zero to Diamond cloud schema. DA APPLICARE SOLTANTO DOPO SCELTA DEL PROGETTO SUPABASE.
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
  letter_drive_id text,
  letter_drive_url text,
  letter_name text,
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
-- No client-side grants/policies: secret-key server only. Supabase Auth checks
-- and approved operator allowlists are enforced before service-role calls.
