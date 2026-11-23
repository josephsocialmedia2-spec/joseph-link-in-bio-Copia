# Zero to Diamond · Cloud Operations (Next.js / Supabase / Google Drive)

## Destinazione confermata: Supabase personale (23/11/2026)
- Progetto: `nqnmlsmeiynxbdojeyjt` (`eu-central-1`), URL `https://nqnmlsmeiynxbdojeyjt.supabase.co`.
- Migrazione `ztd_daily_operations_private_schema_20261123` **applicata e verificata**: tre tabelle `ztd_`, due trigger di audit, bucket privato `ztd-documents`, RLS attiva, nessun grant anon/authenticated. Nessun record inserito.
- Vercel Next.js separato: `prj_jFmUe5HnTmHjkniYJxZLGD9Q0oZ0` (`zero-to-diamond-operations`), **nessun deployment e nessun Git collegato**.
- Variabili NON segrete collegate in Vercel, inclusa chiave pubblica Supabase, URL, bucket e `ZTD_AUTOMATION_ENABLED=false`.
- Guard: `ZTD_EXPECTED_SUPABASE_PROJECT_ID` impedisce di utilizzare per errore un altro progetto e `ZTD_PUBLICATION_ENABLED=false` blocca espressamente l'endpoint pubblico e l'approvazione.
- **Blocco residuo reale**: `SUPABASE_SECRET_KEY`, credenziali Google OAuth e refresh token non disponibili al runtime Vercel. Non riutilizzare OAuth del plugin ChatGPT come segreto dell'app.
- Cron NON configurato né attivato; non eseguite transazioni di produzione; non pubblicate riviste.

## Confine: non è attivato in produzione

Questa directory implementa il **nuovo sistema reale** in un **branch di preparazione**, nato da PR #187.
Non dipende da Python, SQLite, Codespaces o dalle schermate speculari. Non modifica il sito GitHub Pages.
L'originale statico e il suo laboratorio non vanno rimossi dal deployment esistente finché non avviene
il collaudo del nuovo progetto: il cutover richiede un'operazione successiva esplicitamente autorizzata.

### Flusso lato server

1. `GET /api/daily-automation` con Bearer CRON_SECRET oppure `POST` da operatore
   autenticato. **Bloccato di default** da `ZTD_AUTOMATION_ENABLED=false`.
2. Legge su GitHub il `latest.json` della bozza e il PDF effettivo. Verifica nome, firma PDF,
   dimensione e SHA256. Non esegue fact-checking editoriale né approva immagini.
3. Verifica la cartella Google Drive e l'accesso calendario. Carica un PDF privato dal nome
   deterministico `ZTD-Magazine-{day}-{hash}.pdf`; riusa il file se già esiste. Non crea duplicati
   al doppio clic, grazie al lock di stato della tabella `ztd_daily_runs`.
4. Salva entrambi i PDF anche in **Supabase Storage privato** (bucket `ztd-documents`)
   e genera un QR verso `APP_BASE_URL/api/publications/{day}`, non il link privato Drive
   che altrimenti sarebbe inaccessibile al lettore. Genera la lettera A4 PDF e la carica in Drive.
5. Scrive le righe di agenda + gli eventi reali Google Calendar nel Postgres Supabase.
   Solo il server autenticato usa `SUPABASE_SECRET_KEY`. I client non leggono direttamente
   il database.
6. La dashboard contiene tre sole card con iframe PDF, tasto approvazione con verifica
   esplicita immagini e ruolo editor, stampa, imbucata registrata con UTC e utente Supabase
   e agenda reale esportabile in CSV.
7. Il link pubblico rivista risponde **404 finché non è PUBLISHED**. In approvazione la versione
   diventa PUBLISHED nel DB; il PDF rimane privato su Drive ma è servito dal route handler.
   Nessun `anyone-with-link` viene creato su Drive.

### Database

File di schema: `database/schema.sql` — **applicato al solo progetto personale nqnmlsmeiynxbdojeyjt**; tabelle `ztd_daily_runs`, `ztd_daily_tasks`, `ztd_audit_events`.
RLS attiva, grant anon/authenticated revocati, accesso lato server tramite secret key.
Non migrare il vecchio SQLite perché contiene esclusivamente record TEST sintetici.

### Autorizzazione Google senza incollare refresh token

La tabella `public.ztd_google_auth` è **già creata e verificata** sul progetto Supabase
personale. Le credenziali OAuth sono cifrate con AES-256-GCM utilizzando il segreto
`GOOGLE_TOKEN_ENCRYPTION_KEY` di Vercel, separato dal database. L'integrazione è
read-only finché non viene completato un consenso Google valido.

1. Configurare `SUPABASE_SECRET_KEY` nel progetto Vercel `zero-to-diamond-operations`
   come variabile **encrypted**, solo server, mai `NEXT_PUBLIC_`.
2. Nel proprio Google Cloud Console abilitare **Drive API** e **Calendar API**; creare
   un OAuth 2.0 Client ID **Web application**, configurare la schermata consenso e
   aggiungere il proprietario del Drive fra i test user se l'app è in testing.
