# CASE247 · Regia territoriale 10 km · Manuale operativo

## Scopo e fonte unica
Il codice di produzione resta nel repository già esistente, senza creare un nuovo sistema parallelo.
La distanza massima verificabile è **10 km** fra il centro del comune di pubblicazione e tutti gli
angoli della bounding box OSM del comune dell'immobile (criterio conservativo, non distanza stradale).
Configurazioni: `config/case247-territorio.json` con `coverage_radius_km=10` e tutti i
`social_onboarding.radius_km=10`; il motore rifiuta configurazioni divergenti.
Il piano include gli immobili La Sacra con disponibilità esplicita, fotografia utilizzabile
e comune verificato dalla fonte. Non sostituire la verifica della fonte con inferenze dal titolo.

## Sequenza automatica
1. Alle **06:00 Europe/Rome** il workflow `case247-territorial-regia.yml` aggiorna il
   catalogo, le bozze e genera il piano del giorno in `plans/YYYY-MM-DD.json`.
2. Alle **18:00 Europe/Rome** aggiorna nuovamente il catalogo, corregge soltanto gli
   slot futuri di oggi e prepara la rotazione del giorno successivo.
3. Un aggiornamento del codice rilevante su `main` genera il piano coerente con l'ora
   locale: oggi prima delle 18:00, domani dalle 18:00 in poi.
4. Ogni 15 minuti il workflow di invio controlla soltanto un piano **di oggi**, la
   distanza effettiva ricalcolata, la disponibilità corrente, la coda legacy congelata,
   le credenziali dei canali territoriali e il registro di invio.
5. Ogni immobile può essere assegnato **una sola volta al giorno nella rete**, non una
   volta per ciascun social. Le grafiche di ricostruzione IA sono dichiarate tali.
6. La dashboard `/gestione/regia-territoriale/` mostra solo il piano con data di oggi;
   il valore «pronto» non equivale a una ricevuta di pubblicazione.

## Avvio e test (Python 3.12)
Dalla radice del repository:

```bash
python -m unittest discover -s scripts -p test_case247_territorial_engine.py -v
python -m unittest discover -s scripts -p test_case247_territorial_publisher_policy.py -v
python -m unittest discover -s scripts -p test_case247_legacy_transition.py -v
python scripts/sync_sacra_catalog.py
python scripts/build_territorial_drafts.py
python scripts/case247_territorial_engine.py --day 2026-11-13
python scripts/case247_territorial_publisher.py --max-per-run 10
```

L'ultimo comando è una simulazione: senza `--live` non esegue invii.
Se la fonte catalogo non è aggiornata da meno di 36 ore, la pianificazione si blocca.
Il parametro `--day` è solo per rigenerazione specifica; senza parametro si applica
automaticamente oggi prima delle 18:00 e domani dopo le 18:00.

## Attivazione Meta
Il publisher reale è possibile solo quando TUTTE le seguenti condizioni sono vere:
- Identità verificata e autorizzata attraverso Meta per il singolo canale FB/IG;
- `town.channels[network].status=ACTIVE_VERIFIED`, URL, provider ID corretti,
  `town.auto_publish=true` e credenziale corrispondente in secret GitHub;
- variabile Actions `CASE247_TERRITORIAL_LIVE=true`;
- piano contemporaneo con `max_distance_km=10`, verifica geografica ricalcolata
  e nessuna prenotazione legacy sullo stesso immobile e nello stesso giorno;
- niente post con dati/immagini/condizioni commerciali non confermati.

Il secret Actions `CASE247_TERRITORIAL_ACCOUNTS_JSON` contiene la mappa per comune/canale
con `page_id` / `ig_user_id` e `access_token`. Non inserirlo nei file versionati.
La pubblicazione è volontariamente **fail-closed**: la sola modifica del raggio non abilita
account né consensi. Le 41 coppie social sono predisposte, non dichiarate attive.
Il registro immutabile salva `INTENT` prima della chiamata a Meta e non ritenta
automaticamente gli esiti incerti.

## Acquisizione contatti · regole vincolanti
Il percorso ammesso è **pubblicazione pubblica → landing locale → richiesta spontanea**.
Non costruire liste nominative da Google, portali o profili social per invii promozionali
automatici. Non avviare email, WhatsApp, SMS o DM commerciali senza titolo giuridico
appropriato, base documentata, informativa e opt-out gestito.
Il modulo di ingresso `case247-public-requests` resta chiuso finché il rilascio legale
dell'informativa, i controlli anti-bot e le condizioni di protezione non sono verificati.
I consensi di marketing via email e WhatsApp sono separati e non preselezionati.
La revoca deve sopprimere gli invii futuri sul canale interessato. I dati personali dei
lead non vanno in `catalogo.json`, nella dashboard GitHub Pages, nei commit o nei log.
Nel CRM conservare solo i dati necessari, con finalità, origine, data, versione
dell'informativa, prova di consenso per canale, durata di conservazione e tracciamento
delle richieste di cancellazione; applicare privilegi minimi, RLS e retention per ruolo.

Il progetto non sostituisce una verifica legale del titolare: la pubblicazione di annunci
pubblici autorizzati e il marketing diretto ai singoli destinatari sono operazioni diverse.

## Diagnostica e anomalie
- Nessun `plans/YYYY-MM-DD.json`: il piano di oggi manca; non attribuire attività passate
  a oggi. Controllare esito di sincronizzazione catalogo e workflow mattutino.
- `ready_for_provider=0`: piani teorici senza canali verificati; non inviare.
- `BLOCKED_10KM_GEOGRAPHY`: source town, bounding box o raggio non corrispondono
  più al piano; non correggere forzando il limite.
- `BLOCKED_LEGACY_CENTRAL_RESERVED`: stessa inserzione già prevista da Metricool;
  non duplicarla.
- `UNCONFIRMED_NO_RETRY`: esito remoto non certo; verificare direttamente in Meta
  prima di qualsiasi nuova richiesta.
- `CASE247_TERRITORIAL_LIVE` assente: solo produzione di piani, nessuna pubblicazione.
