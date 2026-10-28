# REAL MEDIA PRO — sistema social isolato (STAGING INATTIVO)

**NON È UN SISTEMA IN PRODUZIONE.** Creato il 28/10/2026 nel ramo
`feature/rmp-social-isolato-20261028`; non integra né modifica il database
Supabase esistente `nqnmlsmeiynxbdojeyjt`.

## Architettura implementata

GitHub → GitHub Actions (standard runner, repository pubblico) → REST Supabase
**nuovo progetto isolato** → API ufficiali Meta e LinkedIn.
Nessuna dipendenza da OpenAI API, nessun workflow preesistente avviato.

- `schedule.py`: 9 righe/die (3 fasce × 3 canali); gestione CET/CEST tramite
  `zoneinfo.ZoneInfo("Europe/Rome")`; caption leggibili e diverse per canale,
  data giornaliera e link AgentPricing/WhatsApp non alterati.
- `worker.py`: dry-run, seed idempotente, verifica identità account,
  claim condizionale, riconciliazione, invio video e conferma via API,
  sospensione per esito incerto e scadenza token.
- `sql/schema.sql`: 6 tabelle nuove con RLS, visibilità dei dati limitata agli
  admin autorizzati, token social assenti dal database.
- `dashboard/`: interfaccia responsive bianca e blu cobalto, login Supabase,
  calendario, programmazione, connessioni, storico, errori, quota e
  sospensione/ripresa. Chiave pubblicabile soltanto nel browser; chiave
  `service_role` soltanto nel runner.
- `.github/workflows/rmp-isolated.yml`: test offline su commit di staging;
  eventi pianificati solo sul ramo predefinito (non in staging).

## Stato e blocchi effettivi

1. **BLOCCATO**: la presenza nella Libreria non certifica diritti su immagini,
   impaginazione, logo AgentPricing, font, eventuali template e audio.
2. **BLOCCATO**: nessun account FB/IG/LinkedIn della destinazione identificato
   senza ambiguità e autorizzato in questa sessione tramite API; non sono
   disponibili token OAuth utilizzabili.
3. **BLOCCATO**: non esiste un nuovo progetto Supabase con costo nullo
   confermato e RLS applicata; il progetto preesistente è espressamente escluso.
4. **BLOCCATO**: il video Library non è una URL HTTPS pubblica leggibile dalle
   API social. Una sola URL media verificata deve corrispondere al file con
   SHA-256 `eede47a5ded2c52e344c5f834aa6a6be958674531fd552aa8c306058dace9fc1`.
   Non caricare lo stesso file ripetutamente nello Storage.
5. **BLOCCATO**: budget, quota e limiti reali non verificati; il codice
   interpreta i limiti mancanti come SCONOSCIUTI e blocca la pubblicazione.
6. **NON ESEGUITO**: test OAuth/RLS reali, prova live e schedulazione attiva.

## Video e controlli

Originale: `VID-20261027-WA0006.mp4` — 3.540.857 byte, 17,566667 s,
480x854, H.264 High 30 fps, AAC-LC stereo 44.100 Hz,
SHA-256 `24148c620f19747ffc7cb8a865680e19b40411ac1d21d3fa2288b8c552fe97cb`.

Output locale pronto per le specifiche principali social:
`VID-20261027-WA0006_SOCIAL_540x960.mp4` — 2.542.302 byte, 17,566667 s,
540x960, H.264 30 fps, AAC-LC 48.000 Hz, SHA-256 sopra.
Il file binario non viene committato nel repository pubblico.

**Nota**: il backend Facebook pubblica come video della Pagina (`/{page}/videos`),
non garantisce classificazione come *Facebook Reel*. Per Facebook Reel occorre
usare e verificare separatamente il flusso `video_reels`.

## Sequenza di attivazione, una sola volta (non eseguita)

1. Documentare i diritti commerciali e approvare la specifica copia video.
2. Verificare costo nullo del **nuovo** Supabase; creare progetto distinto.
   Applicare `sql/schema.sql` **solo** lì e verificare realmente tutte le RLS
   anche con utente non admin; creare un utente Auth e inserirne l'UUID verificato
   in `public.rmp_admins` mediante SQL amministrativo nel nuovo progetto.
3. Inserire tramite amministrazione autenticata di Supabase i valori
   `expected_name` per ciascun account, ricavati da prove di titolarità.
   Non usare account individuati da un nome simile.
