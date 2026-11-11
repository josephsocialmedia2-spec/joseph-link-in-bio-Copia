# CASE247 — Regia territoriale 24/7

## Obiettivo e regole
Distribuire ogni immobile La Sacra disponibile una sola volta al giorno
nell'intera rete Facebook + Instagram, fino a 20 km dalla localizzazione
pubblica, usando 41 landing territoriali e i canali effettivamente collegati.
Non ripetere un immobile sullo stesso giorno o per riempire slot liberi.
I 60 JPG Dietro le quinte vanno sempre presentati come ricostruzioni IA,
non come documentazione di visite, attività di agenzia o mutui avvenuti.

## Meccanismi di sicurezza
- Catalogo da La Sacra products.json con stato di disponibilità esplicito.
- Localizzazione da descrizione di fonte verificata, non dal solo titolo.
- Comune di destinazione entro 20 km, calcolato da bbox comunale conservativa
  OSM/Nominatim quando mancano coordinate esatte dell'immobile.
- UNKNOWN, SOLD_OUT, ON_HOLD, foto IA come annunci reali, località non
  verificate: nessuna autopubblicazione.
- Fino a tre immobili e tre grafiche per account, in slot distanziati di 4 ore.
- Controllo delle 18:00 Europe/Rome, aggiornamento dei piani futuri.
- Non pubblicare su account senza autorizzazione Meta e collegamento verificato.
- Un intento remoto incerto non viene ritentato alla cieca: evita duplicati.

## Percorsi
- scripts/case247_territorial_engine.py: calcolo rotazione geografica.
- scripts/test_case247_territorial_engine.py: test obbligatori.
- scripts/case247_territorial_publisher.py: Meta Graph con doppio blocco.
- config/case247-geo-verified.json: centri e bbox da fonte OSM.
- campagne/case247/regia-territoriale/plans/YYYY-MM-DD.json: piani giornalieri.
- campagne/case247/regia-territoriale/latest-plan.json: ultimo piano.
- campagne/case247/regia-territoriale/reconciliation.json: diff catalogo.
- campagne/case247/regia-territoriale/publish-ledger.json: ID provider.
- gestione/regia-territoriale/: dashboard centrale dedicata.
- .github/workflows/case247-territorial-regia.yml: revisione alle 18.
- .github/workflows/case247-territorial-publisher.yml: invio solo se autorizzato.

## Prima attivazione dei 41 FB + 41 IG
Gli account non possono essere creati o collegati in modo simulato.
Per ciascuno verificare autorizzazione Meta, ID, URL e permessi reali.
Nel file config/case247-territorio.json impostare nei canali:
status ACTIVE_VERIFIED, provider_id reale, url reale e auto_publish true
SOLO quando effettivamente autorizzati.

Token solo in GitHub Actions Secrets: CASE247_TERRITORIAL_ACCOUNTS_JSON.
Esempio di struttura (non contiene credenziali reali):
{"vaie":{"facebook":{"page_id":"ID","access_token":"SECRET"},
"instagram":{"ig_user_id":"ID","access_token":"SECRET"}}}

Abilitare CASE247_TERRITORIAL_LIVE=true solo dopo test di pubblicazione su
un account e verifica delle eventuali programmazioni Metricool preesistenti.
Il publisher non fa post se la variabile non è true o l'account non è
configurato in modo verificato. Non pubblicare le stesse inserzioni
contemporaneamente dal vecchio scheduler e dalla nuova Regia.

I post Meta già pubblicati non consentono sempre sostituzione diretta
delle immagini: correggere i piani futuri e segnalare le eccezioni.

Stati da tenere distinti: PROGETTATO, PIANIFICATO, PRONTO,
INVIATO, PUBBLICATO (con ricevuta verificabile).
