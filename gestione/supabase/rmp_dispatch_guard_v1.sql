-- REAL MEDIA PRO v1: scheduler fail-closed, nel solo nuovo Supabase.
-- Nessun dato delle sei tabelle preesistenti viene cancellato o modificato.
BEGIN;
CREATE TABLE IF NOT EXISTS public.rmp_dispatch_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton IS TRUE),
  enabled boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  last_result text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.rmp_dispatch_settings(singleton,enabled)
VALUES (true,false) ON CONFLICT(singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rmp_dispatch_auth (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton IS TRUE),
  key_sha256 text NOT NULL CHECK (key_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rmp_dispatch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rmp_dispatch_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rmp_dispatch_settings,public.rmp_dispatch_auth FROM PUBLIC, anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.rmp_dispatch_settings,public.rmp_dispatch_auth TO service_role;

-- Password ad alta entropia generata interamente nel DB; in Vault resta
-- soltanto il segreto cifrato, nella tabella applicativa soltanto SHA-256.
-- Mai stampare il segreto, mai salvare in GitHub.
DO $rmp$
DECLARE generated text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.rmp_dispatch_auth WHERE singleton IS TRUE) THEN
   generated := encode(extensions.gen_random_bytes(32),'hex');
   PERFORM vault.create_secret(generated,'rmp_dispatch_scheduler_v1');
   INSERT INTO public.rmp_dispatch_auth(singleton,key_sha256)
   VALUES(true,encode(extensions.digest(generated,'sha256'),'hex'));
 END IF;
END;
$rmp$;

COMMIT;