# Zero to Diamond · Ambiente STAGING integrato

Questo laboratorio apre il **codice del repository completo** senza pubblicarlo su GitHub Pages, modificare main o inviare messaggi reali. È separato dalla produzione e usa una barra di avviso su tutte le pagine.

## Avvio dal browser, senza installare programmi
1. In GitHub apri il branch `test/ztd-full-staging-lab-20261122`.
2. Seleziona **Code → Codespaces → Create codespace on this branch**.
3. Attendi l'avvio del contenitore: il server parte su porta **8765**.
4. Apri la porta inoltrata 8765, con visibilità **Private**, e quindi `/__staging__/`.
5. Apri le 13 aree, in particolare **Funnel e CRM sintetico** in `/__staging__/funnel.html`. Esegui i test A–F.

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
- Tutte le scritture sui percorsi reali sono bloccate: POST/PUT/PATCH/DELETE = **405**. Sono accettati POST **solo** sotto `/__staging__/api/` per simulazioni sintetiche con header dedicato, verifica stessa origine e JSON ristretto.
- Tutte le pagine HTML ricevono `Content-Security-Policy: connect-src 'self'; form-action 'none'`, quindi le API esterne e le submit native non funzionano. La pagina `/__staging__/funnel.html` usa soltanto fetch verso la API locale con intestazione `X-Staging-Lab: synthetic-only`.
- Script di test blocca link esterni, `window.open` esterno e avvisa esplicitamente del perimetro STAGING.
- Niente credenziali, dati di clienti o dati sensibili; usare soltanto **dati inventati**.
- I registri `localStorage` delle pagine originali restano nel browser, **non costituiscono CRM multiutente**. Il funnel di prova usa **un database SQLite distinto**, salvato in `/tmp/ztd-synthetic-<utente>-<porta>.sqlite3` oppure nel percorso indicato da `STAGING_DB_PATH`. Non sincronizza il CRM produttivo e contiene solo identità generate (`TEST ...`, `@example.test`).
- Le integrazioni reali (Supabase, Meta, email, publisher, Excel VBA, GitHub Actions) non sono esercitate in modalità reale. Il simulatore consente di testare richiesta, qualificazione, autorizzazioni separate, follow-up promozionale bloccato/simulato, appuntamento, handoff ad `AGENTE TEST`, opposizione, chiusura e KPI calcolati da SQLite. Non esiste alcun invio reale.
- I PDF e gli asset presenti nel branch sono versioni di repository. Il gate editoriale continua a bloccare edizioni non approvate. **Attenzione: i QR già incorporati nei PDF storici possono puntare alla produzione: non scansionarli con il telefono.** Verificarne soltanto la destinazione come testo e usare l'URL corrispondente nello staging per la navigazione di prova.
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
E. Agenda → Farming → CRM locale → KPI (pagine originali, senza sincronizzazione).
F. Funnel di prova → richiesta TEST → SQLite → consensi → follow-up → AGENTE TEST → KPI; ripeti il test con autorizzazioni negate per verificare i blocchi.

Le operazioni F sono **reali transazioni locali SQLite su dati inventati**, non chiamate simulate con schermate finte. Non sono collegate ai moduli produttivi. Le integrazioni di produzione, Excel e publisher restano *NON VERIFICATE IN STAGING*.

### API sintetica e reset
- `GET /__staging__/api/health` — verifica isolamento.
- `GET /__staging__/api/state` — contatti TEST, eventi e KPI.
- `POST /__staging__/api/requests` — genera solo scenari e origini da liste chiuse.
- `POST /__staging__/api/leads/{id}/{qualify|permissions|followup|appointment|handoff|close|stop}` — registra transizioni di prova; verifica gli opt-in.
- `POST /__staging__/api/reset` — azzera **solo** il database di prova, dopo conferma.
- La API rifiuta nomi, recapiti, testi liberi, richieste cross-origin, payload senza header e tutte le scritture ai percorsi delle pagine reali. Le identità sono generate dal server.
- La persistenza dipende dal filesystem del Codespace; se l'ambiente viene ricreato il database in `/tmp` può scomparire. La funzione di reset non tocca alcun dato reale.

## Prossimo livello
Per un URL indipendente, condivisibile e accessibile senza Codespaces, creare un deployment **Preview protetto** su Vercel partendo dal branch dedicato, utilizzando una build che disabiliti tutte le API esterne. L'accesso Vercel richiede l'autorizzazione del team. Non creare un deployment pubblico che riutilizzi endpoint e credenziali di produzione.
