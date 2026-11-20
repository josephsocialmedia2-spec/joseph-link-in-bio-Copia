# CASE247 — DIMOSTRA IL VALORE (pre-incarico)

## Perché esiste
Supporta Joseph Malafronte nella presentazione di un *servizio autonomo di marketing immobiliare* ad Avigliana prima della firma del contratto. Non è un servizio di mediazione né un portale dove inserire dati personali degli acquirenti o dei proprietari.

### Collegamenti
- Pagina: \`/gestione/dimostra-il-valore/\`
- Accesso in gestione: voce **Acquisizione → Dimostra il valore**, nella sezione Control Center.
- Funziona come pagina GitHub Pages statica. Non richiede server, API, token o autenticazione.

### Funzioni realizzate
1. Dossier demo compilabile: comune, microzona, tipologia, mq, stato, punti di forza, verifiche.
2. Anteprime annuncio, landing, campagna Meta, chiaramente etichettate come **DEMO**.
3. Timeline operativa di 14 giorni con ipotesi Open House e ruoli.
4. Ripartizione didattica € 5.000 (quote e ore **non** validate come costi reali).
5. Budget media opzionale, selezione IVA meramente illustrativa, totale ricalcolato.
6. Dashboard KPI **interamente fittizia**, con definizione delle fonti per dati futuri.
7. Matrice bisogno → servizio → prova → misurazione.
8. Presentazione interattiva in 12 passaggi, navigazione avanti/indietro.
9. Risposte a nove obiezioni, checklist, schema dei primi 3 casi studio.
10. Stampa PDF tramite browser, export JSON, salvataggio locale solo su richiesta, reset.

### Sicurezza e privacy
Il repository è pubblico. Per questo **non inserire** nomi, indirizzi precisi, mail, telefoni, dettagli proprietari, consensi, credenziali o CRM sul sito. Il salvataggio in \`localStorage\` è opzionale e confinato al browser, ma non costituisce un archivio protetto per dati personali. Nessun backend è presente; non ci sono invii automatizzati. In futuro, per dati reali, usare piattaforma autenticata con trattamento privacy documentato.

### Dati e prove
- I KPI visibili sono fittizi, non KPI di campagne reali.
- Avigliana Centro, appartamento 90 mq è un **esempio inventato**, non un annuncio vero.
- Il preventivo è una ripartizione commerciale **dimostrativa**, non un benchmark.
- OMI NON sostituisce una stima puntuale, e prezzi negli annunci NON sono prezzi di compravendita.
- La raccolta locale precedente (31 recensioni attribuite a Google da directory terze, 8 negative / 23 positive su 441 rating totali censiti) è **non rappresentativa**; non dichiarare difetti di agenzie sulla base del campione.
- Il metodo Team Rossi/Simone Rossi va citato soltanto nelle parti effettivamente documentate; la roadmap è un adattamento degli appunti CASE247.

### Separazione dei ruoli
Joseph propone attività di marketing pubblicitario. Attività di mediazione (negoziazione, visite ai fini della mediazione, proposte e relativo incasso/compenso) sono gestite da professionisti abilitati. Non confondere \`marketing\` e \`procacciamento immobiliare\`; prima di usare contratti commerciali richiedere verifica legale della fattispecie e delle clausole.

### Checklist QA prima del merge
- [x] HTML/JavaScript analizzato sintatticamente; tutti gli ID diretti presenti, nessun ID duplicato.
- [x] Composizione voci prezzo: 700+600+850+750+850+1250 = 5.000.
- [x] Link dal Control Center aggiunto al ramo dedicato.
- [x] Indicatori e contenuti fittizi chiaramente segnalati.
- [ ] Test end-to-end su GitHub Pages **dopo** merge/deploy.
- [ ] Collegamento ad Ads, CRM e Analytics **non** previsto in questa demo.
- [ ] Revisione legale/fiscale dell'offerta 5.000 € e delle clausole prima di proporla a clienti reali.
- [ ] Reperimento di OMI specifico e comparabili reali per ogni immobile, prima del dossier definitivo.

### Fonti pubbliche di riferimento
- Agenzia delle Entrate OMI: https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm
- Guida alle quotazioni: https://telematici.agenziaentrate.gov.it/pdf/guidaFornitureOMI.pdf
- Video di Simone Rossi sul Team Open House: https://www.youtube.com/watch?v=oYgOsBbqqsk
- Camera di Commercio Vicenza, procacciamento settore immobiliare: https://www.vi.camcom.it/it/aprire-un-attivita/attivita-con-requisiti/procacciatore-d-affari-info-su-attivita-libera-occasionale/

**Stato:** prototipo funzionale pre-incarico / dati dimostrativi; non pubblicato su main fino al merge della PR.
