# Zero to Diamond · Cloud Operations (Next.js / Supabase / Google Drive)

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

File di schema: `database/schema.sql` — **NON applicato**, fino alla scelta esplicita di uno dei
due progetti Supabase attivi; tabelle `ztd_daily_runs`, `ztd_daily_tasks`, `ztd_audit_events`.
RLS attiva, grant anon/authenticated revocati, accesso lato server tramite secret key.
Non migrare il vecchio SQLite perché contiene esclusivamente record TEST sintetici.

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
