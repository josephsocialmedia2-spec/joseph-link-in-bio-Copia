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

## Inventario pubblico 4 comuni (controllo aggiuntivo)

Un secondo workflow **CASE247 · Inventario pubblico mercato 4 comuni** è programmato ogni giorno alle **05:10 Europe/Rome**. Con accesso consentito da `robots.txt`, legge soltanto le pagine indice pubbliche di CasaDaPrivato e Immobiliare.it nei quattro comuni autorizzati, senza account, CAPTCHA o estrazione di contatti personali. Salva un JSON e un report Markdown come artifact `case247-market-inventory`.

Il Radar delle 06:00 tenta di recuperare l'ultimo artifact di inventario (non più vecchio di 48 ore) e lo aggiunge alla **stessa unica GitHub Issue giornaliera**. Il nuovo workflow **non invia alcuna Issue**. Se un portale blocca accesso o robots non è verificabile, quel dato rimane `NON_DISPONIBILE`, mai zero annunci.

**Limiti:** il controllo legge le prime pagine dei portali autorizzati e non garantisce l'estrazione di tutte le inserzioni. I filtri `da-privati` di Immobiliare.it possono mostrare anche agenzie, perciò questi link sono etichettati `DA_VERIFICARE`. Lo stesso immobile potrebbe essere presente su più portali. Non confondere il numero degli annunci con il numero dei proprietari disponibili per l'acquisizione.

**Divieto commerciale:** CasaDaPrivato vieta esplicitamente le proposte di intermediazione o servizi immobiliari agli inserzionisti tramite il sito senza autorizzazione. Il catalogo serve per analisi di mercato, non autorizza telefonate, messaggi o contatti commerciali.

## Pipeline multi-sorgente 05:10 → unico messaggio 06:00 (aggiornamento)

Il workflow `.github/workflows/case247-market-inventory.yml` ora usa **due job paralleli** (matrix `portals` e `sitemaps`), più un job **consolidate**. Ogni fonte salva il proprio artifact JSON; il consolidatore scarica gli artifact disponibili, accorpa solo URL canonici identici, segnala separatamente i possibili duplicati con pari comune/prezzo/mq, e produce:

- `CASE247_Immobili_4_Comuni_YYYY-MM-DD.xlsx` (fogli `Annunci`, `Fonti`, `Riepilogo`)
- `inventory.csv` (UTF-8; separatore ;)
- `inventory.json` e `market.md` per il riepilogo unico delle 06:00.

Il file Excel è disponibile nell'artifact `case247-market-inventory` della relativa esecuzione. **Non viene inviata alcuna notifica aggiuntiva** alle 05:10. L'unica GitHub Issue quotidiana continua a essere preparata dal Radar alle 06:00; il foglio Excel resta un file scaricabile dal workflow, non un allegato alla notifica GitHub.

### Sitemap pubbliche

`scripts/case247_sitemap_sources.py` legge le fonti in `config/case247-sitemaps.json`. Il file ora abilita il rilevamento **solo delle sitemap realmente dichiarate nei rispettivi `robots.txt`** di CasaDaPrivato e Immobiliare.it (`discover_from_robots: true`); l'accesso a ciascuna sitemap e a ciascun URL elencato viene comunque verificato contro le regole del sito. Nessun URL sitemap viene inventato. Se robots non è accessibile o le sitemap non vengono pubblicate, il collector registra lo stato di blocco senza inventare risultati. Ogni fonte richiede `name`, `host`, `sitemap_url` HTTPS dello stesso host. Il parser supporta `sitemapindex`, `urlset` e gzip, con limiti di profondità, numero file e numero URL. Se robots non è verificabile, **non esegue la raccolta**. Le sitemap che contengono identificatori opachi, senza riferimento inequivocabile al comune nell'URL, non vengono attribuite a un comune arbitrario.

Non vengono attivati `curl_cffi`, TLS impersonation, proxy residenziali né servizi di bypass anti-bot: un IP differente non crea un'autorizzazione a prelevare dati da un portale. L'accesso a Immobiliare.it resta **non disponibile nei runner GitHub** fino a un canale dati consentito.

### Regole di deduplicazione e contatti

