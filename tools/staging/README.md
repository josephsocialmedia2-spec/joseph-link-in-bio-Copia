# Zero to Diamond · Ambiente STAGING integrato

Questo laboratorio apre il **codice del repository completo** senza pubblicarlo su GitHub Pages, modificare main o inviare messaggi reali. È separato dalla produzione e usa una barra di avviso su tutte le pagine.

## Simulatore con SCHERMATE IDENTICHE e clic reale — 23/11/2026

Il branch `feat/ztd-two-pane-guided-operations-20261123` contiene una revisione radicale della prima guida a checklist. L'URL rimane `/__staging__/guided.html`.

**La pagina di sinistra** carica una vera schermata del gestionale presente nel repository, resa da `tools/staging/server.py` su origine STAGING; l'operatore può cliccare pulsanti, sfogliare, compilare esclusivamente il CRM sintetico ed osservare gli effetti della propria azione.

**La pagina di destra** carica una **seconda copia della STESSA schermata**. Un anello dorato e l'etichetta **«CLICCA QUI»** identificano l'elemento HTML esatto, trovato da un selettore DOM verificabile. Sotto la copia trovi una spiegazione di cosa fare, cosa aspettarti e il risultato. La copia di destra è **read-only (pointer-events:none)**, non si possono inviare dati da lì. Dopo il clic a sinistra il software attende e verifica l'esito: navigazione a pagina corretta, visualizzazione del modello, cambio di stato registrato nel database SQLite, evento bloccato, o completamento effettivo dei sette controlli. **Non c'è più il tasto «Avanti» sbloccato con una spunta sulla guida**. Se il comando non è presente o l'esito manca, il passo rimane BLOCCATO senza simulare successi.

### Percorsi attivi
1. **Lettere/Rivista:** nella pagina originale Farming clicca `#rew-open-flipbook` (apre lettore originale), poi `#letter` (verifica realmente il PDF). Per i modelli A/B/C, **non presenti nel gestionale produttivo**, viene aperta la pagina **didattica** `/__staging__/letter-models.html`: tre pulsanti reali, anteprime basate sul Manuale Italia V2, controllo destinazione QR e verifica del gate editoriale senza alcuna pubblicazione.
2. **Inbound/CRM:** il vero simulatore SQLite `/__staging__/funnel.html` reagisce a creazione nuova richiesta TEST, qualifica, tentativo di follow-up negato, modifica permesso TEST e follow-up simulato. Ogni step legge il vero stato del database TEST.
3. **Handoff:** creazione e qualifica TEST, blocco iniziale del trasferimento, poi pagina `/__staging__/workflow-training.html?mode=handoff` con **sette controlli da selezionare uno alla volta**, convalida, ritorno al CRM TEST, permesso sintetico, handoff e chiusura. Nessun agente reale.
4. **Routine:** otto pulsanti di simulazione nella pagina `workflow-training.html?mode=routine`, da eseguire in sequenza, osservando i cambi di stato.
5. **Newsletter e opposizioni:** due rotazioni editoriali distinte, prova di blocco invii, creazione record TEST, evento `NON_CONTATTARE` realmente salvato nel database sintetico.

I due iframe caricano sempre **la medesima pagina e lo stesso URL del modulo**. Per le pagine interattive la guida sincronizza a destra i risultati visivi non persistiti e i controlli sintetici, ma non può garantire fedeltà per ogni componente di terzi o stato interno dell'intero gestionale originale. Se un comando originale cambia identificativo o non è visibile, l'avanzamento viene bloccato: richiede aggiornamento del selettore e nuovo test.

### Limiti e protezioni
- **Mai usare dati reali.** Solo identità sintetiche generate dal server e indirizzi `@example.test`; nessuna email, WhatsApp, telefonata o trasferimento esterno.
- Nessuna mediazione, stima professionale o negoziazione da parte degli addetti marketing.
- La Lettera B è individuale su richiesta, A/C sono non nominative. I tre modelli A/B/C sono un **modulo formativo nuovo**, non un set di PDF già pubblicati nel gestionale.
- Su Vercel è pubblicabile **solo l'anteprima statica**, protetta da Vercel SSO: le due schermate e i modelli sono visibili, ma il CRM SQLite non è disponibile e **gli step CRM non avanzano** senza un evento nel database.
- In Codespaces sul branch, apri la porta **8765 Private**, poi `/__staging__/guided.html`. Non rendere pubblico il server Python.
- Test E2E: `node scripts/ztd_two_pane_qa.cjs` con Chrome e Playwright. Il portale staging include l'accesso alla guida.

### Apri il branch in Codespaces
`https://github.com/codespaces/new?hide_repo_select=true&ref=feat%2Fztd-two-pane-guided-operations-20261123&repo=1431333923`

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
