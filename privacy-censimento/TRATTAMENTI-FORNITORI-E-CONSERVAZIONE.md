# REAL MEDIA PRO — Inventario fornitori, trattamenti e politica di conservazione
**Versione:** 27 ottobre 2026 · **Titolare attività dirette:** Joseph Malafronte, persona fisica, REAL MEDIA PRO / Joseph Digital Strategist.
**Stato:** inventario tecnico verificato parzialmente; politica di conservazione PROPOSTA, da adottare e verificare sui dispositivi/sistemi effettivamente usati. NON costituisce parere o attestazione di conformità.

## A. Mappa documentata dei trattamenti
| Attività | Dati | Finalità | Base da validare | Dove transitano | Stato / azione |
|---|---|---|---|---|---|
| Visita sito statico | IP, dati tecnici di accesso | Sicurezza e consegna pagine | Policy del provider, relazione con titolare da verificare | GitHub Pages | Confermata raccolta IP da documentazione GitHub |
| Modulo valutazione | Nome, Comune, tipologia e altri campi facoltativi | Comporre una richiesta nel browser | Gestione della richiesta dell'interessato, base esatta da verificare sul servizio | Browser visitatore → solo se inviato → WhatsApp | Nessun archivio dei campi sul repository GitHub Pages |
| Modulo seconda casa | Nome, recapito, Comune | Preparare un messaggio volontario WhatsApp | Gestione richiesta spontanea, verifica finalità | Browser → WhatsApp se confermato | Nessun consenso pubblicitario associato |
| Conversazione WhatsApp | Numero, testo, immagine e metadati | Rispondere alla richiesta specifica | Art. 6(1)(b) per misure precontrattuali richieste ove pertinente; da finalizzare | WhatsApp e dispositivo/account del titolare | ATTIVA solo risposta a richiesta; vietato riuso promozionale non autorizzato |
| Guida PDF | Dati tecnici di visita/download su hosting | Distribuzione guida gratuita | Dati tecnici secondo fornitore; verificare configurazione | GitHub Pages | Download libero, senza obbligo di fornire nome |
| Email di risposta | Email e testo ricevuto | Gestire domanda inviata volontariamente | Gestione richiesta | Casella agenziarealmediapro@gmail.com (servizio Google Gmail da verificare configurazione e impostazioni effettive) | Non corrisponde a iscrizione newsletter |
| Marketing WhatsApp/email | Recapito, prova consenso, categoria/ canale | Promozioni future | Consenso valido, specifico, dimostrabile (GDPR + art. 130 Codice privacy) | Da definire e validare | DISABILITATO, nessuna acquisizione dal sito |
| Eventuale inoltro a Immobiliare La Sacra | Solo contatti e dettagli autorizzati e necessari | Mediazione/valutazioni professionisti abilitati | Necessita verifica informativa, ruoli e base | Agenzia destinataria, solo se caso concreto lo giustifica | NON automatico dalla landing |
| Analisi annunci pubblici | Località, prezzi, tipologie; se presenti dati nominativi, dati personali | Mercato e censimento | Per dati identificativi, valutazione autonoma art. 6/14 e minimizzazione | Database/CRM da verificare | Non inferire liceità solo da pubblico annuncio |

## B. Fornitori: ciò che sappiamo e ciò che non sappiamo
**GitHub, Inc. — GitHub Pages**
- **Confermato:** hosting statico del progetto; GitHub dichiara che gli IP dei visitatori Pages sono registrati per motivi di sicurezza; possono essere raccolti altri dati di servizio nelle sue condizioni.
- **Da verificare:** rapporto contrattuale e ruoli, eventuali trasferimenti extra-SEE e garanzie, conservazione dei log da parte del fornitore, permessi repo, eventuale dominio personalizzato.
- Fonti: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages ; https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement

**WhatsApp / WhatsApp Ireland / Meta — collegamenti WhatsApp**
- **Confermato:** il link `wa.me` apre WhatsApp e trasmette il testo quando l'utente decide di premere «Invia»; WhatsApp ha proprie policy e dati dei servizi per comunicazioni e funzioni Business.
- **Da verificare:** se il numero viene gestito tramite WhatsApp personale, Business App o Business Platform; backup, dispositivi collegati, personale con accesso, eventuali servizi terzi e trasferimenti/garanzie. **Non assumere** la Business Platform solo perché il sito apre WhatsApp.
- Fonti: https://www.whatsapp.com/legal/business-app-privacy-policy ; https://whatsappbusiness.com/it/policy/ ; https://www.whatsapp.com/legal/privacy-policy-eea

**Google — Gmail / indirizzo `@gmail.com`**
- **Confermato:** l'indirizzo di corrispondenza è `agenziarealmediapro@gmail.com`.
- **Da verificare:** client/servizio utilizzati per gestire messaggi, conservazione e cancellazione nella mailbox, archiviazione/backup, DPA e trasferimenti se applicabili.
- Fonte di accesso condizioni: https://policies.google.com/privacy?hl=it

**Immobiliare La Sacra — partner commerciale**
- Partner per mediazione riservata ai professionisti abilitati; nessuna trasmissione automatica di dati nel modulo statico.
- Il ruolo GDPR rispetto a ogni trattamento, eventuale ricezione su istruzione dell'interessato e accordi tra i soggetti devono essere definiti in una scheda separata **prima** dell'inoltro dei dati.