- **Unione automatica:** solo URL canonici identici.
- **Comune + prezzo + mq:** segnale `Possibile duplicato`; le schede restano distinte per revisione.
- **Contattabilità:** mai positiva automaticamente. `No agenzie` indica una limitazione, non un consenso per proposte commerciali. CasaDaPrivato resta etichettato `NO PROPOSTE COMMERCIALI`.
- Gli annunci dai portali e dalle sitemap sono **schede di mercato**; la qualificazione del proprietario richiede verifica diretta lecita della fonte.

**Copertura reale:** la pipeline aumenta il numero di fonti che si possono collegare, ma non equivale a 560 immobili acquisiti o verificati. I conteggi dichiarati dai portali comprendono anche agenzie e annunci duplicati; i report mostrano sempre lo stato delle fonti e il numero effettivo dei link recuperati.

**Filtro indispensabile sitemap:** un URL che contiene il nome del comune ma conduce a una pagina categoria (es. vendita-negozi/avigliana) NON è una scheda immobiliare. Dal 16/11/2026 il parser accetta soltanto percorsi riconoscibili come singoli annunci con identificativo, prima di attribuire il comune. Le sitemap con pagine categoria non aumentano il conteggio degli immobili. La prima discovery aveva prodotto 11 falsi candidati di categoria, ora corretti.


## Siti di agenzie locali e aste (16 novembre 2026)

Aggiunti al monitoraggio sitemap in modalità **robots-only e fail-closed** tre domini effettivamente esistenti, individuati sui loro siti ufficiali:

- Teck Immobiliare — `teckimmobiliare.it`; schede individuali osservate in `/properties/<tipo>/<comune>/<slug>/`, senza ID finale.
- CasaMia Immobiliare — `www.casamiaimmobiliare.org`; dominio verificato ma schema delle singole schede e presenza di sitemap da verificare.
- Immobiliare La Sacra — `lasacraimmobiliare.it`; schede osservate in `/products/<slug>`, con accettazione delle sole denominazioni immobiliari e località dei quattro comuni.

Queste fonti sono **annunci di agenzia, NON annunci di proprietario privato**. Sono contrassegnate `AGENZIA - NON PRIVATO` in un campo separato nell'Excel, che conserva i tre fogli Annunci/Fonti/Riepilogo. Gli URL senza località certa o che rappresentano categorie restano esclusi. L'esistenza del sito non garantisce sitemap accessibili sul runner GitHub: fanno fede solo il conteggio e i messaggi dell'ultima esecuzione.

**Aste:** nel foglio Fonti è incluso il Portale delle Vendite Pubbliche ufficiale `https://pvp.giustizia.it/pvp/` con stato `SOLO_CONSULTAZIONE`. Non esiste in questa pipeline un feed automatizzato PVP verificato, quindi nessun lotto viene conteggiato come annuncio ordinario né come vendita privata. Se verrà messa a disposizione una fonte PVP accessibile e autorizzata, richiederà parser e classificazione distinti.

Il criterio generico `/<annuncio>/...<ID>` rimane prudente; non viene imposto a domini reali che usano slug descrittivi senza numero (per i quali esistono regole specifiche). L'inventario è un'analisi del mercato pubblico, non un elenco di proprietari contattabili.

**Orari:** la raccolta resta alle **05:10 Europe/Rome**, il messaggio unico alle **06:00 Europe/Rome**. Anche con 50 minuti di margine GitHub Actions non garantisce esecuzione o notifica puntuale; uno spostamento alle 04:45 resta opzionale e non è stato fatto senza necessità comprovata.

**Filtro vendite del 16/11/2026:** durante la prima acquisizione reale di sitemap d'agenzia sono emerse URL di locazione esplicita e schede descritte «ai confini di Avigliana». Il parser ora scarta le URL che dichiarano affitto/locazione e rifiuta località usate soltanto come prossimità (es. ai confini di, vicino a, a pochi minuti da). Queste esclusioni sono conservative e possono lasciare fuori casi dubbi: nessun URL ambiguo viene presentato come vendita certa nel comune richiesto.


## Resilienza alle interruzioni delle fonti pubbliche

