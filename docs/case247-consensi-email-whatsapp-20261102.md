# CASE IN PUBBLICITÀ 24/7 — Raccolta richieste immobili e consensi email / WhatsApp
Versione: 2026-11-02 (aggiornamento conferma titolare). Repositorio: `josephsocialmedia2-spec/joseph-link-in-bio-Copia`.
Progetto Supabase **solo** `qmeftxsdfeyqozwoivzo`.

## Scopo
Acquisire **volontariamente** richieste da compratori, proprietari venditori e imprese,
offrire proposte immobiliari e comunicazione pubblicitaria continuativa per i soli destinatari
che hanno espresso un consenso valido e il cui canale è stato verificato. È **vietato** trattare
recapiti raccolti da portali, annunci o registri pubblici come opt-in al marketing.

## Pagine GitHub Pages
- `/campagne/case247/richieste-immobili/` — modulo pubblico (3 percorsi).
- `/campagne/case247/privacy-richieste-immobili/` — informativa dichiarata **in revisione**.
- `/campagne/case247/revoca-consenso/` — revoca tramite token a uso riservato.
- `/gestione/case247-comunicazioni/` — console riservata per richieste, consensi e campagne DRAFT.
- `/gestione/` — dashboard principale collegata.
- `/gestione/case247-operazioni/` — Regia CRM esistente collegata.

## Backend Supabase
Edge Functions versionate nel repository:
- `case247-public-requests`: `GET` stato; `POST create_request` solo dopo gate legale, attivazione e Turnstile; `POST withdraw` via token SHA-256; nessun invio mail/WhatsApp.
- `case247-campaign-drafts`: solo staff CASE247 con JWT; crea campagne `DRAFT`, senza approvazione e senza invii.

Tabelle dedicate, con RLS attiva e nessun accesso anonimo diretto:
`case247_optin_settings`, `case247_property_requests`,
`case247_property_request_events`, `case247_property_campaigns`,
`case247_property_dispatch_jobs`.
Il modello tiene separati preferenza espressa (`email_optin_requested` / `whatsapp_optin_requested`),
prova dell'opzione (testo, informativa, timestamp), controllo recapito (`*_verified_at`),
revoca e stato della campagna. La checkbox non rappresenta da sola un canale confermato.

Trigger `case247_property_dispatch_gate`: impedisce `QUEUED` / `SENT` se manca
consenso verificato per il canale, se la richiesta è revocata, se la campagna o il diritto
di promuovere l'immobile non sono approvati, o se la configurazione di invio è disattivata.
Non sono installati processi automatici di invio.

Audit automatico `case247_capture_evidence_insert` e `case247_capture_evidence_update`.
`case247-purge-unverified-requests` (`cron.job` ID 2): `20 3 * * *` UTC.
Cancella richieste non confermate scadute da 30 giorni e revoche da 30 giorni senza
storia di invii `SENT`; gli audit collegati vengono cancellati con i dati.
Le registrazioni di invii avvenuti richiedono una retention dedicata da validare.

## Stato reale al 2 novembre 2026 — dopo conferma dell'identità
- **Titolare confermato dall'interessato**: Joseph Malafronte, persona fisica, per il marchio CASE IN PUBBLICITÀ 24/7. Nessuna società o partita IVA è stata attribuita in assenza di specifiche informazioni.
- Modulo pubblicabile, ma **raccolta dati disabilitata**.
- `case247_optin_settings.controller_confirmed=true` e `controller_display_name='Joseph Malafronte'` (identità, non approvazione legale).
- `case247_optin_settings.intake_enabled=false`, `privacy_notice_approved=false`, `anti_bot_verified=false`.
- Invio email e WhatsApp **disabilitati**.
- Endpoint pubblico richiede anche `CASE247_LEGAL_RELEASE_APPROVED=true`,
  `CASE247_TURNSTILE_SECRET_KEY` e `CASE247_TURNSTILE_SITE_KEY`, segreti solo server.
- `case247-property-requests` o `case247-campaign-drafts` non contengono token Meta
  o credenziali, e nessun segreto viene salvato in GitHub Pages.
- La landing propone intanto contatto WhatsApp **iniziato dall'utente**. Questo
  non equivale a consenso per invii promozionali ricorrenti.

