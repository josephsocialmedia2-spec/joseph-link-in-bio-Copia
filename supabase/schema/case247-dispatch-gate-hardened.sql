-- CASE IN PUBBLICITÀ 24/7: hardened dispatch gate snapshot, 2026-11-02.
-- This SQL was applied to Supabase project qmeftxsdfeyqozwoivzo.
-- No marketing channel has been activated, no sender is included.
-- This is an audited source snapshot, NOT an automatic migration or release approval.
-- Private schema function; keep trigger case247_property_dispatch_gate enabled.

CREATE OR REPLACE FUNCTION case247_private.enforce_property_dispatch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare cfg record; req record; camp record;
begin
  if NEW.status not in ('QUEUED','SENT') then return NEW; end if;
  select * into cfg from public.case247_optin_settings where organization_id=NEW.organization_id;
  select * into req from public.case247_property_requests where id=NEW.request_id and organization_id=NEW.organization_id;
  select * into camp from public.case247_property_campaigns where id=NEW.campaign_id and organization_id=NEW.organization_id;
  if cfg is null or req is null or camp is null then
    raise exception 'CASE247_ORGANIZATION_MISMATCH';
  end if;
  if not cfg.intake_enabled or not cfg.controller_confirmed or
    not cfg.privacy_notice_approved or not cfg.anti_bot_verified or
    coalesce(cfg.notice_version,'') like 'DRAFT%' or
    not camp.rights_to_promote_verified or not camp.reviewed_by_staff or
    camp.campaign_status <> 'APPROVED' then
      raise exception 'CASE247_CAMPAIGN_NOT_APPROVED';
  end if;
  if req.status <> 'VERIFIED' or req.revoked_at is not null or
    req.expiry_at <= now() then raise exception 'CASE247_NO_VALID_SUBSCRIPTION'; end if;
  if (NEW.channel='email' and (not cfg.email_outbound_enabled or not req.email_optin_requested or req.email_verified_at is null or nullif(btrim(req.consent_text_email),'') is null))
    or (NEW.channel='whatsapp' and (not cfg.whatsapp_outbound_enabled or not req.whatsapp_optin_requested or req.whatsapp_verified_at is null or nullif(btrim(req.consent_text_whatsapp),'') is null))
  then raise exception 'CASE247_CHANNEL_CONSENT_NOT_VERIFIED'; end if;
  return NEW;
end $function$
;
