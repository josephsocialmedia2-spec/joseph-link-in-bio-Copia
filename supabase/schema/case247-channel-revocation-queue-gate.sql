-- CASE247: cancel unsent jobs when individual channel preference is withdrawn.
-- Applied migration: case247_cancel_queued_jobs_on_channel_optout_20261102
-- Never enables marketing or intake.
create or replace function case247_private.cancel_pending_after_optout()
returns trigger language plpgsql set search_path='' as $$
begin
 if (old.email_optin_requested and not new.email_optin_requested)
    or new.status in ('CANCELLED','EXPIRED')
    or (old.revoked_at is null and new.revoked_at is not null)
 then
   update public.case247_property_dispatch_jobs set status='CANCELLED',error_code='OPT_OUT_EMAIL'
    where organization_id=new.organization_id and request_id=new.id and channel='email' and status in ('HELD','QUEUED');
 end if;
 if (old.whatsapp_optin_requested and not new.whatsapp_optin_requested)
    or new.status in ('CANCELLED','EXPIRED')
    or (old.revoked_at is null and new.revoked_at is not null)
 then
   update public.case247_property_dispatch_jobs set status='CANCELLED',error_code='OPT_OUT_WHATSAPP'
    where organization_id=new.organization_id and request_id=new.id and channel='whatsapp' and status in ('HELD','QUEUED');
 end if;
 return new;
end;
$$;
drop trigger if exists case247_cancel_pending_after_optout on public.case247_property_requests;
create trigger case247_cancel_pending_after_optout
after update of email_optin_requested,whatsapp_optin_requested,status,revoked_at
on public.case247_property_requests for each row
execute function case247_private.cancel_pending_after_optout();
