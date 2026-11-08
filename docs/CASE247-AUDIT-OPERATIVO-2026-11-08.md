# Case in Pubblicità 24/7 — audit operativo 8 novembre 2026

**Fonte:** file del repository `main`, verificati l'8 novembre 2026. Questo rapporto non costituisce un collaudo in produzione. Gli stati qui indicati descrivono le evidenze disponibili, non presumono accessi a Meta o ai GitHub Secrets.

## Evidenze verificate

- Workflow: `.github/workflows/case247-b2b-meta.yml`; scheduler ogni 20 minuti, ma il trigger programmato è subordinato alla variabile `CASE247_B2B_SCHEDULE == true`.
- Diagnostica disponibile `campagne/case247/auto-feed/b2b-status.json`, salvata il 7 novembre 2026 alle 16:19 UTC: `authentication=NOT_VERIFIED`, `missing_configuration=[META_PAGE_ACCESS_TOKEN]`, `queue_enabled=false`, `schedule_requested=false`, `eligible_jobs=0`.
- Coda 1–4 novembre: 24 invii approvati su due piattaforme, `meta_enabled=false`, `no_automatic_meta_publish=true`.
- Registro pubblicazioni: due invii segnati `PUBLISHED`, CASE247-010 Facebook e Instagram, con permalink; non è stata eseguita una nuova verifica live dei post.
- Recupero esplicitamente autorizzato: CASE247-009, CASE247-011, CASE247-012 su Facebook e Instagram, previa riconciliazione contro duplicati.
- Manifest attuale include una seconda coda `2026-11-07_2026-12-06/queue.json`: 120 invii dal 7 novembre al 6 dicembre, **nessuno approvato**, senza JPEG, `meta_enabled=false`.
- Configurazione territoriale: 41 comuni, 41 `landing_check.http_status=200` registrati il 7 novembre, nessun URL Facebook territoriale e nessun URL Instagram territoriale valorizzati. Questi controlli HTTP non sono una prova di funzionalità end-to-end della landing.
- Il token Meta precedentemente incollato in chat va considerato compromesso; non deve essere riutilizzato.

## Registro di interventi prioritari

| ID | Blocco | Priorità | Intervento | Criterio di completamento | Stato |
|---|---|---|---|---|---|
| META-01 | Meta e autenticazione | P0 | Revocare il token esposto; generare un nuovo Page Access Token con autorizzazioni ufficiali; memorizzarlo come secret `META_PAGE_ACCESS_TOKEN` senza esporlo | Richiesta Graph API autenticata con token protetto, permessi accertati | BLOCCATO DA AUTORIZZAZIONE ESTERNA |
| GH-01 | GitHub Actions | P0 | Eseguire workflow in modalità dry-run con nuovo secret e controllare log e test | Run GitHub concluso con PASS e diagnostica senza `missing_configuration` | NON VERIFICATO |
| PUB-01 | Pubblicazioni | P0 | Riconciliare e recuperare solo CASE247-009, 011 e 012, senza duplicazioni | Sei esiti verificati o esclusioni motivate, con ID e permalink | BLOCCATO DA META-01/GH-01 |
| GH-02 | GitHub Actions | P1 | Dopo un test reale superato, verificare abilitazione scheduler e guardrail della coda | Esecuzione automatica confermata, nessun invio non autorizzato | NON ATTIVO |
| PUB-02 | Calendario editoriale | P1 | Completare JPEG e revisione dei 120 lavori bozza; approvare individualmente secondo processo editoriale | Solo contenuti con testo e media approvati diventano eleggibili | INCOMPLETO |
| DASH-01 | Dashboard e CRM | P1 | Collaudare dashboard e raccolta lead, status reali e consenso | Test reale di visualizzazione e ricezione lead con prova | NON VERIFICATO |
| TERR-01 | Landing e territorio | P1 | Verificare in navigazione le 41 landing, registrare i profili territoriali effettivamente esistenti e il relativo collegamento Meta | Ogni comune classificato con evidenza; nessun profilo inventato | PARZIALE |
| TEST-01 | Collaudo | P0 | Eseguire test Python, API, pubblicazione Facebook/Instagram, permalink, anti-duplicazione e pianificazione | Verbale PASS/FAIL/BLOCKED con link alle esecuzioni | NON COMPLETATO |

## Sequenza senza sprechi

1. **P0 sicurezza:** sostituzione del token esposto; non condividere la nuova credenziale in chat e non inserirla nel repository.
2. **P0 test:** eseguire GitHub Actions manuale con `dry_run=true`; confermare autenticazione e test.
3. **P0 recupero:** `workflow_dispatch` in modalità `recover` per ciascuno degli ID autorizzati, con `dry_run=false` **solo dopo** riconciliazione remota e conferma degli account.
4. **P1 continuità:** non abilitare la coda nuova fino a media disponibili e approvazione; verificare se schedulazione e meccanismi di deduplicazione coprono l'esecuzione senza supervisione.
5. **P1 territorio/CRM:** completare le verifiche indipendenti dal token.

## Criteri di chiusura

Il progetto può definirsi operativo solo con almeno una pubblicazione reale su ciascun social e URL verificati, nuova credenziale sicura, GitHub Actions superato, scheduler verificato su un'occorrenza reale e dashboard con stato coerente. Le 41 landing con HTTP 200 non implicano 41 coppie social attive. Non considerare le bozze non approvate come pubblicabili.

## Collegamenti

- [Dashboard](https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/)
- [GitHub Actions](https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/workflows/case247-b2b-meta.yml)
- [GitHub Secrets](https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/settings/secrets/actions)
- [Registro pubblicazioni](https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/blob/main/campagne/case247/auto-feed/publish-ledger-b2b.json)
