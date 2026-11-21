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