3. Impostare URI di reindirizzamento autorizzato **esatto**:
   `https://zero-to-diamond-operations.vercel.app/api/google/callback`.
4. Configurare in Vercel come encrypted `GOOGLE_OAUTH_CLIENT_ID` e
   `GOOGLE_OAUTH_CLIENT_SECRET`. **Non serve più copiare manualmente un refresh token**.
5. Supabase Auth → URL Configuration: aggiungere come redirect consentito
   `https://zero-to-diamond-operations.vercel.app/auth/callback`.
6. Dopo un deployment protetto e solo dopo la verifica dell'account amministratore,
   aprire l'app e usare il pulsante **Connetti Google Drive e Calendar**. L'utente
   autorizza Google nel browser una sola volta. Il callback confronta `state` e
   sessione operatore, verifica l'accesso in scrittura alla cartella nota e
   l'accesso a Calendar, poi salva il refresh token **cifrato** nel DB.
7. `/api/integrations/status` verifica con chiamate **di sola lettura** la connessione
   al DB, la cartella Drive e il calendario; non crea PDF, tasks, invii o campagne.

**Scopes**: la cartella già esistente in My Drive è stata creata fuori dall'app.
Per accedervi senza Google Picker, è necessario lo scope Google
`https://www.googleapis.com/auth/drive` (restricted). Può richiedere la verifica
OAuth per app distribuite pubblicamente. L'alternativa meno ampia
`drive.file` richiede scelta esplicita del file/cartella tramite Picker e
un flusso diverso. Lo scope Calendar è `calendar.readonly`.

**Sicurezza**: il refresh token non compare nel browser, negli eventi di audit
né negli output diagnostici. I flag `ZTD_AUTOMATION_ENABLED=false` e
`ZTD_PUBLICATION_ENABLED=false` restano inattivi anche dopo il consenso.
`GOOGLE_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET` e `APP_BASE_URL` sono già impostati
nelle env protette, ma nessun cron o deployment è ancora configurato.

### Configurazione Google Drive — IMPORTANTISSIMO

La cartella `1oHla667gbs3cCIPx4_JITkrd-gRQ-oyK` appartiene a **My Drive personale**.
I service account privi di delega non hanno quota/ownership per creare file in My Drive:
è necessario un account Google **OAuth 2.0** con consenso e refresh token offline, oppure
un Shared Drive Workspace dedicato con permessi corretti. La prima opzione è già prevista nel codice.

Configurare in Google Cloud (non inviare qui i segreti):
- abilitare Google Drive API e Google Calendar API;
- autorizzare gli scope necessari (`https://www.googleapis.com/auth/drive` per la cartella
  esistente, `https://www.googleapis.com/auth/calendar.readonly`);
- ottenere il refresh token con access_type=offline e collegarlo come segreto Vercel;
- verificare che il proprietario OAuth abbia accesso in scrittura alla cartella e in lettura
  al calendario specificato.

### Autenticazione

Supabase Auth magic link, accesso consentito esclusivamente alle email in
`ZTD_ADMIN_EMAILS`. Il tasto Approva richiede inoltre `ZTD_APPROVER_EMAILS`.
`SUPABASE_SECRET_KEY` non va mai in una variabile NEXT_PUBLIC o in JavaScript client.

### Cron 07:30 Europe/Rome

Vercel Cron interpreta orari in UTC. L'esempio
`vercel.cron.after-connect.json` contiene `30 5,6 * * 1-6`, due risvegli in UTC;
il route handler lavora **solo quando la local time Europe/Rome è 07:30**, per evitare un
doppio run alle transizioni di ora legale. Prima verificare limiti del piano Vercel.

L'esempio NON è `vercel.json` attivo e non è stato registrato. Quando gli accessi saranno
verificati e i test saranno passati, configurare Root Directory Vercel `apps/ztd-operations`
su un progetto Next.js separato. Solo allora impostare `ZTD_AUTOMATION_ENABLED=true` e
attivare il cron.

### Gate di attivazione

- [ ] Scegliere progetto Supabase specifico (personale vs Real Media Pro).
- [ ] Applicare SQL e verificare tabelle / RLS / isolamento.
- [ ] Testare Auth con un operatore e un approvatore reali.
- [ ] Testare OAuth Google e cartella Drive con una bozza innocua; verificare Calendar.
- [ ] Confermare GITHUB_REPOSITORY, GITHUB_DRAFT_REF, dominio APP_BASE_URL definitivo.
- [ ] Effettuare QA visivo/manuale sulle immagini: la vecchia edizione aveva foto non
      adatte. Non attribuire a Google Drive un controllo grafico che non è stato eseguito.
- [ ] Verificare build e tests su GitHub Actions in un ambiente privo di segreti.
- [ ] Configurare Cron e autorizzare la prima esecuzione reale.

### Sicurezza e GDPR

Nessuna chiamata a freddo o invio promozionale automatico. Una richiesta inbound
non implica consenso newsletter. Questa app non tratta contatti di vendita né
effettua attività riservate a mediatori abilitati.

Il PDF e il QR vanno revisionati PRIMA che qualcuno possa distribuire la lettera.