## Release gate — condizioni necessarie prima di attivare
1. **Completato per il nome e la natura giuridica**: titolare Joseph Malafronte, persona fisica. **Ancora da verificare**: un recapito ufficiale effettivamente presidiato per le richieste di esercizio dei diritti ed eventuali ulteriori estremi di identificazione richiesti.
2. Approvare l'informativa definitiva art. 13 GDPR: finalità/basi, categorie di
   interessati, conservazione, trasferimenti, fornitori e ruoli, diritti e revoca.
3. Configurare e testare Cloudflare Turnstile con dominio GitHub Pages,
   salvando la secret in Supabase Edge Secrets; implementare rate limiting
   addizionale se il volume pubblico lo richiede.
4. Configurare conferma proprietario del recapito: email di conferma
   su provider ESP verificato e opt-in WhatsApp confermato secondo
   le Business Messaging policies. Nessun invio promozionale a
   `PENDING_VERIFICATION`; nessun flag `*_verified_at` inventato.
5. Separare chiaramente richieste di servizio e consensi marketing; conservare
   snapshot di testo e versione dell'informativa per ogni canale e possibilità di revoca.
6. Contrattualizzare/valutare i fornitori esterni con gli accordi privacy necessari.
7. Prima di approvare una scheda immobiliare accertare il diritto di pubblicizzarla,
   l'accuratezza dei dati e la pertinenza dei destinatari.
8. Attivare i gate nel database SOLO dopo prove E2E e verifiche privacy. Testare
   con destinatari reali consenzienti e contenuti approvati.
9. Per WhatsApp: usare l'API/fornitore autorizzato e template previsti.
   Non usare automazioni non ufficiali via WhatsApp Web.
10. Impostare sempre un'opzione per fermare gli invii in ciascun messaggio.
   L'email di marketing deve riportare identificazione mittente e disiscrizione,
   i messaggi WhatsApp rispettare opt-out e policy Meta.

## Limiti della conferma
La conferma della persona fisica consente di identificare il titolare ma non sostituisce la revisione della base giuridica, delle informazioni obbligatorie dell'art. 13, degli accordi con responsabili esterni, del test del modulo, della verifica dei recapiti o delle politiche delle piattaforme di invio. Il link WhatsApp avviato spontaneamente dall'utente non è un opt-in generalizzato. Restano disabilitati raccolta, invii e approvazione automatica delle campagne.

## Controlli effettivamente eseguiti
- Migrazioni Supabase additive riuscite; RLS presente e `anon` non ha SELECT.
- Test SQL sintetico in transazione: `EMAIL_OPTIN_REQUESTED` registrato,
  `QUEUED` negato, revoca tracciata, `ROLLBACK` senza dati residui.
- Test SQL cancellazione: richiesta fittizia scaduta + evento eliminati,
  `ROLLBACK` senza dati residui; `pg_cron` attivo.
- GitHub Actions `CASE247 consent-first | GDPR safety checks`:
  verifiche su opt-in non preselezionati, privacy non approvata,
  JSON API, GET pubblico disabilitato, POST respinto (503),
  endpoint staff senza JWT (401), CORS (204), sintassi JS.
- Non è stato eseguito il test dell'utente finale con un indirizzo reale
  né la conferma email/WhatsApp: non simulare risultati inesistenti.

## Promozione del modulo senza mailing list non autorizzate
Condividere spontaneamente il link attraverso sito, profili social, QR su
materiali promozionali, inserzioni mirate Meta/Google con conformità alle
rispettive policy e contenuti informativi che invitino a registrarsi.
Non spedire email o WhatsApp a persone individuate sui portali per chiedere
il loro consenso a futuri messaggi marketing.

## Fonti normative e policy
- Garante, Linee guida marketing/spam:
  https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/2542348
- Garante, provvedimento 14 maggio 2026:
  https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10263918
- GDPR art. 7 e art. 13:
  https://eur-lex.europa.eu/eli/reg/2016/679/oj/?locale=it
- WhatsApp Business:
  https://business.whatsapp.com/policy/

## Disattivazione e rollback
Non eliminare la banca dati precedente. Se emergono problemi, lasciare
`intake_enabled=false`, `email_outbound_enabled=false`,
`whatsapp_outbound_enabled=false`. La singola landing può essere tolta dai
link della dashboard senza alterare la Regia e le altre campagne.
