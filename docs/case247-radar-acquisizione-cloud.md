# CASE247 · Radar acquisizione immobiliare CLOUD

Il radar gira **nei runner GitHub Actions**, senza dipendere da Windows, Python locale o dalla dashboard Flask. È una componente distinta dall'Osservatorio `acquisizione/modello.html`: non modifica il CRM attuale e non importa automaticamente contatti personali.

## Che cosa fa davvero

- Ogni ora, anche a PC spento, esegue una ricerca per ciascuno dei **soli quattro comuni autorizzati**: **Avigliana, Sant'Ambrogio di Torino, Almese e Condove**, più una ricerca stradale rotante interna a questi comuni. I comuni esterni non sono cercati né ammessi nei risultati.
- Interroga il feed di ricerca **Bing RSS** (endpoint non contrattualmente garantito) e, se configurati, i feed **Google Alerts RSS** generati dal titolare. **Non interroga in automatico Google Search né simula un browser Google**. Google Custom Search JSON API non è disponibile per nuovi clienti.
- Legge titolo, snippet e link mostrati dall'indice; classifica **PROBABILE_PRIVATO** solo quando il testo dichiara esplicitamente l'origine privata; le altre schede restano `DA_VERIFICARE`.
- Conserva impronte SHA-256 degli URL visti e l'eventuale prezzo pubblicato; la prima esecuzione è una **baseline senza avvisi**. Avvisa su URL nuovi e riduzioni di prezzo indicative, senza attestare una compravendita.
- In caso di segnali qualificati crea una **GitHub Issue assegnata al titolare del repository** con fonte, prezzo, città e collegamento. Per vedere le notifiche su smartphone, occorre abilitare le notifiche GitHub (Issues assigned) nell'app GitHub/mobile o sul sito.
- Può interrogare in modo limitato OpenStreetMap/Overpass per elencare **attività commerciali sulla medesima via**; non è una misura della distanza, né un'associazione all'identità del proprietario.

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
- Test: `scripts/test_case247_acquisition_radar.py`.
- Stato: artifact **case247-acquisition-state**, hash e valori numerici (retention 14 giorni). È scaricato dalla scansione successiva; se non disponibile viene costruita una nuova baseline.
- Report: artifact **case247-acquisition-report**, link pubblici e classificazione, senza recapiti personali.

GitHub Actions non fornisce monitoraggio in tempo reale: gli orari pianificati possono essere posticipati o saltati per congestione del servizio. L'intervallo configurato è di **un'ora**, 24/7.

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
