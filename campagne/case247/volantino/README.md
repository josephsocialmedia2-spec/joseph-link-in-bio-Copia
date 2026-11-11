# CASE247 — richiesta volantino (bozza di rilascio)
Pagina permanente: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/campagne/case247/volantino/

## Regola di attivazione
Il modulo resta disabilitato finché l'informativa GDPR non è APPROVATA e l'infrastruttura antispam non è verificata.
Il progetto Supabase rilevato ha intake_enabled=false, privacy_notice_approved=false e notice_version DRAFT-2026-11-02.
Non aggirare queste condizioni.

## Requisiti backend
1. Revisionare l'informativa art. 13 e le regole di conservazione/cancellazione, verifica legale; aggiornare il progetto esistente.
2. Applicare supabase/schema/case247_flyer_leads.sql tramite migration; impostare cancellazione automatica dei dati scaduti dopo approvazione.
3. Distribuire Edge Function case247-flyer-download con verify_jwt=false e limitazioni CORS, Turnstile attivo.
4. Impostare segreti server-side CASE247_LEGAL_RELEASE_APPROVED, CASE247_FLYER_GATE_ENABLED, CASE247_FLYER_DOWNLOAD_URL (URL esatto file Drive con ID 10njebDKvOjL2QmGfx9zaTNawdqPEABVO), CASE247_TURNSTILE_SECRET_KEY e CASE247_TURNSTILE_SITE_KEY.
5. Il PDF deve essere disponibile ai visitatori (attualmente Drive è privato). Il link Drive condivisibile può essere riutilizzato: il form è un gate di esperienza, **non DRM**. Un vero vincolo d'accesso richiede archivio privato e URL temporanei.
6. Verificare GET, POST registrazione reale senza dati di test identificativi in produzione, controllo CRM riservato, scaricamento, anti-bot e revoca/delezione.
7. Soltanto dopo verifiche, attivare branding/flyer-cta.json enabled=true e aggiungere CTA alle caption approvate. Instagram non garantisce link cliccabili in didascalia, pubblicare lo stesso link nella bio.

## Privacy
Nessun numero raccolto prima dell'attivazione. Nessun invio commerciale automatico. Non equiparare il download a consenso marketing.
