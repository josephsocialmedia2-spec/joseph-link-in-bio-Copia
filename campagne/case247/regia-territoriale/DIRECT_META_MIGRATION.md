# CASE247 · Pubblicazione diretta con l'app Meta esistente

## Scelta architetturale
Provider principale: **Meta Graph API**, via `scripts/case247_territorial_publisher.py` e workflow `.github/workflows/case247-territorial-publisher.yml`. Nessun nuovo abbonamento e nessuna chiamata ricorrente a Metricool per il nuovo scheduler.

La Regia, il catalogo e gli account territoriali rimangono nel progetto CASE247. L'app Meta è quella già utilizzata dall'infrastruttura corrente: **non crearne un'altra**.

## Protezione transizione
Al 2026-11-11, il brand Metricool centrale 7844901 aveva 32 uscite automatiche future fino al 2026-12-09 e 3 bozze. Le 32 uscite erano già censite in `campagne/case247/regia-territoriale/metricool-central-reservations.json`: confronto con l'account disponibile effettuato nel corso dell'intervento, tutti e 32 gli ID coincidenti. La ricerca estesa copriva fino al 2027-02-28.

Questa è una **copia congelata di sola lettura**. Il dispatcher CASE247:
- evita un nuovo annuncio per lo stesso immobile nei giorni già occupati dalle vecchie uscite;
- NON consulta Metricool e NON consuma quote Metricool durante le esecuzioni future;
- usa `config/case247-direct-meta-transition.json` per validare la correttezza del registro congelato;
- rifiuta di operare se il conteggio o i dati di protezione sono alterati;
- non prova a cancellare o a riprogrammare le 32 vecchie uscite.

**Vincolo operativo:** dal congelamento non inserire nuovi post in Metricool. Se vengono aggiunte nuove uscite sul servizio precedente, il registro va riconciliato prima di attivare gli account territoriali. Il file congelato non è una connessione continua a Metricool.

Le uscite centrali precedenti erano impostate anche su FB e IG insieme: la regola «un immobile, una sola pubblicazione nella rete al giorno» si applica al nuovo dispatcher e non corregge automaticamente le vecchie uscite su entrambi i canali. Per una transizione senza eccezioni occorre disattivare i post preesistenti prima di passare al nuovo sistema, una volta che il nuovo è verificato.

## Stato attuale e passaggi necessari
1. Le 41 landing sono presenti, ma nessun account territoriale nel file `config/case247-territorio.json` è ancora `ACTIVE_VERIFIED` con `provider_id`, URL, consenso e `auto_publish=true`.
2. Prima del live occorre completare il collegamento di tutte le risorse Meta richieste tramite la **stessa app** e verificare i permessi Pages/Instagram. Non pubblicare su account senza permessi reali.
3. La configurazione delle credenziali di account è letta da GitHub Actions Secret `CASE247_TERRITORIAL_ACCOUNTS_JSON`; i segreti non vanno mai nel repository pubblico. Per molti account valutare un vault esistente se il limite dimensionale del secret non basta.
4. Attivazione dello scheduler live esclusivamente tramite GitHub variable `CASE247_TERRITORIAL_LIVE=true`, dopo gli esiti dei test e un pilot verificato. È **disattivata** in assenza di tali condizioni.
5. I risultati di invio sono registrati in `campagne/case247/regia-territoriale/publish-ledger.json` con intento persistito prima dell'invio per impedire doppioni.
6. Il workflow 18:00 `.github/workflows/case247-territorial-regia.yml` mantiene il catalogo e i piani aggiornati.

## Validazione
```bash
python -m unittest discover -s scripts -p test_case247_territorial_engine.py -v
python -m unittest discover -s scripts -p test_case247_legacy_transition.py -v
python -m py_compile scripts/case247_territorial_engine.py scripts/case247_territorial_publisher.py scripts/case247_legacy_transition.py
```

**Non dichiarare LIVE, PROGRAMMATO SU META o PUBBLICATO finché esiti provider e autorizzazioni non sono verificati.**
