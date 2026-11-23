-- Migration applied to personal Supabase nqnmlsmeiynxbdojeyjt on 2026-11-23.
-- One Google credential per ZTD operations installation, encrypted with AES-256-GCM at rest.
create table if not exists public.ztd_google_auth (
  provider text primary key check (provider = 'google'),
  encrypted_refresh_token text not null,
  nonce text not null,
  tag text not null,
  scopes text[] not null default array[]::text[],
  google_email text,
  connected_by uuid not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ztd_google_auth enable row level security;
revoke all on public.ztd_google_auth from public,anon,authenticated;
grant select,insert,update,delete on public.ztd_google_auth to service_role;
