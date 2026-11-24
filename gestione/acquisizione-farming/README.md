# CASE247 · Acquisizione Avigliana — Centro Farming (20/11/2026)

## Origine
Unificazione operativa dei due file forniti dall'utente:
- `Piano_Farming_Avigliana_Agente_Immobiliare.xlsx` (4 fogli)
- `Foglio_Lavoro_Giornaliero_Agente_Immobiliare.xlsx` (3 fogli)

I file Excel originali NON sono pubblicati nel repository perché includono righe dimostrative con dati personali e testi non verificati. Il modulo sintetizza routine, zone, checklist, lettere, registri e KPI, senza importare gli esempi come contatti reali.

## Percorso
Dashboard `/gestione/` → `Acquisizione` → prima sotto-scheda `Farming Avigliana`.
Il modulo è ospitato sotto `gestione/acquisizione-farming/index.html` con stessa origine GitHub Pages. Non vengono cancellate le tre vecchie sotto-schede. Per le scadenze, i dati vengono sincronizzati tra iframe e Agenda usando `localStorage` nello stesso browser.

## Moduli
1. Oggi & Farming: checklist per data, zone A/B/C/D e B2B.
2. Notizie & Contatti: registro, fonte, indirizzo, stato, eventuale data di richiamo; import/export CSV. Le righe dimostrative dei fogli non vengono importate.
3. Follow-up 14:30–16:15 da lunedì a venerdì: crea attività della sola categoria `case247-farming-avigliana` nella chiave Agenda già esistente `case247-cc-tasks-v1`; gli altri compiti non sono sovrascritti. Nessuna chiamata automatica.
4. Lettere & Stampa: quattro modelli informativi con QR catalogo generato localmente (licenza MIT), A4/A5 tramite stampa del browser, registro di richiesta stampa e conferma manuale consegna.
5. OMI & Dossier: 35 valori di compravendita e locazione per Avigliana, semestre 2026/1, importati dai CSV forniti, con filtri per zona (7 codici OMI), tipologia e stato, fonte esplicita, mappa interattiva dei 7 perimetri KML, selezione manuale del record pertinente e stampa/PDF. Le quotazioni inserite manualmente nel browser restano separate. L'intervallo indicativo è superficie coerente con l'indicazione OMI × €/m²; non è una perizia.
6. Tracker 90 giorni: KPI manuali, conversioni, CSV.
7. Verifica funzioni: elenco controlli e limiti dichiarati.

## Limiti
- Nessun database online: i dati sono salvati in `case247-lab-avigliana-v1` nel `localStorage` del dispositivo/browser. Per trasferirli usare backup JSON o esportazioni CSV.
- La pagina statica GitHub Pages non offre controllo accessi ai dati memorizzati sul singolo browser: evitare informazioni sensibili e utilizzare un dispositivo protetto.
- Il CRM Excel esistente è aperto tramite il pulsante già configurato nella dashboard; nessuna scrittura diretta nel file Excel.
- I due Excel iniziali non contenevano quotazioni OMI; i valori ora derivano da tre file aggiuntivi forniti dall'utente: `QIP_1475977_1_20261_VALORI.csv`, `QIP_1475977_1_20261_ZONE.csv`, `A518.kml`. La prima coppia riporta elaborazione del 20/11/2026, il KML generazione 06/10/2026, tutti per il semestre 2026/1. Il catalogo sintetico è `omi-avigliana-2026-1.json`, elaborato da fonte caricata e non sottoposto a verifica online indipendente. La mappa è schematica e non geocodifica gli indirizzi. Le zone B1/C1/C2/D1/D3/D4/E1 non sono i quadranti commerciali A/B/C/D. Le quotazioni non sono una perizia o stima puntuale.
- Nessun invio di messaggi o chiamate automatiche; verificare la legittimità del trattamento e rispettare le opposizioni alla consegna di materiale.

## QA
`node --test tests/acquisizione-farming.test.cjs` e `node tests/studio-browser-smoke.cjs` nel workflow `case247-studio-browser.yml`.

QR stampabile: libreria qrcode-generator (MIT) salvata in `qrcode.js`; testo di licenza in `QR-LICENSE.txt`. Nessun servizio QR di terzi viene chiamato durante la generazione.

