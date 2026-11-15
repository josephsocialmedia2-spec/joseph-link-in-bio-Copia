-- CASE247: restrict authorized trial recipients to single-message technical testing.
-- The recipient email and authorization evidence are stored privately in Supabase,
-- never embedded in this migration or committed to public GitHub.
alter table public.case247_mail_contacts
 add column if not exists test_only boolean not null default false;
create index if not exists case247_mail_test_only_idx
 on public.case247_mail_contacts (test_only,sector)
 where unsubscribed_at is null;
