# CASE247 · Radar acquisizione immobiliare CLOUD

Il radar gira **nei runner GitHub Actions**, senza dipendere da Windows, Python locale o dalla dashboard Flask. È una componente distinta dall'Osservatorio `acquisizione/modello.html`: non modifica il CRM attuale e non importa automaticamente contatti personali.

## Che cosa fa davvero

- Ogni ora, anche a PC spento, esegue una ricerca per ciascuno dei **soli quattro comuni autorizzati**: **Avigliana, Sant'Ambrogio di Torino, Almese e Condove**, più una ricerca stradale rotante interna a questi comuni. I comuni esterni non sono cercati né ammessi nei risultati.
- Interroga il feed di ricerca **Bing RSS** (endpoint non contrattualmente garantito) e, se configurati, i feed **Google Alerts RSS** generati dal titolare. **Non interroga in automatico Google Search né simula un browser Google**. Google Custom Search JSON API non è disponibile per nuovi clienti.
- Legge titolo, snippet e link mostrati dall'indice; classifica **PROBABILE_PRIVATO** solo quando il testo dichiara esplicitamente l'origine privata; le altre schede restano `DA_VERIFICARE`.
- Conserva impronte SHA-256 degli URL visti e l'eventuale prezzo pubblicato; la prima esecuzione è una **baseline senza avvisi**. Avvisa su URL nuovi e riduzioni di prezzo indicative, senza attestare una compravendita.
- Le scansioni di ogni ora sono **silenziose**: i nuovi annunci e i ribassi indicativi vengono conservati nello stato del workflow. Alle **06:00 Europe/Rome** viene creata **una sola GitHub Issue giornaliera** assegnata al titolare, con **tutti i nuovi risultati pertinenti dall'ultimo riepilogo**, inclusi quelli DA_VERIFICARE chiaramente etichettati. Se non sono emerse novità, la Issue lo comunica (non afferma che non esistano immobili). Nessuna Issue viene creata durante le scansioni orarie. L'invio è idempotente per data, anche in caso di riesecuzione.
- Per ricevere l'avviso su smartphone, abilitare le notifiche GitHub delle Issues assegnate. L'orario è quello **programmato**, non una garanzia di notifica esatta al secondo: GitHub può ritardare i workflow schedule.
- Può interrogare in modo limitato OpenStreetMap/Overpass per elencare **attività commerciali sulla medesima via**; non è una misura della distanza, né un'associazione all'identità del proprietario.

## Opportunità aggiuntive per l'acquisizione (ore 06:00)

Il riepilogo giornaliero ora raccoglie anche due gruppi di segnali, **senza creare notifiche aggiuntive**. La raccolta di queste due fonti avviene nella scansione silenziosa delle **05:17 Europe/Rome**; il digest delle 06:00 usa il cache del giorno per non attendere la rete. Se il controllo mattutino manca o è vecchio, il report lo dichiara: non riutilizza notizie e contatti come se fossero aggiornati.

1. **Notizie territoriali** relative a edilizia, urbanistica, cantieri, immobiliare, case, proprietà e affitti. Fonte: ricerche RSS Google News limitate ai quattro comuni e a notizie pubblicate nelle ultime 72 ore, con titolo e link verificabile. Non equivale a un accesso completo a Google Search e la copertura può essere incompleta.
2. **Contatti B2B pubblici** di aziende e professionisti presenti in OpenStreetMap (uffici immobiliari, studi, imprese edili, artigiani). Fonte: OpenStreetMap/Overpass (© OpenStreetMap contributors, licenza ODbL); vengono riportati solo i recapiti chiaramente pubblicati nella scheda aziendale, privilegiando caselle generiche e numeri fissi, mai contatti personali ricavati per incrocio di vie. Per ogni attività è incluso il link alla scheda originaria.

Il motore mantiene due registri di ID già segnalati, così una notizia o un'azienda invariata non viene ripetuta nei giorni successivi. L'identificazione di un'attività sulla stessa strada di un immobile **non dimostra né suggerisce** che l'attività sia il proprietario: rimane un'opportunità B2B indipendente.

Questi dati sono **segnali per una verifica commerciale** e non autorizzano a telefonare o inviare email promozionali. Prima di contattare chiunque occorre verificare base giuridica, consenso quando necessario, Registro Pubblico delle Opposizioni e richieste di non contatto; non è attivo alcun invio automatico.

Le fonti esterne sono best-effort, possono risultare indisponibili o non esaustive; in tal caso il digest segnala gli errori e continua a mostrare gli immobili eventualmente acquisiti.

