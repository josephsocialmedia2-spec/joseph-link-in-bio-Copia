# CASE IN PUBBLICITÀ 24/7 — Registro integrazione tecnica
Data: 2026-11-01 · Progetto Supabase: `qmeftxsdfeyqozwoivzo` · Sviluppo GitHub: `feature/case247-unified-regia-20261101`.

## Perimetro e rollback
- Punto iniziale di ripristino su `main`: commit `61fbcb4d669a96bd87d55f9cbd4e0855c31c63e1`.
- Il branch introduce UI e script indipendenti; nessun vecchio dispatcher viene abilitato.
- Le modifiche SQL sono state **applicate al Supabase operativo** come migrazioni ADDITIVE: `20261101153819_case247_unified_crm_foundation_20261101` e `20261101154839_case247_inventory_and_source_gate_20261101`, seguite dalla migrazione additiva `case247_source_guard_service_role_usage_20261101`.
- Non cancellare migrazioni, tabelle o record per un rollback. Un rollback applicativo usa la precedente versione GitHub della dashboard; i dati CRM aggiuntivi rimangono isolati in Supabase.

## Audit verificato
- Repository GitHub: scansione automatica di **56 file HTML**. Inventario generato da GitHub Actions in `audit/case247/repository-inventory.json` e `.csv`.
- Classificazione provvisoria: 7 pagine di progetto CASE247, 19 percorsi immobiliari precedenti/partner, 18 pagine attività locali/clienti e 12 altre pagine.
- Supabase `rmp_landing_routes`: 48 percorsi storici, non necessariamente coincidenti con il repository.
- Nuovo `case247_page_inventory`: **61 percorsi unici**, di cui 56 visti nella scansione; 5 rimangono da riconciliare. Le pagine di attività locali sono marcate `CLIENT_EXTERNAL` / `ESCLUSA`. Nessun codice cliente è stato alterato.
- I risultati della scansione sono statici: non attestano disponibilità HTTP o il funzionamento di form e credenziali in produzione.

## Catalogo di acquisizione
- Fonte: `Catalogo_Integrato_59_metodi_Case247.xlsx` (59 metodi = A01–A44 e B01–B15).
- Creati 59 record in `case247_strategies` con titolo, categoria, territorio, URL fonte quando disponibile, vincolo di conformità.
- 6 schede del catalogo non presentano URL fonte: B01, B05, B09, B10, B11, B13; **non inventare collegamenti**.
- Stato di tutte le strategie: `CATALOGATA`. **Zero attivazioni commerciali**.
- Tracciabilità del catalogo importato: `config/case247-strategy-catalog.json` su questo branch.

## CRM & Sicurezza
Tabelle nuove: `case247_organizations`, `case247_staff_members`, `case247_page_inventory`, `case247_strategies`, `case247_sources`, `case247_crm_contacts`, `case247_crm_properties`, `case247_crm_leads`, `case247_consent_events`, `case247_suppressions`, `case247_crm_appointments`, `case247_market_observations`, `case247_workflow_events`.

- RLS attiva; concessa sola lettura autenticata per membri della corretta organizzazione. Accesso anonimo ai contatti vietato.
- Cross-tenant foreign key per contatti/immobili/lead; `case247_private.is_member` usata per le policy.
- Il consenso marketing non deriva dall'invio di una richiesta: preferenze esplicite e revoche sono entità distinte.
- Le osservazioni Seller Radar richiedono una fonte `APPROVED` con data di verifica; `case247_source_gate` impedisce l'inserimento da fonti non approvate.
- `case247-crm-admin-intake` è una Edge Function nuova (versione 2, middleware ufficiale `@supabase/server`, verifica JWT e `ctx.supabaseAdmin`) con `verify_jwt=true`; controlla l'utente e la membership sul server. Solo personale `admin/editor` può inserire richieste inbound. Zero invii promozionali.
- Il modulo di inserimento si trova in `gestione/case247-operazioni/`; le richieste esterne pubbliche sono ancora bloccate in attesa di informativa e CAPTCHA.

## Regia Digitale
- `gestione/case247-operazioni/index.html`: 12 moduli (Panoramica, Seller Radar, CRM Privati, CRM B2B, Lead Generation, Social Regia, Review, Workflow, Appuntamenti, Strategie, Analytics, Sicurezza) e inventario pagine.
- `gestione/index.html`: aggiunto accesso alla nuova Regia. I dati sono letti via Supabase Auth e RLS; KPI non inventati.
- `campagne/case247/auto-feed/review/`: conserva le 12 grafiche esistenti, di cui 8 Privati e 4 Aziende.
- Coda social CASE247: 24 job approvati in staging GitHub, ma `meta_enabled=false`; **nessuna pubblicazione Meta completata**.