Se una fonte prima funzionante risulta temporaneamente `ROBOTS_NON_VERIFICABILE` oppure `FONTE_NON_DISPONIBILE`, il job di consolidamento cerca negli ultimi otto artifact di mercato fino a **72 ore** precedenti. Riutilizza soltanto link già censiti in una scansione in cui quella fonte aveva stato `OK`. Questi URL restano **archivio da riverificare**, non nuovi annunci correnti. Colonna `Stato rilevazione` del foglio `Annunci`: `SCANSIONE CORRENTE` oppure `ARCHIVIO 72H`; il testo segnala `DA RIVERIFICARE`. Il report markdown distingue lo stesso stato.

Non si riutilizzano link quando il sito nega esplicitamente il permesso di lettura mediante robots.txt. I collegamenti più vecchi di 72 ore vengono rimossi dalla cache del riepilogo, senza scambiare la loro assenza per una vendita conclusa. L'ultimo controllo live può quindi avere meno link correnti del totale che include quelli storici: i due valori non vanno confusi.

La raccolta delle 05:10 e l'unico riepilogo delle 06:00 restano invariati.


## Incrocio CASE247 con idealista/tools — export autorizzato (16/11/2026)

**Modalità verificata:** `idealista/tools` documenta il servizio `Acquisizione > Evoluzione dei privati` con esportazione dei dati filtrati in **Excel**. `Acquisizione su mappa` mostra anche link dello stesso immobile su altri portali e agenzie; non è però garantito che le relative colonne siano presenti in ogni export Excel o in tutti gli abbonamenti. Non è stata verificata alcuna API pubblica per leggere direttamente l'account: CASE247 utilizza esclusivamente file XLSX/CSV forniti dall'utente con diritto di accesso.

Riferimenti ufficiali:
- https://www.idealista.com/tools/centrodeayuda/it/articulos/evoluzione-dei-privati/
- https://www.idealista.it/tools/centrodeayuda/it/articulos/acquisizione-su-mappa/

### Procedura tecnica — niente password o scraping

1. Con un account professionale e accesso a `idealista/tools`, nel menu `Acquisizione > Evoluzione dei privati` filtra **vendita** e una zona autorizzata: Avigliana, Sant'Ambrogio di Torino, Almese, Condove. Esporta in Excel solo i dati cui hai diritto di accesso.
2. Salva l'originale fuori dal repository, ad esempio `private-exports/idealista_tools_personale.xlsx`, e **non** caricarlo su GitHub. La CLI supporta anche CSV con intestazioni `Comune` e `Link annuncio` (obbligatorie); `Altri portali`, `Titolo`, `Indirizzo`, `Prezzo`, `Mq`, `Telefono`, `Operazione` sono opzionali. Se i titoli di colonna effettivi differiscono, va adattata la mappatura, non inventati valori.
3. Scarica da GitHub Actions gli artifact di **fonti** dell'inventario corrente (i JSON dei job `case247-part-portals` e `case247-part-sitemaps`) e decomprimili in cartelle sotto `_market_parts/`. Se questi file mancano, l'elaborazione importerà solo l'export idealista, **non** farà alcun confronto con il Radar.
4. Esegui in un ambiente locale o riservato, senza trasmettere gli export originali al repository:

```bash
python scripts/case247_market_consolidate.py --inputs-dir _market_parts --idealista-export "private-exports/idealista_tools_personale.xlsx" --authorized-export --out _market
```

L'output `_market/CASE247_Immobili_4_Comuni_YYYY-MM-DD.xlsx` conserva i tre fogli `Annunci`, `Fonti`, `Riepilogo`. In `Annunci` compaiono `Altri link associati`, `Incrocio con altra fonte` e `Telefono nel report`. Vengono considerate corrispondenze da revisione i link esplicitamente associati allo stesso annuncio nell'export, se trovati anche nel Radar. Per prezzo+mq+comune non avvengono fusioni automatiche. Gli URL delle agenzie e dei privati rimangono verificabili singolarmente.

### Telefono: protezione dei recapiti

L'importer `scripts/case247_idealista_export.py` accetta solo export forniti con l'opzione `--authorized-export`. **Non esporta numeri di telefono, indirizzi email personali o nominativi** nei report CASE247 o negli artifact GitHub. Il campo `Telefono nel report` indica soltanto `PRESENTE_NEL_FILE_DA_VERIFICARE` o `NON_RILEVATO`: non significa che il numero sia pubblicamente visibile, né che sia lecito inviare offerte commerciali. L'eventuale gestione dei contatti e delle basi giuridiche va mantenuta in un CRM privato conforme alle autorizzazioni disponibili. Se non c'è un recapito pubblicamente reso disponibile, CASE247 non tenta di estrarre numeri nascosti.

