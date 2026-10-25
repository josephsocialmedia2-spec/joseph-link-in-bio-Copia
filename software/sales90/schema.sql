-- Joseph Sales Automation 90: isolated tables, never touches existing CRM.
-- Execute only after reviewing existing project settings and confirming an approved deployment.
-- All public-schema tables below have RLS; no anon privileges. No secrets committed.
begin;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.s90_properties (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 4 and 160),
 commune text not null check (char_length(commune) between 2 and 80),
 asking_price numeric(12,2) not null check (asking_price > 0 and asking_price <= 100000000),
 start_date date not null,
 state text not null default 'IN_PREPARAZIONE'
   check (state in ('IN_PREPARAZIONE','IN_ATTESA_AUTORIZZAZIONI','PRONTO_PER_PUBBLICAZIONE','PUBBLICATO','IN_PROMOZIONE','OPEN_HOUSE_PROGRAMMATO','VISITE_IN_CORSO','IN_TRATTATIVA','VENDUTO','SOSPESO','RITIRATO','SCADUTO')),
 verified boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint s90_property_owner_unique unique(id,owner_id)
);

create table if not exists public.s90_tasks (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 property_id uuid not null,
 title text not null check (char_length(title) between 4 and 240),
 assigned_role text not null default 'Joseph',
 phase text not null,
 day_number integer not null check(day_number between 1 and 9999),
 due_on date not null,
 status text not null default 'TODO' check(status in ('TODO','IN_PROGRESS','DONE','CANCELLED')),
 priority text not null default 'NORMALE' check(priority in ('ALTA','NORMALE','BASSA')),
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(property_id,owner_id) references public.s90_properties(id,owner_id) on delete cascade
);
create index if not exists s90_tasks_due_idx on public.s90_tasks(owner_id,due_on,status);

create table if not exists public.s90_reminders (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 property_id uuid not null,
 task_id uuid references public.s90_tasks(id) on delete set null,
 kind text not null default 'TASK_DUE',
 title text not null,
 due_on date not null,
 local_time time without time zone not null default '08:30',
 due_at timestamptz not null default now(),
 recipient_email text,
 status text not null default 'WAITING' check(status in ('WAITING','SENDING','SENT','FAILED','CANCELLED')),
 attempts integer not null default 0 check(attempts>=0),
 last_error text,
 claimed_at timestamptz,
 sent_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(property_id,owner_id) references public.s90_properties(id,owner_id) on delete cascade,
 constraint s90_reminder_unique unique(owner_id,property_id,title,due_on)
);
create index if not exists s90_reminders_due_idx on public.s90_reminders(status,due_at);

create table if not exists public.s90_audit (
 id bigint generated always as identity primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 entity text not null,
 entity_id uuid not null,
 action text not null,
 happened_at timestamptz not null default now()
);

create or replace function public.s90_set_due_rome()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
 new.due_at := (new.due_on + new.local_time) at time zone 'Europe/Rome';
 return new;
end $$;
drop trigger if exists s90_reminder_due_rome on public.s90_reminders;
create trigger s90_reminder_due_rome before insert or update of due_on,local_time
on public.s90_reminders for each row execute function public.s90_set_due_rome();

-- Metadata-only audit, avoiding personal details in history.
create or replace function public.s90_log_change()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare rec record;
begin
 if TG_OP = 'DELETE' then rec := OLD; else rec := NEW; end if;
 insert into public.s90_audit(owner_id,entity,entity_id,action)
 values(rec.owner_id,TG_TABLE_NAME,rec.id,TG_OP);
 return coalesce(NEW,OLD);
end $$;
drop trigger if exists s90_properties_audit on public.s90_properties;
create trigger s90_properties_audit after insert or update or delete on public.s90_properties
for each row execute function public.s90_log_change();
drop trigger if exists s90_tasks_audit on public.s90_tasks;
create trigger s90_tasks_audit after insert or update or delete on public.s90_tasks
for each row execute function public.s90_log_change();

alter table public.s90_properties enable row level security;
alter table public.s90_tasks enable row level security;
alter table public.s90_reminders enable row level security;
alter table public.s90_audit enable row level security;

revoke all on public.s90_properties, public.s90_tasks, public.s90_reminders, public.s90_audit from public, anon;
grant select,insert,update,delete on public.s90_properties,public.s90_tasks,public.s90_reminders to authenticated;
grant select on public.s90_audit to authenticated;

drop policy if exists s90_owner_properties on public.s90_properties;
create policy s90_owner_properties on public.s90_properties for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists s90_owner_tasks on public.s90_tasks;
create policy s90_owner_tasks on public.s90_tasks for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists s90_owner_reminders on public.s90_reminders;
create policy s90_owner_reminders on public.s90_reminders for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists s90_owner_audit_read on public.s90_audit;
create policy s90_owner_audit_read on public.s90_audit for select to authenticated
using ((select auth.uid()) = owner_id);

-- Server-only batch claim for a later scheduler Edge Function. The service_role must invoke explicitly.
create or replace function public.s90_claim_due_reminders(batch_size integer default 25)
returns setof public.s90_reminders language plpgsql
security definer set search_path=pg_catalog,public as $$
begin
 return query
 with candidates as (
  select id from public.s90_reminders
  where (status='WAITING' and due_at<=now())
     or (status='SENDING' and claimed_at < now() - interval '20 minutes')
  order by due_at
  for update skip locked
  limit least(greatest(batch_size,1),100)
 )
 update public.s90_reminders r
 set status='SENDING',claimed_at=now(),attempts=r.attempts+1
 from candidates where r.id=candidates.id returning r.*;
end $$;
revoke all on function public.s90_claim_due_reminders(integer) from public,anon,authenticated;
grant execute on function public.s90_claim_due_reminders(integer) to service_role;
revoke all on function public.s90_log_change() from public,anon,authenticated;
revoke all on function public.s90_set_due_rome() from public,anon,authenticated;
commit;

-- Verify after deployment:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 's90_%';
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename LIKE 's90_%';
-- Test unauthenticated requests return zero rows; test two distinct auth users cannot read one another.
