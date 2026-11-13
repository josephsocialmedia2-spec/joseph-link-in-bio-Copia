-- Applied in Supabase migration history on 2026-11-13.
-- CASE247: opt-in evidence is committed atomically before the request.
-- Only backend service_role has access. No PII or raw IP is ever logged here.
create table if not exists public.case247_request_intake_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.case247_organizations(id),
  submission_key text not null,
  request_id uuid null references public.case247_property_requests(id) on delete set null,
  event_type text not null default 'REQUEST_NOTICE_ACKNOWLEDGED'
    check(event_type='REQUEST_NOTICE_ACKNOWLEDGED'),
  request_kind text not null,
  privacy_seen boolean not null check(privacy_seen=true),
  notice_version text not null,
  email_optin_requested boolean not null default false,
  whatsapp_optin_requested boolean not null default false,
  ip_prefix_hmac_sha256 text not null check(ip_prefix_hmac_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique(organization_id,submission_key)
);
alter table public.case247_request_intake_audit enable row level security;
revoke all on table public.case247_request_intake_audit from public,anon,authenticated;
grant select,insert,update on public.case247_request_intake_audit to service_role;
create index if not exists case247_audit_request_idx on public.case247_request_intake_audit(request_id);

create table if not exists public.case247_intake_rate_limits (
  ip_prefix_hmac_sha256 text not null check(ip_prefix_hmac_sha256 ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check(attempts between 1 and 1000),
  primary key(ip_prefix_hmac_sha256,window_start)
);
alter table public.case247_intake_rate_limits enable row level security;
revoke all on table public.case247_intake_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on public.case247_intake_rate_limits to service_role;

create or replace function public.case247_claim_intake_slot(p_ip_hash text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare got integer;
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into public.case247_intake_rate_limits(ip_prefix_hmac_sha256,window_start,attempts)
    values (p_ip_hash,date_trunc('hour',now()),1)
    on conflict(ip_prefix_hmac_sha256,window_start) do update
      set attempts=public.case247_intake_rate_limits.attempts+1
      where public.case247_intake_rate_limits.attempts < 8
    returning attempts into got;
  return got is not null;
end $$;
revoke all on function public.case247_claim_intake_slot(text) from public,anon,authenticated;
grant execute on function public.case247_claim_intake_slot(text) to service_role;

create or replace function public.case247_record_intake_request(p jsonb,p_ip_hash text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  oid uuid;
  iid uuid;
  rid uuid;
  s public.case247_optin_settings%rowtype;
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_IP_EVIDENCE'; end if;
  if coalesce((p->>'privacy_seen')::boolean,false)<>true then
    raise exception 'NOTICE_NOT_ACKNOWLEDGED';
  end if;
  oid:=(p->>'organization_id')::uuid;
  select * into s from public.case247_optin_settings where organization_id=oid;
  if not found or not s.intake_enabled or not s.controller_confirmed
     or not s.privacy_notice_approved or not s.anti_bot_verified
     or s.notice_version<>p->>'notice_version' or s.notice_version like 'DRAFT%' then
    raise exception 'LEGAL_OR_ANTIBOT_RELEASE_NOT_APPROVED';
  end if;
  -- Audit precedes creation of identifiable request. Either both commit or neither does.
  insert into public.case247_request_intake_audit(
    organization_id,submission_key,request_kind,privacy_seen,notice_version,
    email_optin_requested,whatsapp_optin_requested,ip_prefix_hmac_sha256)
  values (
    oid,p->>'submission_key',p->>'request_kind',true,p->>'notice_version',
    coalesce((p->>'email_optin_requested')::boolean,false),
    coalesce((p->>'whatsapp_optin_requested')::boolean,false),p_ip_hash)
  returning id into iid;
  insert into public.case247_property_requests (
    organization_id,submission_key,request_kind,contact_name,email,phone,comune,
    property_type,max_budget_eur,message,frequency,email_optin_requested,whatsapp_optin_requested,
    consent_text_email,consent_text_whatsapp,notice_version,user_agent_sha256,origin_url,
    revoke_token_sha256,status
  ) values (
    oid,p->>'submission_key',p->>'request_kind',p->>'contact_name',
    nullif(p->>'email',''),nullif(p->>'phone',''),p->>'comune',
    p->>'property_type',nullif(p->>'max_budget_eur','')::numeric,
    nullif(p->>'message',''),p->>'frequency',
    coalesce((p->>'email_optin_requested')::boolean,false),
    coalesce((p->>'whatsapp_optin_requested')::boolean,false),
    nullif(p->>'consent_text_email',''),nullif(p->>'consent_text_whatsapp',''),
    p->>'notice_version',nullif(p->>'user_agent_sha256',''),p->>'origin_url',
    p->>'revoke_token_sha256','PENDING_VERIFICATION'
  ) returning id into rid;
  update public.case247_request_intake_audit set request_id=rid where id=iid;
  return jsonb_build_object('request_id',rid,'status','PENDING_VERIFICATION');
end $$;
revoke all on function public.case247_record_intake_request(jsonb,text) from public,anon,authenticated;
grant execute on function public.case247_record_intake_request(jsonb,text) to service_role;

