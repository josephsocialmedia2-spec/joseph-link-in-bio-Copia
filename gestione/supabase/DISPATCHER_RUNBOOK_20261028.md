# REAL MEDIA PRO — Motore social, stato operativo

Aggiornato: 28 ottobre 2026. Progetto unico: Supabase `qmeftxsdfeyqozwoivzo`.
Repository: `josephsocialmedia2-spec/joseph-link-in-bio-Copia`.
**STATO ATTUALE: PARZIALE — motore e cron funzionanti ma PUBBLICAZIONE DISABILITATA.**

## Componenti installati

- `public.rmp_publication_jobs`: 135 righe originarie, tutte `DRAFT/POST`, 0 video.
- `public.rmp_social_profiles`: 6 destinazioni, 0 OAuth API verificati.
- `public.rmp_dispatch_settings`: singleton `enabled=false` (kill switch).
- `public.rmp_dispatch_auth`: solo SHA-256 della chiave cron.
- `vault.decrypted_secrets`: chiave generata server-side con nome `rmp_dispatch_scheduler_v1`. Non è memorizzata in GitHub.
- Edge Function `rmp-dispatch` (v2): POST interno protetto tramite header `x-rmp-dispatch-key`; supporto video/Reel per le tre piattaforme con verifica identità, scadenze, upload e registrazione degli esiti.
- Edge Function `rmp-public-status` (v3): soli dati aggregati pubblici, compresi video pronti e account API verificati.
- `cron.job` `rmp_dispatch_guarded_5min_v1`: `*/5 * * * *`, chiamata con `pg_net` tramite secret Vault.
- Supabase Storage bucket `rmp-social-videos`: pubblico in lettura per media destinati alle API, nessuna policy di upload anonimo, file video MP4/MOV max 50 MB.
- Regia GitHub Pages `gestione/#social-queue`: calendario unico e stato di prontezza live.

## Collaudo eseguito (28 ottobre)

1. Invocazione POST priva di chiave: HTTP **401**, `AUTH_REQUIRED`.
2. POST con chiave Vault: HTTP **200**, `SUSPENDED`, published=0.
3. Prima esecuzione automatica pg_cron osservata alle **2026-10-28 13:30:00 UTC**, esito `succeeded`.
4. GET `rmp-public-status`: HTTP **200**, 135 righe, 135 DRAFT, 45 Facebook, 45 Instagram, 45 LinkedIn, 0 published, 0 ready_videos, 0 verified_profiles, dispatcher_enabled=false.
5. Hash e segreto Vault presenti, RLS attiva sulle tabelle private, no policy Storage di scrittura pubblica.
6. Nessuna modifica ai vecchi progetti Supabase/Neon.

## Barriere obbligatorie prima di una qualsiasi pubblicazione reale

Sono tutte necessarie, non intercambiabili:

1. Account di destinazione verificato tramite OAuth/API ufficiale (`auth_status=VERIFIED`, `external_account_id` verificato, scope `pages_manage_posts`, `instagram_content_publish` o `w_member_social`).
2. Token/ID server-side verificati e in scadenza oltre 48h. Segreti richiesti (a seconda del canale):
   `RMP_FACEBOOK_PAGE_TOKEN`, `RMP_FACEBOOK_PAGE_ID`, `RMP_FACEBOOK_TOKEN_EXPIRES_AT`,
   `RMP_INSTAGRAM_ACCESS_TOKEN`, `RMP_INSTAGRAM_ACCOUNT_ID`, `RMP_INSTAGRAM_TOKEN_EXPIRES_AT`,
   `RMP_LINKEDIN_TOKEN`, `RMP_LINKEDIN_OWNER_URN`, `RMP_LINKEDIN_TOKEN_EXPIRES_AT`,
   `RMP_ALLOWED_MEDIA_HOST`, opzionali `RMP_META_API_VERSION` e `RMP_LINKEDIN_VERSION`.
   Non inserire MAI valori segreti in GitHub Pages, SQL pubblico o questa documentazione.
3. File video originale presente nel bucket, URL HTTPS pubblico funzionante, MIME video valido, dimensione 1 KB–50 MB, diritti di pubblicazione verificati. Per i video nel bucket usare media host `qmeftxsdfeyqozwoivzo.supabase.co`.
4. Contenuti e destinazioni revisionati, job `content_type=REEL` o `VIDEO`, `status=READY`, `media_url` valorizzato, `scheduled_at` Europe/Rome.
5. Attivazione esplicita del kill switch `public.rmp_dispatch_settings.enabled=true` SOLO dopo verifiche positive su tutti i prerequisiti.

Il dispatcher sceglie solo i video READY in una finestra di 20 minuti dallo slot. Il claim transazionale REST con confronto `status=READY` impedisce la doppia esecuzione concorrente. Se l'esito remoto è incerto, mantiene PUBLISHING, salva gli ID remoti disponibili e verifica in sola lettura le pubblicazioni già inviate, senza inviarle una seconda volta.

## Limiti verificati

- Il file `VID-20261027-WA0006.mp4` (e la versione `_SOCIAL_540x960.mp4`) non è stato individuato nelle risorse disponibili della Libreria, di Google Drive e dei due vecchi Storage Supabase. Non creare un video sostitutivo.
- Il browser Meta Business Suite già autenticato NON costituisce consenso OAuth/API.
- Il worker precedente `rmp-isolato` e la workflow Neon rimangono separati; NON abilitare due dispatcher concorrenti.
- I 135 contenuti sono bozze testuali; non sono nove video già programmati per ogni giorno.
- Le piattaforme possono imporre approvazioni API, restrizioni sui media e limiti di pubblicazione. Non aggirare verifiche di sicurezza.
- Il Security Advisor segnala un warning relativo a `pg_net` installato in `public` (non relocatable). Non eliminare l'estensione in produzione senza backup delle richieste pendenti e valutazione dei job dipendenti. Le 8 tabelle private con RLS senza policy generano avvisi INFO attesi; nessun accesso anonimo è autorizzato.

**Non dichiarare `OBIETTIVO REALIZZATO: OK` finché tre post video di prova realmente pubblicati su Facebook, Instagram e LinkedIn non siano verificati via API e le nove pubblicazioni giornaliere non risultino correttamente programmate e attive.**

## Fonti operative

- `gestione/supabase/rmp_dispatch_guard_v1.sql`
- `gestione/supabase/rmp_dispatch_cron_v1.sql`
- `gestione/supabase/rmp_storage_video_bucket_v1.sql`
- `gestione/supabase/functions/rmp-dispatch/index.ts`
- `gestione/supabase/functions/rmp-public-status/index.ts`
- `gestione/editorial-panel.js`
