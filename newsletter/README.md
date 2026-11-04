# CASE247 — Newsletter mensile (stato: BLOCCATO FINO AD AUTORIZZAZIONE)

## Implementato
- Pagina `/newsletter/`, collegata al catalogo La Sacra, con scelta facoltativa e verifica email.
- Pagina di disiscrizione con token HMAC firmato, valido senza password.
- Supabase Edge Function `case247-newsletter`: verifica, revoca e invio mensile tramite Resend.
- PostgreSQL: `case247_newsletter_subscribers`, `case247_newsletter_events`, `case247_newsletter_dispatches`, `case247_newsletter_settings`. Tutte le tabelle hanno RLS e nessun accesso ai ruoli anon/authenticated.
- Workflow GitHub Actions `case247-newsletter-monthly.yml`: giorno 1 ogni mese, alle 10:00 Europe/Rome.
- Workflow `case247-newsletter-drive-sync.yml`: esportazione quotidiana CRM verso Google Sheets, solo con credenziali protette.
- CRM Google Sheet: https://docs.google.com/spreadsheets/d/1ZLgeIqJzupfk4Q1VnIZmPbitKOvNZaUwxeNG9Zx3qfY/edit

## Configurazione protetta ancora necessaria
1. Approvare l'informativa privacy, il ruolo di titolare/responsabili e le condizioni per l'invio marketing.
2. Attivare Cloudflare Turnstile per dominio `josephsocialmedia2-spec.github.io`.
3. Configurare un account Resend e verificare un dominio mittente.
4. Nel progetto Supabase `qmeftxsdfeyqozwoivzo`, impostare i secrets:
   - `CASE247_TURNSTILE_SITE_KEY`
   - `CASE247_TURNSTILE_SECRET_KEY`
   - `CASE247_RESEND_API_KEY`
   - `CASE247_MAIL_FROM` (mittente verificato, es. `Nome <newsletter@dominio-verificato.it>`)
   - `CASE247_UNSUB_SECRET` (segreto casuale forte, persistente)
5. Nel repository GitHub, Actions secrets:
   - `CASE247_NEWSLETTER_SERVICE_ROLE_KEY` (chiave service role di Supabase; *mai* in codice o client)
   - `CASE247_SHEETS_SERVICE_ACCOUNT_JSON` (credenziali service account con permesso editor esclusivamente sul foglio CRM)
6. Condividere il CRM Google Sheet **solo** con l'email tecnica del service account scelto (non tramite link pubblico).
7. Dopo validazione e test, impostare `case247_newsletter_settings.intake_enabled=true, privacy_approved=true, antibot_verified=true, outbound_enabled=true`, `notice_version` su una versione definitiva; verificare anche le condizioni di `case247_optin_settings` (attualmente disabilitate). **Non aggirare questi blocchi.**

## Policy operativa
Non importare indirizzi email reperiti da annunci pubblici, elenchi telefonici o scrape. I 18 numeri fissi rintracciati non forniscono alcun consenso email. Il click su un annuncio non equivale a consenso marketing. In ogni email c'è il link `Disiscriviti`. Non inviare telefonate/WhatsApp a chi ha consentito soltanto alla newsletter via email.

## Controlli prima dell'attivazione
- GET `https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-newsletter?action=status` deve riportare `intake_enabled=true`.
- Eseguire un'iscrizione *propria di test*, controllare email di conferma, evento `CONFIRMED_EMAIL`, invio mensile di prova in finestra temporale autorizzata e disiscrizione.
- Verificare che il CRM su Google Drive riporti correttamente stato, email verificata e revoca.
- Ricontrollare limiti invio per base destinatari superiore a 100 prima di abilitare invii su larga scala.

**Non dichiarare mai attiva l'automazione prima dei test e dei secrets.**
