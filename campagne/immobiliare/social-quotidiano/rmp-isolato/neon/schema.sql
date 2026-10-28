-- REAL MEDIA PRO / Neon PostgreSQL Free -- STAGING, not yet deployed.
-- This script targets a NEW Neon database only. Never Supabase (old or isolated).
-- No database credentials or privileged web API keys may enter public repositories.
begin;
create schema if not exists rmp;
revoke all on schema rmp from public;
create table if not exists rmp.admin_users (
  auth_user_id text primary key,
  created_at timestamptz not null default now()
);
create table if not exists rmp.settings (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  rights_verified boolean not null default false,
  live_test_verified boolean not null default false,
  video_url text,
  media_sha256 text,
  updated_at timestamptz not null default now()
);
insert into rmp.settings(singleton) values (true) on conflict do nothing;
create table if not exists rmp.accounts (
  platform text primary key check(platform in ('facebook','instagram','linkedin')),
  account_id text,
  display_name text,
  expected_name text,
  verified boolean not null default false,
  verified_at timestamptz,
  token_expires_at timestamptz,
  last_error text
);
insert into rmp.accounts(platform) values('facebook'),('instagram'),('linkedin') on conflict do nothing;
create table if not exists rmp.quotas (
  provider text primary key,
  used numeric not null default 0 check(used >= 0),
  allowance numeric check(allowance > 0),
  verified_at timestamptz,
  source text not null default 'UNKNOWN'
);
insert into rmp.quotas(provider) values
('github_actions'), ('neon_database'), ('neon_object_storage'), ('meta'), ('linkedin')
on conflict do nothing;
create table if not exists rmp.posts (
  id text primary key,
  platform text not null check(platform in ('facebook','instagram','linkedin')),
  local_date date not null,
  local_time time not null,
  scheduled_at timestamptz not null,
  caption text not null check(length(caption) > 100),
  status text not null default 'READY'
    check(status in ('READY','CLAIMED','PUBLISHED','UNCERTAIN','RETRYABLE','BLOCKED','SKIPPED')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  claimed_at timestamptz,
  published_at timestamptz,
  remote_id text,
  permalink text,
  last_error text,
  updated_at timestamptz not null default now(),
  unique(platform, scheduled_at)
);
create index if not exists rmp_posts_schedule_idx on rmp.posts(status, scheduled_at);
create table if not exists rmp.events (
  id bigint generated always as identity primary key,
  post_id text references rmp.posts(id),
  event_type text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists rmp_events_created_idx on rmp.events(created_at desc);
create index if not exists rmp_events_post_idx on rmp.events(post_id);
-- Neon database access is SERVER ONLY (GitHub Actions via DATABASE_URL).
-- No browser-side Postgres credentials. Auth and admin view require a
-- separate authenticated server-side API with verified user identities.
-- Do NOT expose the rmp schema to public/anonymous roles or enable publishing.
commit;