## Riconciliazione OMI 2026/1
- 7 zone nei dati ZONE; esattamente 7 placemark georeferenziati nel KML; 35 record di quotazione nel CSV VALORI. Tutti i `LinkZona` coincidono.
- Ogni quotazione conserva tipologia, stato (`NORMALE`/`OTTIMO`), compravendita min/max, locazione min/max, flag superficie `L` e codice zona. Nessun dato personale presente nel dataset pubblico.
- Esempio: C2 · Abitazioni civili, `NORMALE` 900–1350 €/m²; `OTTIMO` 1450–2150 €/m². Per lo stesso record OTTIMO, locazione 5,9–8,7 €/m²/mese.
- Il modello peritale deve essere compilato selezionando manualmente zona, tipologia e stato, a seguito di verifica della corrispondenza con l'immobile. Senza selezione non effettua calcoli.
- Test di regressione dedicati: `tests/omi-avigliana.test.cjs` e browser smoke.


## Installatore Excel VBA per Acquisizione (21/11/2026)

La scheda «Excel · VBA» all'interno del laboratorio mostra il modulo [CASE247_Acquisizione_Installer.bas](excel/CASE247_Acquisizione_Installer.bas).

- Importare il modulo in Excel desktop, salvare il workbook come `.xlsm` e avviare `InstallaAcquisizioneCASE247`.
- Il foglio «Acquisizione» usa 10 campi; la macro esporta CSV UTF-8 con le chiavi `date;zone;address;name;source;status;action;followDate;followTime;notes` riconosciute dall'importatore web.
- Le righe vengono create soltanto dall'utente; non ci sono esempi con contatti personali. Se il nome «Acquisizione» esiste, viene creato un foglio nuovo senza cancellare quello originale.
- Esportazione e importazione sono manuali; non esiste sincronizzazione diretta né esecuzione di macro sul sito GitHub Pages.
- La macro è dedicata all'**acquisizione immobiliare**; il registro personale del peso non è stato pubblicato nel repository.
- Prova statica CI: `node --test tests/acquisizione-farming.test.cjs`. La prova effettiva della macro richiede Microsoft Excel desktop per Windows.


## Revisione 21/11/2026 — due sole schede Excel

Il collegamento pubblico al modulo VBA ora genera una **nuova cartella .xlsx con esattamente due fogli**: `Acquisizione` (solo risultati effettivamente raggiunti nel farming di zona, per riga cliente/immobile) e `PESA` (registro annuale peso, IMC, grafico). Nessuna rubrica e nessun dato di peso/altezza predefinito nel repository pubblico. I dati effettivi sono inseriti localmente tramite Excel. Nessuna sincronizzazione automatica con il CRM web. I moduli web di acquisizione e OMI restano invariati.

Per lanciare l'installer: importare il `.bas` in una cartella `.xlsm`, poi premere ALT+F8 e avviare `InstallaAcquisizioneCASE247`. La macro non tocca il file di origine, apre una nuova cartella con due fogli, chiede localmente le misure e consente il salvataggio in `.xlsx`. L'esecuzione della macro non è collaudabile su GitHub Pages.

## Implementazione CSV → Excel .xlsm (21/11/2026)

- La scheda `Excel · VBA` offre **Esporta risultati raggiunti (CSV)**. Il file viene generato localmente da `case247-farming-daily-history-v1` (Storico Farming) e `case247-lab-avigliana-v1` (Notizie & Contatti), senza inviare dati a GitHub o a server.
- Sono inclusi esclusivamente eventi dichiarati **conclusi**: consegne con esito `Completato`, osservazioni concluse, risposte spontanee, notizie con stato `Qualificato` e incontri registrati come effettuati. Preparazione, attività future e follow-up non contribuiscono.
- Una riga per chiave `Comune + Via e civico + riferimento cliente/immobile`; i conteggi sono consolidati sullo stesso risultato (attenzione alle registrazioni duplicative tra registri).
- Il CSV comprende soltanto 12 campi ammessi e depura sequenze che sembrano recapiti telefonici; non esporta numeri di telefono o note libere del cliente.
- Per aggiornamenti ripetuti: aprire il file Excel locale **Acquisizione + PESA**, salvarlo come `.xlsm`, importare il modulo `CASE247_Acquisizione_Installer.bas` e lanciare `InstallaAcquisizioneCASE247` con Alt+F8. Da quel momento la macro `AggiornaRisultatiFarmingDaCSV` aggiorna la stessa riga sulla base della chiave, sostituendo (non sommando) i conteggi importati e preservando tutte le misurazioni sul foglio PESA. Il file mantiene **esattamente 2 schede**.
- Le macro non girano su GitHub Pages e l'esecuzione desktop non è attestata dai soli test web. Per aggiornare un file su un altro dispositivo occorre esportare/importare il CSV o trasferire il file in modo protetto.


