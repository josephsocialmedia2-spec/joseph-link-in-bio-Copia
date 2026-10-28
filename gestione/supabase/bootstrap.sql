-- REAL MEDIA PRO / Regia: bootstrap sicuro per progetto Supabase qmeftxsdfeyqozwoivzo
-- NON pubblica contenuti, non modifica il vecchio F1 Social o Neon.
-- Eseguire SOLO sul nuovo progetto dopo conferma dell'accesso e backup.
BEGIN;

CREATE TABLE IF NOT EXISTS public.rmp_tracks (
  slug text PRIMARY KEY CHECK (slug IN ('imprese','immobiliare')),
  label text NOT NULL,
  campaign_goal text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rmp_social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_slug text NOT NULL REFERENCES public.rmp_tracks(slug),
  platform text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin')),
  expected_url text,
  external_account_id text,
  account_type text NOT NULL DEFAULT 'UNKNOWN' CHECK (account_type IN ('UNKNOWN','PAGE','PERSONAL','BUSINESS')),
  auth_status text NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (auth_status IN ('NOT_VERIFIED','PENDING','VERIFIED','EXPIRED','SUSPENDED')),
  granted_scopes text[] NOT NULL DEFAULT '{}',
  verified_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_slug,platform)
);

CREATE TABLE IF NOT EXISTS public.rmp_landing_routes (
  page_id text PRIMARY KEY,
  track_slug text REFERENCES public.rmp_tracks(slug),
  title text NOT NULL,
  category text NOT NULL,
  source_path text NOT NULL,
  public_url text NOT NULL,
  promotion_status text NOT NULL DEFAULT 'DRAFT'
    CHECK (promotion_status IN ('DRAFT','REVIEW','ACTIVE','INTERNAL','SUSPENDED')),
  last_reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rmp_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_slug text NOT NULL REFERENCES public.rmp_tracks(slug),
  platform text NOT NULL CHECK (platform IN ('facebook','linkedin')),
  group_name text NOT NULL,
  group_url text NOT NULL,
  territory text,
  membership_status text NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (membership_status IN ('NOT_VERIFIED','REQUESTED','MEMBER','DECLINED','LEFT')),
  promotion_permission text NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (promotion_permission IN ('NOT_VERIFIED','ALLOWED','ADMIN_APPROVAL','FORBIDDEN')),
  admin_approval text NOT NULL DEFAULT 'NOT_VERIFIED'
    CHECK (admin_approval IN ('NOT_VERIFIED','NOT_REQUIRED','PENDING','APPROVED','REJECTED')),
  rules_checked_at timestamptz,
  last_post_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_slug,platform,group_url)
);

CREATE TABLE IF NOT EXISTS public.rmp_publication_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_slug text NOT NULL REFERENCES public.rmp_tracks(slug),
  social_profile_id uuid REFERENCES public.rmp_social_profiles(id),
  landing_id text REFERENCES public.rmp_landing_routes(page_id),
  platform text NOT NULL CHECK (platform IN ('facebook','instagram','linkedin')),
  content_type text NOT NULL DEFAULT 'POST'
    CHECK (content_type IN ('POST','REEL','VIDEO','CAROUSEL')),
  caption text NOT NULL DEFAULT '',
  media_url text,
  scheduled_at timestamptz,
  timezone text NOT NULL DEFAULT 'Europe/Rome',
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','APPROVED','READY','PUBLISHING','PUBLISHED','FAILED','CANCELLED')),
  idempotency_key text UNIQUE,
  external_post_id text,
  external_post_url text,
  published_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK(attempt_count>=0),
  last_error text,
  source_system text NOT NULL DEFAULT 'RMP_REGIA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rmp_publication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.rmp_publication_jobs(id),
  event_type text NOT NULL,
  status text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Per impostazione predefinita nessun client anonimo/autenticato ha accesso.
-- Un backend server-side potrà usare credenziali riservate e controlli espliciti.
ALTER TABLE public.rmp_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmp_social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmp_landing_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmp_publication_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmp_publication_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.rmp_tracks, public.rmp_social_profiles, public.rmp_landing_routes,
  public.rmp_groups, public.rmp_publication_jobs, public.rmp_publication_events
FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE
  public.rmp_tracks, public.rmp_social_profiles, public.rmp_landing_routes,
  public.rmp_groups, public.rmp_publication_jobs, public.rmp_publication_events
TO service_role;

INSERT INTO public.rmp_tracks(slug,label,campaign_goal) VALUES
 ('imprese','REAL MEDIA PRO — promozione imprese','Contatti e preventivi'),
 ('immobiliare','Joseph Digital Real Estate — marketing immobiliare','Promozione immobili e contatti qualificati')
ON CONFLICT (slug) DO NOTHING;

-- Registri di profili (URL non verificati): NON sono token né connessioni OAuth.
INSERT INTO public.rmp_social_profiles (track_slug,platform,expected_url,account_type) VALUES
 ('imprese','facebook','https://www.facebook.com/josephrealmedia','PAGE'),
 ('imprese','instagram','https://www.instagram.com/realmediaproageency/','BUSINESS'),
 ('imprese','linkedin','https://www.linkedin.com/in/josephmalafronte/','PERSONAL'),
 ('immobiliare','facebook','https://www.facebook.com/JosephDigitalRealEstate/','PAGE'),
 ('immobiliare','instagram',NULL,'UNKNOWN'),
 ('immobiliare','linkedin','https://www.linkedin.com/in/josephmalafronte/','PERSONAL')
ON CONFLICT (track_slug,platform) DO NOTHING;

COMMIT;
