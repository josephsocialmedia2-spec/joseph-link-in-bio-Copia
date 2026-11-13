# Case in Pubblicità 24/7 — Regia automatica sicura

Ultima revisione: 2026-11-13. Fonte primaria: repository GitHub esistente.
Questo documento descrive il codice reale e non certifica pubblicazioni future.

## Principi vincolanti

1. Una sola regia editoriale: `.github/workflows/case247-territorial-regia.yml`, alle 18:00 ora di Roma.
2. Un solo pubblicatore territoriale: `.github/workflows/case247-territorial-publisher.yml`, verifica ogni 15 minuti sui runner GitHub.
3. L'origine del catalogo è `https://lasacraimmobiliare.it/` (sola lettura).
4. Metricool brand 7844901: nessun nuovo post o calendario parallelo. Le 32 prenotazioni esistenti sono protette in `metricool-central-reservations.json`.
5. Mai attribuire lo stato PUBLISHED a un PENDING. Una ricevuta Meta è necessaria.
6. Mai pubblicare con dati non verificati, fotografie non raggiungibili, grafiche IA non controllate o su account diversi da quelli autorizzati.
7. Mai esporre token o dati personali in GitHub, negli asset Pages o nei report.
8. Nessun scraping di contatti personali, email o WhatsApp non richiesti. Le lead arrivano da richieste spontanee e consenso specifico.

## Componenti effettivi

- `scripts/sync_sacra_catalog.py`: sincronizza e normalizza il catalogo.
- `scripts/build_territorial_drafts.py`: crea bozze interne, senza alcuna azione social.
- `scripts/case247_territorial_engine.py`: costruisce il piano del giorno successivo entro 20 km; gli URL vengono canonizzati prima del controllo delle prenotazioni; le immagini IA sono ammesse solo con `approval=APPROVED` e `requires_fact_check=false`.
- `scripts/case247_legacy_transition.py`: importa le prenotazioni Metricool già esistenti; un record malformed/duplicato fallisce in sicurezza.
- `scripts/case247_quality_gate.py`: genera `campagne/case247/regia-territoriale/health-report.json` con soli contatori e codici di anomalia.
- `scripts/case247_territorial_publisher.py`: verifica giorno, stato, catalogo aggiornato, disponibilità, prezzo, URL, foto, comune, distanza, identità Meta e idempotenza prima dell'invio; registra INTENT prima dell'API e PUBLISHED solo su risposta confermata.
- `scripts/test_case247_*.py`: suite automatizzata di non regressione.

## Esecuzione e test

Da root del repository con Python 3.12:

```bash
python -m py_compile scripts/case247_territorial_engine.py scripts/case247_territorial_publisher.py scripts/case247_legacy_transition.py scripts/case247_quality_gate.py
python -m unittest discover -s scripts -p 'test_case247_*.py' -v
python scripts/case247_quality_gate.py
python scripts/case247_territorial_publisher.py
```

L'ultimo comando è DRY_RUN: non pubblica nulla. I workflow GitHub già presenti eseguono i controlli senza PC acceso. Il piano quotidiano si forma alle 18:00 (Europe/Rome); non avviare un secondo cron di produzione.

## Integrazione Meta e rilascio

Il codice live è **fail-closed**. Richiede *tutte* le condizioni seguenti:

- `CASE247_TERRITORIAL_LIVE=true` nelle variabili GitHub Actions.
- Secret GitHub Actions `CASE247_TERRITORIAL_ACCOUNTS_JSON` con mapping territoriale e token Meta validi, mai nel codice.
- Ogni comune destinatario: `auto_publish=true` e `channels[network]` con `status=ACTIVE_VERIFIED`, `provider_id` e URL `https` veritiero.
- Identità del provider confermata in tempo reale dalla Meta Graph API.
- Permessi effettivi rilasciati dal titolare: Facebook Pages e Instagram professional (dove applicabile).
- Catalogo validato da non più di 36 ore; fotografia raggiungibile con contenuto immagine; geofence e dati coerenti al momento dell'invio.
- Nessuna sovrapposizione con le prenotazioni congelate Metricool.

**Attuale incompatibilità operativa da gestire:** la funzione Supabase `case247-territory-connect` registra gli account in `case247_territorial_meta_accounts`, mentre il workflow GitHub consuma un secret JSON separato. La verifica OAuth nell'app non trasferisce automaticamente i token a GitHub. Finché il canale server-to-server non è implementato e autenticato, NON abilitare il live affidandosi soltanto all'onboarding nella dashboard. Non esportare token in file pubblici. Le verifiche di Meta restano atti autenticati del titolare.

## Regole per grafiche e annunci

L'inventario `campagne/case247/dietro-le-quinte/manifest-60.json` è una libreria, non un calendario. L'approvazione è una verifica del singolo asset, non una selezione quotidiana dei post. Le grafiche `PENDING` e `requires_fact_check=true` sono automaticamente escluse dalla coda. I contenuti confermati vengono scelti e alternati dal motore senza intervento manuale. Nessun prezzo o disponibilità viene dedotto dai soli asset IA.

## Lead, consenso e privacy

Il backend Supabase esistente `qmeftxsdfeyqozwoivzo` contiene CRM, richieste immobiliari, eventi di consenso e funzioni `case247-public-requests` e `case247-newsletter`.
Non creare un CRM parallelo. L'intake è spento finché informativa pubblicata e controllata, responsabile/titolare identificato, prova del consenso, antibot Turnstile e credenziali email non sono validati. La revoca dev'essere gratuita e semplice; bloccare il marketing dopo revoca. Distinguere gestione della richiesta spontanea e autorizzazione ulteriore al marketing per ciascun canale. Newsletter solo con double opt-in; nessun invio a liste raccolte da portali o fonti terze senza base giuridica adeguata. Dati lead e token solo su backend protetto con RLS; mai su GitHub Pages.

Riferimenti normativi: GDPR artt. 5, 6, 7, 12-22, 25, 30, 32 e Codice privacy art. 130 (con eccezione soft-spam limitata alle condizioni previste). L'adeguatezza giuridica e la reale titolarità del trattamento necessitano verifica organizzativa, non possono essere determinate dal codice.

## Diagnosi verificata 2026-11-13

- Supabase: progetto ACTIVE_HEALTHY; tabella `case247_territorial_meta_accounts` vuota, quindi nessun profilo territoriale certificato.
- GitHub: 41 territori; 82 canali FB/IG con stato DA_VERIFICARE; zero canali abilitati.
- Ultimo piano presente al momento del controllo: per 2026-11-12, `ready_for_provider=0`.
- `case247_optin_settings`: raccolta lead spenta, privacy approval=false, antibot=false, invio email=false.
- La verifica del codice e la presenza dei test non costituiscono prova di superamento CI o di post inviati. Confermare tramite log GitHub Actions e ricevute Meta, non dalla semplice presenza di una coda.

## Ripristino sicuro dopo errore

1. Leggere `health-report.json` e i log dello step che fallisce.
2. Se un invio è segnato `INTENT` o `UNCONFIRMED_NO_RETRY`, controllare prima Meta e la pagina originale: **non riprovare automaticamente**.
3. Lasciare intatti i post Metricool già programmati.
4. Correggere soltanto catalogo, media o autorizzazioni documentate; il piano successivo verrà rigenerato dalla regia delle 18:00.
5. Se un workflow salta o fallisce, non etichettare la giornata come pubblicata; controllare l'abilitazione di GitHub Actions, esecuzione scheduler e autorizzazioni.

