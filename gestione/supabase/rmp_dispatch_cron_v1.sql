-- Cron server-side nel NUOVO progetto Supabase (UTC per i tick).
-- Il dispatcher è autenticato con un segreto generato in Vault, non nel codice.
-- La pubblicazione resta DISABILITATA per default in rmp_dispatch_settings.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule(
 'rmp_dispatch_guarded_5min_v1',
 '*/5 * * * *',
 $job$
 SELECT net.http_post(
   url:='https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/rmp-dispatch',
   headers:=jsonb_build_object(
     'Content-Type','application/json',
     'x-rmp-dispatch-key',
       (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='rmp_dispatch_scheduler_v1')
   ),
   body:='{"source":"supabase_pg_cron"}'::jsonb,
   timeout_milliseconds:=10000
 ) AS request_id;
 $job$
);