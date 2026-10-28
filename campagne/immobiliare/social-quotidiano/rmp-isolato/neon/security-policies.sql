-- Neon Data API security: already applied to REAL MEDIA PRO
-- PROJECT: rough-mouse-11909259; DB: real_media_pro; branch: br-rough-shadow-b927u5ww
-- Apply ONCE to a fresh Neon project, only after Neon Auth + Data API provisioning.
-- This is a record of the executed statements, not a deployable recurring migration.
begin;
revoke all on schema rmp from public;
revoke all on all tables in schema rmp from public;
alter table rmp.admin_users enable row level security;
alter table rmp.settings enable row level security;
alter table rmp.accounts enable row level security;
alter table rmp.quotas enable row level security;
alter table rmp.posts enable row level security;
alter table rmp.events enable row level security;
grant usage on schema rmp to authenticated;
grant select on rmp.admin_users,rmp.settings,rmp.accounts,rmp.quotas,rmp.posts,rmp.events to authenticated;
grant update (enabled) on rmp.settings to authenticated;
create policy rmp_admin_self_select on rmp.admin_users
  for select to authenticated using (auth_user_id = auth.user_id());
create policy rmp_settings_admin_select on rmp.settings for select to authenticated
  using (exists (select 1 from rmp.admin_users where auth_user_id=auth.user_id()));
create policy rmp_accounts_admin_select on rmp.accounts for select to authenticated
  using (exists (select 1 from rmp.admin_users where auth_user_id=auth.user_id()));
create policy rmp_quotas_admin_select on rmp.quotas for select to authenticated
  using (exists (select 1 from rmp.admin_users where auth_user_id=auth.user_id()));
create policy rmp_posts_admin_select on rmp.posts for select to authenticated
  using (exists (select 1 from rmp.admin_users where auth_user_id=auth.user_id()));
create policy rmp_events_admin_select on rmp.events for select to authenticated
  using (exists (select 1 from rmp.admin_users where auth_user_id=auth.user_id()));
create policy rmp_settings_admin_pause on rmp.settings for update to authenticated
  using (exists (select 1 from rmp.admin_users where auth_user_id=auth.user_id()))
  with check ((enabled=false or (rights_verified and live_test_verified))
    and exists (select 1 from rmp.admin_users where auth_user_id=auth.user_id()));
commit;
