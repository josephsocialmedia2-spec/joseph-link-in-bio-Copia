# REPORT AUDIT GDPR — ESITO PRELIMINARE (24/10/2026)

**Scopo:** audit statico del codice HTML sul ramo main del repository `josephsocialmedia2-spec/joseph-link-in-bio-Copia` (34 file); censimento tecnico sommario dei 5 repository collegati (94 HTML ulteriori). **Non è un giudizio di conformità o un parere legale.**

## Numeri verificati
- 34 file HTML nel repository principale: 12 immobiliari, 18 commerciali, homepage, portale campagne, pagina privacy, pagina gestionale.
- 30/30 pagine specialistiche senza link esplicito nel codice HTML a una informativa privacy; tutte e 30 contengono link a WhatsApp, telefono ed email. In queste 30 pagine non sono stati identificati tag `form`, `input`, `script` o `iframe` o pattern tipici dei pixel pubblicitari nel sorgente esaminato.
- Homepage e portale campagne senza hyperlink HTML esplicito a informativa; homepage con script inline e risorse esterne (Google Fonts, Unsplash). Verificare i caricamenti effettivi e la privacy dei provider.
- Pagina `gestione/index.html`: 3 campi `input`, 2 `textarea`, `localStorage` e due chiamate `fetch()` verso GitHub API e pagine. Il testo stesso avvisa che la dashboard statica non è protetta da password e invita a non memorizzare credenziali o dati personali. Non costituisce da sé prova di violazione, ma merita controllo di accesso e gestione del rischio.
- Pagina privacy: chiaramente indicata come versione preliminare, con titolarità, trattamenti, conservazioni e destinatari ancora da verificare.
- Su tutto l'account: **128 file HTML** rilevati (34 + 88 + 1 + 2 + 1 + 2); lo stato di pubblicazione degli altri repository e il comportamento runtime non sono verificati.

## Criticità / rischi e interventi

| ID | Priorità | Riscontro verificato / fatto da verificare | Azione e responsabilità | Stato |
|---|---|---|---|---|
| G01 | ALTA | Mancanza di link esplicito a informativa in 30 landing specialistiche e due pagine di servizio | Preparare informative appropriate per trattamenti effettivi, validarle, inserire link contestuali e testare visibilità prima della raccolta di dati | APERTO |
| G02 | ALTA | Informativa censimento ancora esplicitamente preliminare | Identificare soggetto titolare, recapiti completi, categorie e fonti, finalità, basi giuridiche, destinatari e termini di conservazione; revisione professionale | APERTO |
| G03 | BLOCCANTE LEGALE FINO A VERIFICA | Non documentata la liceità di un eventuale censimento nominativo da visure, annunci o portali; non è dimostrato che venga svolto | Eseguire data mapping, verifica fonti e condizioni di accesso, assessment art. 6 GDPR, art. 14, LIA se pertinente, eventuale DPIA; non avviare nuovi trattamenti non giustificati | DA VERIFICARE |
| G04 | BLOCCANTE LEGALE FINO A VERIFICA | Non documentata la base giuridica di eventuali chiamate/SMS/email/WhatsApp promozionali a recapiti derivati da fonti pubbliche | Verificare art. 130 Codice Privacy, regole RPO, consenso o deroga specifica, opt-out e prove della provenienza; revisione qualificata | DA VERIFICARE |
| G05 | ALTA | `gestione/index.html` è una dashboard con note locali, senza autenticazione sul lato GitHub Pages | Evitare dati personali nel browser pubblico; confermare destinazione e rischi; se sono previsti dati reali, trasferire a soluzione autenticata e autorizzata | APERTO |
| G06 | MEDIA | Servizi esterni presenti nella homepage: Google Fonts, immagini Unsplash, link a YouTube/Instagram/altre piattaforme | Audit richieste di rete e fornitori; verificare risorse caricate prima di interazione, informativa e trasferimenti | DA VERIFICARE |
| G07 | MEDIA | Link a `AgentPricing` nelle landing immobiliari | Verificare ruoli, informativa del terzo e natura della richiesta, eventuale condivisione degli utenti prima del trasferimento | APERTO |
| G08 | MEDIA | Nessun flusso effettivo di esercizio diritti, cancellazione, RPO, conservazione e prova consensi è documentato nel codice | Documentare procedure backend/CRM, ruoli operativi, tempi, registrazioni e protocolli di risposta | DA VERIFICARE |
| G09 | MEDIA | GitHub Pages, domini personalizzati, tracciamenti effettivi, log lato hosting non verificati con browser/live network | Eseguire test runtime con strumenti browser e verifiche GitHub Pages, consultare policy dell'hosting | DA VERIFICARE |
| G10 | MEDIA | 94 HTML in altri repository non sottoposti a audit statico individuale | Identificare applicativi effettivamente pubblici, dati CRM e autenticazione, quindi eseguire audit per repository in ordine di rischio | APERTO |

## Regole legali da confermare con professionista
- GDPR, artt. 5, 6, 12–14, 21, 25, 28, 30, 32, 35, 44–49: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Garante 14/05/2026, provvedimento 10263918: chiarisce condizioni del marketing a recapiti ottenuti anche da fonti accessibili: https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10263918
- Garante, telemarketing / Registro Pubblico delle Opposizioni: https://www.garanteprivacy.it/it/temi/telemarketing
- GitHub, status check / branch protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

## Evidenze e limiti
Evidenze: metadata Git tree, contenuti dei file `index.html` recuperati tramite GitHub, pattern HTML statici. Il controllo non riguarda informazioni interne di CRM, contratti dei fornitori, consensi archiviati, qualità dell'avvenuta informazione art. 14, gestione effettiva di richieste e cancellazioni, controlli runtime di cookie, stato di deployment e sistemi di terze parti. Non è stata eseguita una simulazione di invio dati.

**Decisione:** documentazione e controlli di prevenzione tecnici in preparazione. **Stato GDPR: IN ATTESA DI VALIDAZIONE PROFESSIONALE**. Non dichiarare `APPROVATO` senza la verifica di un consulente legale/privacy qualificato e la documentazione delle operazioni concrete.