## Test effettivamente eseguiti
1. Migrazioni SQL applicate con esito `success=true`.
2. Import catalogo: 59 strategie, 0 attive.
3. Censimento repository automatico: 56 file HTML, 56 percorsi distinti.
4. Rollback di collaudo CRM: inserimento contatto/proprietà/lead sintetici, deduplica evento e consenso marketing `REFUSED` validati; 0 record sintetici residui dopo ROLLBACK.
5. Blocco Seller Radar: fonte non approvata respinta, fonte approvata ammessa solo in transazione sintetica; 0 record residui.
6. Sessione `authenticated` senza ID utente: 0 lead, 0 pagine, 0 strategie visibili.
7. `anon`: nessun privilegio SELECT sui lead né INSERT tramite client autenticato.
8. QA statica su file GitHub: controlli su inventario, 59 strategie, 12 moduli e 24 job; workflow GitHub `CASE247 safe integration QA` disponibile. **Verificare esito CI sul PR**.
9. Edge Function `case247-crm-admin-intake` distribuita: versione 2, `verify_jwt=true`. **Manca test HTTP autenticato end-to-end**, dunque non dichiarare il form operativo finché quel test non riesce.

## Osservazioni sicurezza da risolvere
- Linter Supabase: `pg_net` nello schema `public` (preesistente); protezione password compromesse disabilitata in Auth (modifica da console, se disponibile).
- Avvisi informativi su tabelle legacy con RLS senza policy: non rimuovere la RLS per silenziare i warning. Questi record non sono automaticamente esposti.
- Le nuove tabelle CRM richiedono test con due utenti/organizzazioni differenti prima di gestire dati clienti esterni.
- Link guida: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Dipendenze ancora aperte — NON OPERATIVE
- Verifica Page ID Meta e Instagram Professional ID; OAuth ufficiale; conferma permalink delle prove; cron di pubblicazione.
- Ingest pubblico da landing: informativa, CAPTCHA/anti-bot, validazione e prova con richiesta sintetica.
- Source rights per Seller Radar: API/feed autorizzati da aggiungere; cron delle 04:30 non attivato.
- Integrazioni Google Ads, LinkedIn, TikTok, YouTube, Google Calendar, Make/n8n, fonti e servizi email: non configurate né testate qui.
- AI scoring, report automatici, conversion attribution e ROI: nessun dato inventato; implementazione successiva.
- Migrazione dei siti esterni/clienti: esclusa fino a verifica proprietà e approvazione.

## Procedura di rilascio
1. Verifica PR e CI statica; esamina diff per modifiche a siti clienti (non devono essercene).
2. Esegui test browser della Regia in sessione `caseinpubblicita@gmail.com` e test GET/POST protetto Edge; NON usare dati personali reali prima del collaudo.
3. Accetta formalmente privacy, retention e requisiti di onboarding prima di collegare i form pubblici.
4. Solo per la nuova Regia, fai merge del branch in `main`; controlla deployment GitHub Pages e corretta navigazione.
5. Conferma tempi e condizioni OAuth prima di attivare le pubblicazioni social.
6. Rollback UI: ripristina `gestione/index.html` dalla versione precedente al merge; lascia le tabelle protette e inattive.

## QA supplementare
- Pipeline GitHub Actions `CASE247 safe integration QA`: prima esecuzione su commit `c0ea033d` completata con `success`; pipeline riavviata in seguito all'aggiornamento del middleware ufficiale.
- Documentazione API di riferimento: https://supabase.com/docs/guides/functions/auth e https://supabase.com/docs/guides/functions/auth-headers.
- Nessun test HTTP in sessione amministratore è stato simulato come riuscito.

## Verifica live GitHub Pages + endpoint — 1 novembre 2026
- Dashboard `/gestione/` e nuova Regia `/gestione/case247-operazioni/`: **HTTP 200** verificato tramite GitHub Actions.
- 12 moduli operativi, pannello review 8 Privati + 4 Aziende e **tutti e 12 i JPG**: controlli HTTP riusciti.
- Edge Function CRM senza token: **GET 401, POST 401**. Preflight CORS dal dominio GitHub Pages: **204** con origine consentita.
- Sintassi JS della pagina Regia: `node --check` superato.
- Risultato finale collaudo pubblico: **14/14 controlli riusciti**, workflow https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/runs/41332029729.
- Il primo test esteso ha rilevato un HTTP 503 temporaneo su un asset, poi disponibile HTTP 200; il runner applica un retry limitato soltanto ai GET per errori transitori. Non nascondere eventuali errori persistenti.
- Endpoint CRM aggiornato alla **versione 3**, con verifica esplicita dell'organizzazione `CASE IN PUBBLICITÀ 24/7`; il front-end impone lo stesso filtro e non abilita il form senza conferma GET autorizzata.
- Esito test salvato in `case247_workflow_events` come evento `github_actions_41332029729`, status `SUCCEEDED`.
- **Test di login amministratore e POST autenticato da browser: ancora non effettuati**. Nessuna credenziale o email OTP è stata recuperata o consumata dall'assistente.
- Pubblicazione Meta e Seller Radar schedulato: **ancora disabilitati**.
