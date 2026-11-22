# Zero to Diamond · Ambiente STAGING integrato

Questo laboratorio apre il **codice del repository completo** senza pubblicarlo su GitHub Pages, modificare main o inviare messaggi reali. È separato dalla produzione e usa una barra di avviso su tutte le pagine.

## Avvio dal browser, senza installare programmi
1. In GitHub apri il branch `test/ztd-full-staging-lab-20261122`.
2. Seleziona **Code → Codespaces → Create codespace on this branch**.
3. Attendi l'avvio del contenitore: il server parte su porta **8765**.
4. Apri la porta inoltrata 8765, con visibilità **Private**, e quindi `/__staging__/`.
5. Apri tutte le 12 aree dal portale e registra i risultati con i test A–E.

Se il browser non apre automaticamente la scheda, seleziona **Ports → 8765 → Open in Browser**.

## Avvio in locale (Windows, macOS, Linux)
```bash
python3 tools/staging/server.py
# http://127.0.0.1:8765/__staging__/
```

Oppure Docker:
```bash
docker compose -f docker-compose.staging.yml up
```

## Sicurezza e limiti
- Nessun endpoint di scrittura server: POST/PUT/PATCH/DELETE = **405**.
- Tutte le pagine HTML ricevono `Content-Security-Policy: connect-src 'self'; form-action 'none'`, quindi le API esterne e le submit native non funzionano.
- Script di test blocca link esterni, `window.open` esterno e avvisa esplicitamente del perimetro STAGING.
- Niente credenziali, dati di clienti o dati sensibili; usare soltanto **dati inventati**.
- I registri `localStorage` restano nel browser del collaudatore, **non costituiscono CRM multiutente**.
- Le integrazioni reali (Supabase, Meta, email, publisher, Excel VBA, GitHub Actions) non sono esercitate in modalità reale: vanno testate con servizi di staging/credenziali dedicate prima del rilascio.
- I PDF e gli asset presenti nel branch sono versioni di repository. Il gate editoriale continua a bloccare edizioni non approvate.
- La preview GitHub Codespaces rimane privata, soggetta alla configurazione del proprietario. Non renderla pubblica.
- Evitare anche di cliccare manualmente link di produzione fuori dalla sandbox.

## Test di collaudo
```bash
python3 -m unittest discover -s tools/staging -p 'test_*.py' -v
```

Per browser integration test in CI è previsto `scripts/ztd_staging_browser_qa.cjs`, con `playwright` installato nel runner.
Per vedere le ultime esecuzioni: GitHub → Actions → **Zero to Diamond · Full STAGING QA**.

## Test di accettazione
A. Volantino → QR → landing → modulo (solo lato browser, senza invii).
B. Gestione → Lettere & Stampa → lettore → PDF e lettera.
C. Newsletter → preferenze → disiscrizione (solo UI, backend disabilitato).
D. Informazioni → qualificazione → handoff (non reale).
E. Agenda → Farming → CRM locale → KPI.

I passaggi che richiedono un database reale, sincronizzazione Excel o publisher vengono registrati come *NON VERIFICATO IN STAGING*, non come successo.

## Prossimo livello
Per un URL indipendente, condivisibile e accessibile senza Codespaces, creare un deployment **Preview protetto** su Vercel partendo dal branch dedicato, utilizzando una build che disabiliti tutte le API esterne. L'accesso Vercel richiede l'autorizzazione del team. Non creare un deployment pubblico che riutilizzi endpoint e credenziali di produzione.
