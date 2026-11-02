# CASE IN PUBBLICITÀ 24/7 — Report operativo 2026-11-02

Stato: **PRE-PRODUZIONE**. Titolare: Joseph Malafronte, persona fisica.
Repository: https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia
Supabase: `qmeftxsdfeyqozwoivzo`

## Interventi effettuati
- Centro verifiche GDPR: pubblicazione GitHub Pages verificata (l'errore HTTP 404 precedente non si riproduce).
- Funzione Supabase `case247-emergency-stop`: distribuita in versione 1 con JWT obbligatorio e controllo admin. Può soltanto disabilitare raccolta/invii e annullare code non inviate.
- Console comunicazioni: aggiunto pulsante STOP admin e anteprima matching interna per comune, tipologia, prezzo/budget, diritti e consensi.
- Funzione `case247-public-requests`: distribuita versione 3, revoca separata email/WhatsApp o totale con token.
- Trigger `case247_cancel_pending_after_optout`: migrazione applicata, cancella code HELD/QUEUED interessate dalla revoca senza alterare i messaggi già inviati.
- Pagina revoca: opzioni separate email, WhatsApp e tutte.
- Manuale fornitori: `docs/case247-provider-release-checklist.md`.

## Test confermati
- SQL sintetico transazionale: revoca email annulla soltanto la coda email; revoca WhatsApp annulla anche la relativa coda. ROLLBACK eseguito.
- RLS richieste e campagne: lettura consentita allo staff dell'organizzazione.
- Database: zero richieste, zero campagne, zero job dopo i test.
- API pubblica: modulo e invii disattivati.
- GitHub Actions: https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/runs/41413581750 (esito SUCCESS).

## Condizioni ancora aperte
1. Verifica operativa del recapito privacy `caseinpubblicita@gmail.com`.
2. Approvazione informativa e registro; fornitori, contratti, trasferimenti e retention.
3. Turnstile: credenziali reali, rate limiting e test anti-bot non ancora collaudati.
4. Conferma reale dei recapiti email e WhatsApp, ESP e WhatsApp Business Platform con account e template autorizzati.
5. Procedura completa per gestione diritti interessati e test E2E.
6. Validazione dei diritti di pubblicità e delle campagne prima degli invii.

## Blocchi attivi
`privacy_notice_approved=false`
`anti_bot_verified=false`
`intake_enabled=false`
`email_outbound_enabled=false`
`whatsapp_outbound_enabled=false`

Questa consegna non certifica la conformità giuridica e non abilita marketing. La revisione finale richiede verifiche reali.
