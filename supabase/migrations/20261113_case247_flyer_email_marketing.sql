-- CASE247 flyers email: additive, isolated, RLS enabled.
create table if not exists public.case247_mail_contacts (
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 full_name text not null default '',
 sector text not null check (sector in ('privati','aziende')),
 city text not null default '',
 lawful_basis text not null check (lawful_basis = 'consent'),
 evidence text not null check(length(evidence)>=12),
 privacy_version text not null default '2026-11',
 consent_at timestamptz not null,
 unsubscribed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint case247_mail_valid_email check(email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
create table if not exists public.case247_mail_campaigns (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 sector text not null check(sector in ('privati','aziende')),
 subject text not null,
 flyer_url text not null,
 scheduled_at timestamptz not null,
 status text not null default 'draft' check(status in ('draft','preparing','scheduled','failed')),
 brevo_list_id bigint,
 brevo_campaign_id bigint,
 eligible_count integer not null default 0,
 error_text text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists case247_mail_contacts_segment_idx on public.case247_mail_contacts(sector,city) where unsubscribed_at is null;
create index if not exists case247_mail_campaigns_status_idx on public.case247_mail_campaigns(status, scheduled_at);
alter table public.case247_mail_contacts enable row level security;
alter table public.case247_mail_campaigns enable row level security;
revoke all on public.case247_mail_contacts from anon, authenticated;
revoke all on public.case247_mail_campaigns from anon, authenticated;
comment on table public.case247_mail_contacts is 'CASE247: only verified opt-in marketing contacts, never scraped contacts';
comment on table public.case247_mail_campaigns is 'CASE247: campaign drafts and Brevo scheduling metadata';