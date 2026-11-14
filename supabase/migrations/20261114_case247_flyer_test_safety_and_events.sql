-- Additive CASE247 email test safety / event reconciliation (14 Nov 2026).
-- Already applied to Supabase qmeftxsdfeyqozwoivzo.
alter table public.case247_mail_campaigns drop constraint if exists case247_mail_campaigns_status_check;
alter table public.case247_mail_campaigns add constraint case247_mail_campaigns_status_check
 check (status in ('draft','preparing','scheduled','accepted','delivered','failed','cancelled','uncertain','sending'));
alter table public.case247_mail_campaigns add column if not exists test_mode boolean not null default true;
alter table public.case247_mail_campaigns add column if not exists test_email text;
alter table public.case247_mail_campaigns add column if not exists provider_status text;
alter table public.case247_mail_campaigns add column if not exists provider_accepted_at timestamptz;
alter table public.case247_mail_campaigns add column if not exists delivered_at timestamptz;
alter table public.case247_mail_campaigns add column if not exists cancelled_at timestamptz;
alter table public.case247_mail_campaigns add column if not exists dispatch_attempts integer not null default 0;
alter table public.case247_mail_campaigns add column if not exists request_key uuid not null default gen_random_uuid();
create unique index if not exists case247_mail_campaigns_request_key_uq on public.case247_mail_campaigns(request_key);
create table if not exists public.case247_mail_suppressions (
 email text primary key,
 reason text not null,
 registered_at timestamptz not null default now(),
 source text not null default 'case247'
);
create table if not exists public.case247_mail_events (
 id uuid primary key default gen_random_uuid(),
 event_key text not null unique,
 provider_campaign_id bigint,
 campaign_id uuid references public.case247_mail_campaigns(id) on delete set null,
 email text,
 event_type text not null,
 occurred_at timestamptz,
 received_at timestamptz not null default now(),
 source text not null default 'brevo'
);
create index if not exists case247_mail_events_campaign_idx on public.case247_mail_events(campaign_id,received_at);
alter table public.case247_mail_events enable row level security;
alter table public.case247_mail_suppressions enable row level security;
revoke all on public.case247_mail_events from anon,authenticated;
revoke all on public.case247_mail_suppressions from anon,authenticated;