### Automazione

La scansione **05:10** dei siti pubblici e il **solo riepilogo alle 06:00** rimangono attivi e indipendenti dall'export. L'**import idealista non è collegato automaticamente** alla scansione, poiché non è stato fornito né verificato un accesso autorizzato al servizio o un canale di esportazione automatico. Non si accedono a contenuti riservati tramite bypass. La CI verifica il parser dei file ed eventuali incroci con dati sintetici, non l'account professionale dell'utente.


## Filtro semantico, identità inserzionista e storico (16/11/2026)

**Verifica individuale:** `scripts/case247_market_semantics.py` esamina soltanto un numero limitato di pagine HTML delle agenzie pubbliche in allowlist (massimo sei per dominio ed esecuzione, secondo `robots.txt`). Non tenta di recuperare recapiti, non effettua login e non aggira firewall; una richiesta rifiutata lascia l'annuncio `Comune_Da_Verificare` / `Contratto_Da_Verificare`.

- `is_vendita`: legge `title`, `h1`, breadcrumb, prezzi `offers.price` JSON-LD. `affitto`, `locazione`, `canone mensile` e `transitorio` producono `Escluso_Affitto`. Un prezzo strutturato **inferiore a 15.000 €** è `Prezzo_Da_Verificare`, non un immobile automaticamente da scartare: esistono vere vendite a prezzi bassi.
- `valida_comune`: prioritizza `addressLocality` JSON-LD della **proprietà** (mai la sede dell'agenzia), quindi campi esplicitamente etichettati e breadcrumb. Il testo descrittivo “a cinque minuti da” non qualifica il comune. Il comune deve corrispondere a uno dei quattro target; `Fuori_Perimetro` e `Comune_Da_Verificare` non entrano nei **conteggi verificati**, anche se rimangono nell'archivio per revisione.
- `Natura_Inserzionista`: `Agenzia_Verificata`, `Privato_Dichiarato`, `Da_Verificare`. Le aste PVP rimangono esclusivamente nel foglio `Fonti` come riferimento distinto. `Stato_Contatto_Commerciale`: divieto esplicito ha precedenza su qualsiasi numero visibile; una classificazione “con recapito” non autorizza mai telefonate o marketing.
- `Micro_Zona_Indirizzo`: solamente via dai metadati oppure microzona riconoscibile nel titolo/sottotitolo. Non deduce la residenza del venditore o l'indirizzo privato.
- `Data_Prima_Rilevazione`, `Data_Ultima_Verifica`, `Giorni_Sul_Mercato`, `Priorita_Monitoraggio`: file `lifecycle.json` negli artifact del Radar, recuperato dalle esecuzioni precedenti; la prima data non viene aggiornata al secondo rilevamento. La data di verifica si aggiorna solo con dettaglio HTML raggiunto e verifica semantica di vendita/comune riuscita. Il flag `Invenduto_Oltre_90gg` si accende solo da **90 giorni di osservazione CASE247** e con attività confermata nello stesso giorno (es. disponibilità esplicita JSON-LD). Non misura automaticamente da quanto l'inserzione fosse online prima del primo rilevamento.
- `Riepilogo`: conteggi **verificati** per comune/natura/fascia `< 30 gg`, `30-90 gg`, `> 90 gg`, separati dai link indicizzati ma non ancora confermati. Il giorno 90 rientra nella fascia 30-90, ma può ricevere priorità oltre 90 secondo la soglia richiesta `>=90`. La colonna `Possibile_Duplicato` è solo un avviso, non causa eliminazione.

Le nuove fonti candidate in `config/case247-sitemaps.json` includono **Immobiliare Valmessa** e **F.C. Immobiliare** (siti pubblici delle agenzie attive nell'area Almese/Condove). Solo sitemap ufficialmente esposte in `robots.txt` e accessibili diventano scansioni. Un sito senza sitemap accessibile non costituisce copertura acquisita. Nessun cambiamento alla pianificazione: 05:10 Europe/Rome, singolo riepilogo alle 06:00.
