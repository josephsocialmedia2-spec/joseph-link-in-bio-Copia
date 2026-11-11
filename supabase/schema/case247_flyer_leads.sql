-- CASE247: dati richiesti VOLONTARIAMENTE dagli utenti per ottenere il volantino.
-- NON attiva il marketing e NON consente lettura pubblica. Richiede approvazione GDPR prima dell'uso.
create table if not exists public.case247_flyer_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.case247_organizations(id),
  submission_key uuid not null unique,
  nome text not null check (char_length(nome) between 2 and 100),
  cognome text not null check (char_length(cognome) between 2 and 100),
  telefono text not null check (char_length(telefono) between 9 and 25),
  origine text not null check (origine in ('facebook','instagram','messenger','sito','altro')),
  informativa_versione text not null,
  informativa_letta boolean not null check (informativa_letta = true),
  consenso_marketing boolean not null default false check (consenso_marketing = false),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
alter table public.case247_flyer_leads enable row level security;
revoke all on public.case247_flyer_leads from anon, authenticated, public;
grant all on public.case247_flyer_leads to service_role;
create index if not exists case247_flyer_leads_org_created on public.case247_flyer_leads (organization_id, created_at desc);
comment on table public.case247_flyer_leads is 'Registrazioni al download del volantino, NO marketing. L effettiva politica di conservazione e cancellazione automatica vanno approvate prima dell attivazione.';