4. Configurare GitHub Actions Secrets **soltanto server-side**:
   `RMP_SUPABASE_URL`, `RMP_SUPABASE_SERVICE_ROLE`,
   `RMP_FACEBOOK_PAGE_ID`, `RMP_FACEBOOK_TOKEN`,
   `RMP_INSTAGRAM_ACCOUNT_ID`, `RMP_INSTAGRAM_TOKEN`,
   `RMP_LINKEDIN_OWNER_URN`, `RMP_LINKEDIN_TOKEN`,
   `RMP_VIDEO_URL`. Nessun token nel repository o nel JS.
   Variables: `RMP_VIDEO_HOST` (host HTTPS esatto),
   `RMP_VIDEO_SHA256` (hash del media approvato),
   `RMP_FACEBOOK_TOKEN_EXPIRES_AT`,
   `RMP_INSTAGRAM_TOKEN_EXPIRES_AT`,
   `RMP_LINKEDIN_TOKEN_EXPIRES_AT` ISO-8601 UTC.
   Le scadenze devono essere confermate, non inventate.
5. Inserire dati provider effettivamente verificati nella tabella `rmp_quotas`
   (`provider`, `used`, `allowance`, `verified_at`, `source`).
   Provider richiesti: github_actions, supabase, meta, linkedin.
   Dati vecchi oltre 24 h o sconosciuti impediscono invii e seed non essenziali.
6. Eseguire CLI `python worker.py dry-run`, poi test reali connessioni
   `python worker.py check` sul runner (in presenza dei Secrets); la modalità
   check verifica via API l'ID e l'esatto nome atteso e registra i metadati.
   I GET delle identità non dimostrano, da soli, il permesso di pubblicare.
7. Configurare `dashboard/public-config.json` con **solo** URL del nuovo
   progetto e publishable key. Pubblicare dashboard solo dopo test RLS.
8. Se test, diritti, quote, URL e autorizzazioni sono verificati,
   impostare `rmp_settings.rights_verified = true` dopo evidenza reale,
   `rmp_settings.enabled = true`, `RMP_LIVE_PUBLISH=YES`.
   Allo slot **già previsto**, eseguire `test-publish`: pubblica **al massimo
   una** voce READY già esistente, non crea un post aggiuntivo. Un GET API
   positivo marca la prova e `live_test_verified`.
9. Solo dopo prova positiva e QA reale, portare workflow su `main` per
   abilitare lo schedule e il sito. **NON FARE MERGE ADESSO**.
   Usare `tick` per eseguire altre voci READY degli slot esistenti.

## Scheduler e sicurezza operativa

Il cron contiene candidati alle 08/09, 14/15, 18/19 UTC, minuti 00 e 20;
Python determina il momento dovuto in Europe/Rome. Nel cambio d'ora
di marzo/ottobre restano 10:00, 16:00 e 20:00 italiani.
GitHub Actions non garantisce puntualità né esecuzione di ogni cron:
non si dichiara SLA di ±20 minuti. È prevista tolleranza interna di
**45 minuti di ritardo massimo**, dopo la quale lo slot viene lasciato
non pubblicato per evitare pubblicazioni tardive.

La chiave primaria per lo slot è deterministica; insert-only impedisce
rigenerare pubblicati. Ogni tentativo acquisisce CLAIMED via update condizionale.
Se una risposta è ambigua, stato UNCERTAIN: il worker cerca il contenuto
tramite API prima di eventuali azioni, ma **non riprova automaticamente**
senza evidenza di mancata pubblicazione. Tentativi limitati a 2,
con operatore e verifica negativa indipendente richiesti per reimmissione.
Un post già inviato non è annullabile da «Sospendi».

**Sospensione:** dashboard autenticata → Impostazioni → Sospendi pubblicazioni
(`rmp_settings.enabled=false`). Ulteriore blocco server:
rimuovere o impostare a un valore diverso da `YES` `RMP_LIVE_PUBLISH`.
In staging la pubblicazione è già disabilitata e il cron non è attivo.

## Livelli di prova

- Unit test GitHub Actions: simulazioni logiche, non chiamate a Meta/LinkedIn.
- `dry-run`: 9 bozze offline con data, orario, link e caption; nessuna scrittura.
- Query SQL/RLS: **NON ESEGUITA** su nuovo progetto, perché ancora inesistente.
- Pubblicazione live e controllo permalink: **NON ESEGUITI**.
- Supporto al rinnovo automatico OAuth: **NON IMPLEMENTATO** finché provider
  OAuth e refresh token autorizzati non sono disponibili. Scadenza token:
  controllo preventivo e blocco 48 h prima.

## Fonti ufficiali

- Instagram Reels API: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- LinkedIn Videos: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
- LinkedIn Posts: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- GitHub Actions schedule: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
