# CASE247 | Rilascio tecnico Meta, media e privacy — 13/11/2026

## Stato verificato

- Broker Meta Supabase `case247-regia-meta-bridge` attivo (versione 2). Non espone token a chiamanti anonimi: obbliga segreto server-to-server di almeno 48 caratteri. Non esporta i token in GitHub.
- Regia GitHub: `scripts/case247_supabase_meta_bridge.py --sync-config` allinea solo i profili verificati con il registro Supabase. Il publisher ottiene token in memoria, usa solo account autorizzati e verifica nuovamente gli ID su Meta.
- Rinnovo Meta: se il token scade entro sette giorni tenta scambio autorizzato su Meta e salva il nuovo token crittografato su Supabase. Per scadenza mancante verifica `debug_token`; se il token non è validabile, blocca la pubblicazione e richiede una nuova OAuth. Questo non elimina la necessità di una nuova autorizzazione quando Meta la richiede.
- Immagini: `scripts/case247_validate_graphics.py` verifica decodifica completa con Pillow 12.3.0, JPEG 1080x1350, integrità EOF, EXIF GPS, hash SHA-256 e duplicati. Verificate 60/60 il 13/11/2026 su GitHub Actions, zero errori. `technical_status=APPROVED` con hash in `manifest-60.json` per tutte e 60.
- Le 60 grafiche hanno ancora `approval=PENDING` e `requires_fact_check=true`: un controllo binario non certifica affidabilità delle immagini o diritti di utilizzo; il publisher continua a escluderle fino alla distinta validazione editoriale.
- `case247-public-requests` Supabase version 4: honeypot + Turnstile server-side, limite di 8 richieste per ora per impronta HMAC del prefisso IP, registrazione transazionale della prova di presa visione dell'informativa e delle scelte per canale **prima** del contatto in `case247_property_requests`. Le prove sono accessibili solo al backend e riportano versione, orario, prova HMAC e stato opt-in.
- Nuove tabelle con RLS: `case247_request_intake_audit`, `case247_intake_rate_limits`. Migration Supabase: `case247_atomic_consent_evidence_and_rate_limits`; fonte SQL in `sql/case247_atomic_consent_evidence_and_rate_limits.sql`.
- Sito: pagina privacy `campagne/case247/privacy-richieste-immobili/` versionata `DRAFT-CASE247-2026-11-13-01`; modulo `campagne/case247/richieste-immobili/` integrato.
- Nessuna pubblicazione, invio WhatsApp, mailing promozionale o nuovo lead è stato creato durante il rilascio.

## Secrets da configurare manualmente

### GitHub Actions > Settings > Secrets and variables

- **Secret** `CASE247_REGIA_BRIDGE_KEY`: segreto casuale di almeno 48 caratteri, IDENTICO a quello Supabase. Esempio generazione sicura: `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Non salvare mai la stringa nel repository.
- **Variable** `CASE247_TERRITORIAL_LIVE=true`: impostarla solo dopo che i canali territoriali risultano effettivamente presenti, autorizzati e abilitati su Meta/Supabase. La variabile da sola non consente invii senza autorizzazioni.

L'URL broker è fisso `https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-regia-meta-bridge`; `CASE247_META_BRIDGE_URL` è opzionale e deve restare nello stesso progetto. **Non** è necessario esportare `CASE247_TERRITORIAL_ACCOUNTS_JSON`.

### Supabase > Project Settings > Edge Function secrets

- **`CASE247_REGIA_BRIDGE_KEY`**: identico al secret GitHub.
- **`CASE247_META_APP_ID`**, **`CASE247_META_APP_SECRET`**: ID e secret della Meta App legittimamente autorizzata; indispensabili per la verifica ufficiale di scadenza e lo scambio token. I valori devono corrispondere all'app proprietaria dell'OAuth.
- **`CASE247_TOKEN_ENCRYPTION_KEY`**, solo se il token memorizzato usa il formato `aes256-env-v1` (chiave esistente da conservare, non ruotare senza migrare le cifrature). Se usa `aes256-hkdf-meta-v1`, la chiave deriva da `CASE247_META_APP_SECRET` e non serve il segreto dedicato.
- **`CASE247_IP_HASH_PEPPER`**: stringa segreta casuale di almeno 32 caratteri, per HMAC del prefisso IP; non scrivere mai indirizzi IP completi nel database dei consensi.
- **`CASE247_TURNSTILE_SECRET_KEY`** e **`CASE247_TURNSTILE_SITE_KEY`**: chiavi Cloudflare Turnstile configurate per `josephsocialmedia2-spec.github.io`; una chiave lato client non sostituisce la verifica server-side.
- **`CASE247_LEGAL_RELEASE_APPROVED=true`** soltanto dopo conferma documentata dell'informativa definitiva e degli accordi privacy. Non impostare a true per sbloccare un test.

Le variabili Supabase standard `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono usate dal backend e non vanno copiate in GitHub.

## Condizioni ancora bloccanti

1. Registro `case247_territorial_meta_accounts` non conteneva canali al controllo del 13/11/2026. Un amministratore legittimo deve eseguire il flusso OAuth ufficiale e verificare permessi e identità delle pagine/account; nessun codice può concedere permessi Meta senza il consenso del titolare.
2. Le righe registro vengono utilizzate solo quando `publishing_enabled=true` e verificate online. Il collegamento esistente `case247-territory-connect` salva prudentemente `VERIFIED_PENDING_DISPATCH`, non sblocca il live in automatico.
3. Una credenziale Meta esistente ha scadenza mancante: la nuova funzione tenta `debug_token` quando dispone di App ID/Secret; altrimenti blocca e segnala.
4. Per attivare la raccolta di contatti, occorrono verifica dei ruoli Joseph/La Sacra (comunicazione vs intermediazione), recapito effettivo del titolare, DPA con fornitori e trasferimenti, cronologia conservazione, approvazione formale dell'informativa e verifica reale Turnstile. Solo allora aggiornare in `case247_optin_settings` le quattro bandiere `controller_confirmed`, `privacy_notice_approved`, `anti_bot_verified`, `intake_enabled` con `notice_version` definitivo (senza `DRAFT`).
5. Il manifest convalida la qualità tecnica, non il contenuto. Le approvazioni editoriali restano una tantum e non devono essere confuse con selezioni quotidiane.
6. La regia esistente su `main` è attualmente configurata per **10 km**, mentre una precedente specifica CASE247 indicava **20 km**. Non sono state modificate unilateralmente le regole geografiche durante questo rilascio.

## Test

- GitHub Actions regia `43384056086`: esito success con 56 unit test e scansione reale 60 JPG, `blocked=0`.
- GitHub Actions publisher `43383859939`: esito success sui test publisher e policy; job live correttamente condizionato.
- Database: RLS attivo sulle tabelle aggiunte. RPC consentite a `service_role`, non a `anon`/`authenticated`. Tentativo con informativa in bozza respinto senza creare il lead né la prova. Test rate-limit eseguito e ripulito; nessun record fittizio persistente.
- Distribuzioni Edge Function `case247-regia-meta-bridge` v2 e `case247-public-requests` v4 confermate ACTIVE.
- Non è stata eseguita alcuna prova di pubblicazione Meta live o acquisizione reale, perché mancano requisiti legali/credenziali. Non interpretare test verdi come invii completati.
