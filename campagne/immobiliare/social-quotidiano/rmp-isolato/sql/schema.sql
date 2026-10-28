-- REAL MEDIA PRO isolated schema. APPLY ONLY TO A NEW PROJECT, NEVER nqnmlsmeiynxbdojeyjt.
-- Applied ONLY to new project tonwtdxjdseuizmezcht (never old nqnmlsmeiynxbdojeyjt).
create table if not exists public.rmp_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.rmp_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  rights_verified boolean not null default false,
  live_test_verified boolean not null default false,
  video_url text,
  media_sha256 text,
  updated_at timestamptz not null default now()
);
insert into public.rmp_settings (singleton) values (true) on conflict do nothing;
create table if not exists public.rmp_accounts (
  platform text primary key check (platform in ('facebook','instagram','linkedin')),
  account_id text,
  display_name text,
  expected_name text,
  verified boolean not null default false,
  verified_at timestamptz,
  token_expires_at timestamptz,
  last_error text
);
insert into public.rmp_accounts(platform) values ('facebook'),('instagram'),('linkedin') on conflict do nothing;
create table if not exists public.rmp_quotas (
  provider text primary key,
  used numeric not null check (used>=0),
  allowance numeric check (allowance>0),
  verified_at timestamptz,
  source text not null default 'UNKNOWN'
);
insert into public.rmp_quotas(provider,used,allowance,source) values
('github_actions', 0, null, 'UNKNOWN'),
('supabase', 0, null, 'UNKNOWN'),
('meta', 0, null, 'UNKNOWN'),
('linkedin', 0, null, 'UNKNOWN')
on conflict (provider) do nothing;
create table if not exists public.rmp_posts (
  id text primary key,
  platform text not null check (platform in ('facebook','instagram','linkedin')),
  local_date date not null,
  local_time time not null,
  scheduled_at timestamptz not null,
  caption text not null check (length(caption)>100),
  status text not null default 'READY' check
    (status in ('READY','CLAIMED','PUBLISHED','UNCERTAIN','RETRYABLE','BLOCKED','SKIPPED')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  claimed_at timestamptz,
  published_at timestamptz,
  remote_id text,
  permalink text,
  last_error text,
  updated_at timestamptz not null default now(),
  unique(platform,scheduled_at)
);
create index if not exists rmp_posts_schedule_idx on public.rmp_posts(status,scheduled_at);
create table if not exists public.rmp_events (
  id bigint generated always as identity primary key,
  post_id text references public.rmp_posts(id),
  event_type text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists rmp_events_created_idx on public.rmp_events(created_at desc);
alter table public.rmp_admins enable row level security;
alter table public.rmp_settings enable row level security;
alter table public.rmp_accounts enable row level security;
alter table public.rmp_quotas enable row level security;
alter table public.rmp_posts enable row level security;
alter table public.rmp_events enable row level security;
-- No anonymous access. Admin membership is provisioned ONLY by an authenticated
-- operator through the dashboard SQL console, never through an open signup endpoint.
revoke all on public.rmp_admins, public.rmp_settings, public.rmp_accounts,
  public.rmp_quotas, public.rmp_posts, public.rmp_events from anon, authenticated;
grant select on public.rmp_admins, public.rmp_settings, public.rmp_accounts,
  public.rmp_quotas, public.rmp_posts, public.rmp_events to authenticated;
-- Column-level write only: a legitimate admin can pause/resume, not self-certify rights.
grant update(enabled) on public.rmp_settings to authenticated;
create policy "rmp_admin_read_own" on public.rmp_admins
  for select to authenticated using (user_id = (select auth.uid()));
create policy "rmp_settings_admin_read" on public.rmp_settings
  for select to authenticated using
  (exists(select 1 from public.rmp_admins a where a.user_id=(select auth.uid())));
create policy "rmp_settings_admin_pause" on public.rmp_settings
  for update to authenticated using
  (exists(select 1 from public.rmp_admins a where a.user_id=(select auth.uid())))
  with check
  (exists(select 1 from public.rmp_admins a where a.user_id=(select auth.uid())));
create policy "rmp_accounts_admin_read" on public.rmp_accounts
  for select to authenticated using
  (exists(select 1 from public.rmp_admins a where a.user_id=(select auth.uid())));
create policy "rmp_quotas_admin_read" on public.rmp_quotas
  for select to authenticated using
  (exists(select 1 from public.rmp_admins a where a.user_id=(select auth.uid())));
create policy "rmp_posts_admin_read" on public.rmp_posts
  for select to authenticated using
  (exists(select 1 from public.rmp_admins a where a.user_id=(select auth.uid())));
create policy "rmp_events_admin_read" on public.rmp_events
  for select to authenticated using
  (exists(select 1 from public.rmp_admins a where a.user_id=(select auth.uid())));
-- Provision first admin only after verified auth account is created:
-- insert into public.rmp_admins(user_id) values ('<VERIFIED_AUTH_USER_UUID>');
-- Never place a service_role key in the client.
