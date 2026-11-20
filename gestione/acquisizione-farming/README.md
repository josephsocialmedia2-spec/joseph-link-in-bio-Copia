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
5. OMI & Dossier: valori €/m² da trascrivere da fonte ufficiale verificata (codice zona, semestre, tipologia, stato, min/max e fonte). Intervallo indicativo = superficie commerciale × valori €/m². Non è una perizia né un prezzo consigliato. Stampa/PDF via browser.
6. Tracker 90 giorni: KPI manuali, conversioni, CSV.
7. Verifica funzioni: elenco controlli e limiti dichiarati.

## Limiti
- Nessun database online: i dati sono salvati in `case247-lab-avigliana-v1` nel `localStorage` del dispositivo/browser. Per trasferirli usare backup JSON o esportazioni CSV.
- La pagina statica GitHub Pages non offre controllo accessi ai dati memorizzati sul singolo browser: evitare informazioni sensibili e utilizzare un dispositivo protetto.
- Il CRM Excel esistente è aperto tramite il pulsante già configurato nella dashboard; nessuna scrittura diretta nel file Excel.
- Nessun valore numerico OMI ufficiale era presente nei fogli sorgente. Vietato interpretare un intervallo OMI come perizia o stima puntuale.
- Nessun invio di messaggi o chiamate automatiche; verificare la legittimità del trattamento e rispettare le opposizioni alla consegna di materiale.

## QA
`node --test tests/acquisizione-farming.test.cjs` e `node tests/studio-browser-smoke.cjs` nel workflow `case247-studio-browser.yml`.

QR stampabile: libreria qrcode-generator (MIT) salvata in `qrcode.js`; testo di licenza in `QR-LICENSE.txt`. Nessun servizio QR di terzi viene chiamato durante la generazione.
