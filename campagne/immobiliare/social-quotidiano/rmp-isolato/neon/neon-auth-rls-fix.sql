-- REAL MEDIA PRO: resolved Neon Data API permission on auth.user_id()
-- Applied and validated on 2026-10-28 in NEW Neon ONLY.
-- DO NOT expose rmp_security in Neon Data API db_schemas.
-- SECURITY DEFINER is narrowly scoped: returns the signed JWT user ID only.
-- no user/secret tokens or account identity values in this file.
begin;
create schema if not exists rmp_security;
revoke all on schema rmp_security from public;
create or replace function rmp_security.current_user_id()
returns text
language sql stable security definer
set search_path = pg_catalog
as $$ select auth.user_id() $$;
revoke all on function rmp_security.current_user_id() from public;
grant usage on schema rmp_security to authenticated;
grant execute on function rmp_security.current_user_id() to authenticated;
alter policy rmp_admin_self_select on rmp.admin_users
  using (auth_user_id = rmp_security.current_user_id());
alter policy rmp_settings_admin_select on rmp.settings
  using (exists(select 1 from rmp.admin_users where auth_user_id=rmp_security.current_user_id()));
alter policy rmp_accounts_admin_select on rmp.accounts
  using (exists(select 1 from rmp.admin_users where auth_user_id=rmp_security.current_user_id()));
alter policy rmp_quotas_admin_select on rmp.quotas
  using (exists(select 1 from rmp.admin_users where auth_user_id=rmp_security.current_user_id()));
alter policy rmp_posts_admin_select on rmp.posts
  using (exists(select 1 from rmp.admin_users where auth_user_id=rmp_security.current_user_id()));
alter policy rmp_events_admin_select on rmp.events
  using (exists(select 1 from rmp.admin_users where auth_user_id=rmp_security.current_user_id()));
alter policy rmp_settings_admin_pause on rmp.settings
  using (exists(select 1 from rmp.admin_users where auth_user_id=rmp_security.current_user_id()))
  with check (
    (enabled = false or (rights_verified and live_test_verified))
    and exists(select 1 from rmp.admin_users where auth_user_id=rmp_security.current_user_id())
  );
commit;
-- QA:
-- Authenticated confirmed admin JWT => 63 visible posts, 1 settings, 1 admin.
-- Authenticated non-admin JWT => 0 visible posts, 0 settings, 0 admins.
-- settings.enabled,rights_verified,live_test_verified remain FALSE.