**Servizi da verificare prima di dichiararli operativi:** Meta Ads Pixel e Conversion API, Instagram/Facebook analytics, CRM, Google Forms, AgentPricing, strumenti email massivi, cloud, Drive, Shopify; non inserirli come responsabili effettivi di questa landing solo perché esistono nel progetto generale.

## C. Politica di conservazione da adottare — proposta operativa
Non esiste un unico limite di 24 mesi fissato dal GDPR per qualunque dato. Art. 5(1)(e) richiede limiti giustificati dalla finalità. **Le durate qui sotto sono scelte progettuali proposte, NON durate imposte dalla legge né cancellazioni già eseguite.**

| Categoria | Termine PROPOSTO | Evento iniziale | Procedura necessaria |
|---|---|---|---|
| Domande WhatsApp/email senza incarico e ormai chiuse | 12 mesi, salvo contenzioso o obbligo documentato | Chiusura della richiesta (oppure ultimo contatto sostanziale da registrare) | Revisione mensile e cancellazione di chat, esportazioni, allegati, duplicati e backup secondo possibilità tecniche |
| Richieste ancora aperte | Fino alla gestione, con riesame ogni 90 giorni | Data ultima risposta sostanziale | Chiudere o documentare motivo di prosecuzione |
| Lead di proprietari censiti non contattati | Nessuna archiviazione nominativa indiscriminata; trattamenti solo dopo analisi giuridica specifica | Non applicabile | Preferire dati aggregati, non recuperare e conservare automaticamente PII |
| Prova del consenso marketing, se e quando attivato | Riesame almeno ogni 12 mesi; proposta rinnovo ogni 24 mesi | Data dell'ultima adesione valida | Verificare prova, versione informativa, canale, categoria e revoca |
| Revoche/opposizioni | Registro minimo per evitare contatti successivi, sottoposto a revisione periodica e documentazione del motivo | Data opposizione | Bloccare invii immediatamente; conservare solo dati minimi indispensabili per soppressione |
| Obblighi fiscali, contratti e contenzioso | Termini applicabili alla singola fattispecie, da validare | Secondo obbligo/documento | Conservazione separata, accessi limitati; niente regola generale inventata |
| Log di GitHub Pages, dati gestiti da WhatsApp e altri provider | Secondo periodi e policy reali del fornitore, da verificare | Varie | Titolare non può promettere cancellazione di log non controllati |

**Passo operativo prima di dichiarare queste durate effettive nell'informativa:** introdurre una procedura sulla mailbox, sul dispositivo WhatsApp e sugli archivi di lavoro; verificare i backup, la cancellazione e le eccezioni; approvare per iscritto la durata e revisionarla annualmente.

## D. Registro di consenso e revoche: modalità zero API
- Strumento locale nel repository: `privacy-censimento/registro_privato.py` (solo codice, **mai PII sul repository**). Database privato su PC, fuori dalla cartella GitHub, protetto con account utente e cifratura del disco/dispositivo.
- La modalità `marketing_enabled=false` in `branding/conversion-cta.json` impedisce al registro di accettare nuove registrazioni di consenso marketing. Si possono invece registrare richieste e opposizioni per rispettare i diritti.
- È possibile produrre un report dei contatti che devono essere riesaminati per scadenza. Un report non equivale a cancellazione dalle conversazioni WhatsApp o da tutti i backup: attività manuale documentabile.
- Quando un opt-in sarà consentito: serve prova originaria effettivamente ricevuta e verificabile (es. export messaggio WhatsApp in archivio privato), data UTC, versione informativa, finalità e canale, eventuale revoca. Non associare automaticamente la compilazione del modulo a un «SÌ».
- Non caricare il database, l'export di chat o i recapiti in GitHub Pages, issues, Actions logs o conversazioni pubbliche.

## E. Checklist di validazione e approvazione finale
- [x] Titolare persona fisica Joseph Malafronte e recapito dichiarato.
- [x] Inventario tecnico dei fornitori GitHub Pages e link WhatsApp con relative fonti; Gmail presumibile, non riconciliato con configurazione reale.
- [x] Proposta di retention, prove e revoche preparata.
- [ ] Confermare il tipo di account WhatsApp e le sue impostazioni/backup.
- [ ] Verificare fornitori effettivi, contratti, ruoli e trasferimenti (anche Google/Meta/GitHub).
- [ ] Adottare e rendere operative le durate proposte, con riesame/cancellazione su tutti i dispositivi e cloud usati.
- [ ] Predisporre archivio privato sicuro e procedure di riscontro art. 15-22.
- [ ] Completare l'informativa artt. 13-14 con dettagli effettivi, eventuale schema per condivisione a professionisti abilitati.
- [ ] Validazione privacy qualificata e prova end-to-end; solo dopo attivare l'opt-in marketing.

## Fonti normative
- GDPR: https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679
- Garante, doveri e prova consenso: https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/8981258
- Garante, principi e retention: https://www.garanteprivacy.it/web/guest/home/principi-fondamentali-del-trattamento
- Garante, spam e marketing: https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/2542348
