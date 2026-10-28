# REAL MEDIA PRO — nuovo Supabase

Progetto indicato dall'utente: https://supabase.com/dashboard/project/qmeftxsdfeyqozwoivzo

Questo è **materiale di preparazione**, non una migrazione eseguita.
Il collegamento Supabase attuale di ChatGPT è ancora autorizzato per il vecchio account; sul progetto nuovo restituisce PERMISSION_DENIED.

1. Ricollegare Supabase in **ChatGPT → Settings → Plugins → Supabase**, autorizzando la nuova email. Non condividere password o chiavi qui.
2. Verificare il nuovo progetto e il piano senza acquistare o avviare upgrade.
3. Eseguire **bootstrap.sql** e poi **seed_landing_routes.sql** nel nuovo progetto, tramite connessione autenticata. Creano sei tabelle pubbliche protette da RLS, senza policy aperte a client browser. Gli URL dei social restano NON_VERIFICATI.
4. Eseguire audit di tabelle/RLS, poi collegare il backend riservato e i flussi OAuth; prima prova su un account verificato, poi eventualmente la programmazione.

**Non cancellare** F1 Social, il vecchio Supabase isolato, Neon, né le 63 attività programmate.
**Non inserire** mai token, service role, password o cookie in GitHub Pages. La tabella eventi non sostituisce la verifica dell'effettiva pubblicazione.
Il registro dei gruppi conserva soltanto dati organizzativi: iscrizione e permessi di promozione richiedono conferma reale e non vengono automatizzati.

Origine dei riferimenti: `gestione/social-routing.json` e l'inventario della dashboard `gestione/index.html`.

## Coda editoriale centralizzata — 28 ottobre 2026

- Il file [seed_editorial_drafts_45x3.sql](seed_editorial_drafts_45x3.sql) è stato applicato al progetto Supabase `qmeftxsdfeyqozwoivzo`.
- Verifica database: **135 bozze** in `public.rmp_publication_jobs`, 45 Facebook, 45 Instagram, 45 LinkedIn. Divisione: 75 contenuti immobiliari, 60 contenuti per imprese.
- I 45 temi promozionali provengono dalle 48 pagine della regia; escluse 3 pagine tecniche. Fonte testi `gestione/piano-editoriale/pagine.json` e titolo/URL delle landing esistenti.
- Gli slot predisposti vanno dal 29 ottobre al 12 novembre 2026 alle 10:00, 16:00, 20:00 `Europe/Rome`; sono **slot editoriali**, non un calendario di pubblicazioni effettivamente attive.
- Ogni riga è in `DRAFT`, senza file media e senza permessi di pubblicazione. `idempotency_key` ne impedisce la duplicazione nella stessa versione.
- Il riepilogo `gestione/editorial-batch-status.json` è solo uno snapshot pubblico delle metriche della coda, NON una lettura diretta del database.
- Non attivare lo scheduler del vecchio worker `rmp-isolato` per queste righe: quel worker usa un differente schema (`rmp_posts`/`rmp_settings`) e non è ancora stato migrato a `rmp_publication_jobs`.
- Prima di qualsiasi pubblicazione: verificare titolarità e OAuth degli account, formato/media (Instagram richiede supporto media valido), copy e autorizzazioni, idoneità dei singoli canali, token, quota e protezione antiripetizione. Niente pubblicazione automatica ai gruppi Facebook tramite API dismessa.
