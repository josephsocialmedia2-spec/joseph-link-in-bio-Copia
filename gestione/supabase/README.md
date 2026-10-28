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