## CRM aggiornato · Acquisizione e PESA (21/11/2026)

Il CRM dedicato resta accessibile tramite l'URL diretto `/gestione/acquisizione-farming/crm/`, senza introdurre nuovi pulsanti o modifiche di impaginazione nella pagina originale del Laboratorio. È una nuova pagina operativa con **esattamente 2 schede**.

**ACQUISIZIONE.** Il CRM legge automaticamente dallo stesso browser `case247-farming-daily-history-v1` (Storico Farming) e `case247-lab-avigliana-v1` (Notizie & Contatti), una riga per comune + via + riferimento. Mostra soltanto risultati conclusi e verificabili, senza attività pianificate. Il modulo per un nuovo risultato registra l'evento come `Completato` nello storico: non crea un secondo archivio parallelo. Aggiornamento automatico con eventi `storage`, ritorno in pagina e lettura periodica durante la visualizzazione. I telefoni non hanno campi dedicati e sequenze che sembrano recapiti sono rimosse dalle esportazioni.

**PESA.** Date 21/11/2026–21/11/2027 (366), pesate, IMC per adulti, grafico SVG. La prima apertura richiede una password scelta dall'utente (almeno 10 caratteri); PBKDF2 SHA-256 e AES-GCM memorizzano nel browser soltanto il contenuto cifrato. La password non viene conservata e non è recuperabile. Il foglio PESA può essere importato da un Excel locale per ripristinare le misurazioni esistenti.

**Excel.** Il comando "Esporta Excel · 2 fogli" produce uno snapshot `.xlsx` **senza macro**, comprendente Acquisizione + PESA; richiede PESA sbloccata e carica SheetJS dal CDN soltanto al momento dell'import/export. In alternativa "Esporta risultati CSV per VBA" consente di aggiornare la cartella `.xlsm` esistente mantenendo la macro. Un sito statico GitHub Pages **non può modificare automaticamente** un file Excel salvato sul PC, né sincronizzare dati privati fra dispositivi senza un backend autenticato. Questa implementazione rende automatico l'aggiornamento **del CRM nella pagina**, non la modifica autonoma del file sul disco. Dati locali e cifratura browser non sostituiscono un backup sicuro.

## 24/11/2026 — Operatività quotidiana delle vie C1/C2/D1
I riferimenti sono trascritti dalle descrizioni di zona del file OMI ZONE.csv 2026/1; verifica indipendente del perimetro nel KML A518. La lista vie per il presidio è: C1 — Via Suppo, Via Reano, Via Sant'Agostino; C2 — Corso Europa (S.S.25/ferrovia come riferimenti); D1 — Via Drubiaglio, Via Villardora (S.S.24 come riferimento). Non attribuire civici a un codice zona sulla sola base della via.

Rotazione proposta in `Oggi & Farming`: lunedì C1, martedì C2, mercoledì B2B, giovedì D1, venerdì recuperi/follow-up. `piano-strade-omi.js` integra azioni per ciascuna via: data, civici/tratto verificati, materiale preparato, materiale consegnato, controllo divieti, verifica manuale, note prive di nominativi, esportazione CSV e apertura delle quotazioni OMI col codice zona selezionato. Storage separato `case247-farming-strade-omi-2026-1-v1`; non altera i dati personali o il CRM Excel.

**Cautela nomi stradali:** OMI indica “Via Suppo”, ma esistono anche “Via dei Suppo” e “Via Giovanni Suppo”; “Via Villardora” è riportata anche come “Via Villar Dora” in alcuni elenchi. La denominazione stradale e il singolo civico devono essere verificati prima della registrazione di una consegna. La registrazione automatica di consegne non verificate è bloccata.

Test regressione: `node --test tests/strade-omi-farming.test.cjs`, browser smoke esistente.