## Impostazione Google Alerts (necessaria per includere Google)

1. Apri https://www.google.com/alerts e accedi al tuo account Google.
2. Crea un avviso per ogni ricerca significativa, per esempio `"Avigliana" "da privato" "vendesi"`, `"Almese" "privato vende" casa`, `"Condove" "no agenzie"`, e per le vie specifiche `"Avigliana" "Via Roma" "vendesi"`.
3. In **Mostra opzioni > Invia a** scegli **Feed RSS**, apri l'RSS e copia l'indirizzo del feed `https://www.google.com/alerts/feeds/...`.
4. Nel repository **Settings > Secrets and variables > Actions**, crea il secret **CASE247_GOOGLE_ALERTS_RSS_URLS** e incolla gli URL degli RSS, uno per riga.
5. Avvia manualmente il workflow `CASE247 · Radar acquisizione cloud` da **Actions > Run workflow**. Senza feed Google configurati, il radar utilizzerà soltanto Bing RSS.

Non inserire gli URL privati di Google Alerts nei file JSON del repository pubblico.

## Esecuzione e risultati

- Workflow: `.github/workflows/case247-acquisition-radar.yml`.
- Ricerca: `scripts/case247_acquisition_radar.py`.
- Configurazione: `config/case247-acquisition-radar.json`.
- Test: `scripts/test_case247_acquisition_radar.py`, `scripts/test_case247_acquisition_digest.py`.
- Riepilogo giornaliero: `scripts/case247_acquisition_digest.py` (accumulate/digest/finalize).
- Notizie e recapiti aziendali pubblici: `scripts/case247_acquisition_intelligence.py` e test `scripts/test_case247_acquisition_intelligence.py`.
- Stato: artifact **case247-acquisition-state**, hash degli URL e batch di segnalazioni pubbliche in attesa del riepilogo (retention 14 giorni). È scaricato dalla scansione successiva; se non disponibile viene costruita una nuova baseline e non è possibile ricostruire eventuali segnalazioni pregresse.
- Report: artifact **case247-acquisition-report**, link pubblici e classificazione, senza recapiti personali.

GitHub Actions non fornisce monitoraggio in tempo reale: gli orari pianificati possono essere posticipati o saltati per congestione del servizio. Le scansioni rimangono ogni ora 24/7, ma i messaggi sui nuovi immobili partono soltanto dal digest programmato alle **06:00 ora italiana**, una volta al giorno. Le altre notifiche GitHub del repository (review di PR, errori CI, altre issue) non sono gestite da questo radar.

## Sicurezza e attendibilità

- Gli snippet dei motori di ricerca **non certificano** proprietario, unicità, indirizzo preciso, disponibilità dell'immobile o fonte originaria; prima di qualsiasi contatto verificare direttamente l'annuncio e la sua data.
- Le segnalazioni "attività sulla stessa via" sono lead commerciali separati, **mai recapiti attribuiti al venditore**.
- Non vengono eseguite ricerche inverse di proprietari tramite numero civico, né crawling di database privati, CAPTCHA, account protetti o pagine personali.
- Email e numeri rilevati negli snippet vengono sostituiti da indicatori nel report pubblico; i recapiti pubblici eventualmente presenti devono essere consultati sulla fonte originaria e gestiti in un CRM protetto, nel rispetto del GDPR e dei registri di opposizione.
- Un workflow che indica `FONTI_NON_DISPONIBILI` **non significa zero annunci nuovi**: significa che le fonti configurate non erano accessibili. Per un servizio affidabile servono più fonti autorizzate e monitoraggio degli errori.
- **Non è attiva alcuna sincronizzazione Supabase/Excel/CRM**: richiede una successiva integrazione con endpoint autenticato e controlli di consenso.

## Primo controllo

Dopo l'unione del ramo con `main`, vai nella pagina **Actions**, apri **CASE247 · Radar acquisizione cloud** e verifica che i job `qa` e `cloud-scan` siano entrambi verdi. La prima scansione senza errori deve salvare `case247-acquisition-state` e `case247-acquisition-report`.

Per aggiornare le vie puoi modificare il file di configurazione soltanto per i quattro comuni consentiti. Il software rifiuta configurazioni che includono altri comuni. La dicitura «Via Susa» di Avigliana è una strada, non estende la ricerca al comune di Susa. Per incrementare la copertura Google, configura altri Google Alerts RSS: Google Search non è raccolto direttamente.

Link diretti:
- [Workflow](https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/workflows/case247-acquisition-radar.yml)
- [Avvisi GitHub Issues](https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/issues)
