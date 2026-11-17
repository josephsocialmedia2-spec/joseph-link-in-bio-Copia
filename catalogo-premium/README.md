# Catalogo digitale unico — Immobiliare La Sacra

URL cliente: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/catalogo-premium/

Studio parametri: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/volantini-premium/

## Catalogo sfogliabile

- **Un solo catalogo** per cliente. Le precedenti tre varianti per referente non fanno parte della condivisione.
- Prima pagina: copertina grafica Immobiliare La Sacra nello stile blu/bianco, con sfondo fotografico tratto dall'archivio dell'agenzia.
- Pagine centrali: **quattro immobili residenziali idonei per pagina**, sempre in griglia 2×2, con fotografie 16:10, comune e prezzo come riportati nella fonte, link originale sempre visibile e caratteristiche esplicite; nessuna superficie, numero di locali o classe APE inventata.
- Ultima pagina: **RICHIEDI LA TUA VALUTAZIONE ORA**, telefono dell'agenzia e WhatsApp.
- La pagina mantiene il modulo facoltativo per richiedere altre proposte, con consenso separato.
- Il cliente può navigare con «Precedente/Successiva», touch-swipe o frecce e **stampare/salvare il PDF** dalla pagina. Per l'intero catalogo è disponibile anche un PDF statico rigenerato con GitHub Actions.

## Origine dei dati e URL selezionati

Le schede provengono da `immobili/catalogo.json` (sincronizzazione Shopify La Sacra). Il modulo condiviso `catalogo-premium/property-rules.js` applica congiuntamente **categoria Residenziale**, esclusioni testuali per attività/terreni/strutture non pertinenti, stato `AVAILABLE`, immagine HTTPS, URL diretto ufficiale e **comune esplicitamente compreso nella whitelist e con `location_status=VERIFICATO_FONTE`**. I record privi di comune verificato, anche se il titolo suggerisce una località, non vengono indovinati. Il filtro opera sia sul sito sia nello Studio e nel generatore PDF. Il feed contiene oggi 58 record, di cui 27 ammessi (dato contingente, non fissato nel software). Il criterio è editoriale, **non una verifica documentale della disponibilità o dell'APE**; prezzi, disponibilità e caratteristiche vanno confermati prima di prendere impegni.

Lo Studio Premium permette di inserire fino a 18 URL ufficiali in un ordine scelto. Il link cliente include un parametro `immobili=ID1,ID2,...` (massimo 18 ID Shopify) per mostrare **solo i record ancora presenti nell'archivio**, sempre verificati contro i record pubblici al caricamento. Il parametro non permette di iniettare dati o URL di terze parti. Il client vede esclusivamente il catalogo sfogliabile, mai lo Studio Premium.

**Titoli e metadati:** la tipologia, i locali e fino a due caratteristiche sono estratti soltanto quando esplicitamente documentati dal titolo/descrizione o dai campi sorgente. I campi assenti sono rappresentati come `Superficie n.d.`, `Locali n.d.` e `APE da verificare`, non vengono inventati. Il flag facoltativo `solo_verificati=1` mostra soltanto annunci con APE documentato: se la fonte non ne contiene, il catalogo segnala l'assenza di immobili idonei e non propone il PDF completo.

**Navigazione e stampa:** barra numerica `Pagina N di M`, selezione diretta della pagina e pulsanti ad area cliccabile ≥48px. Sul web le schede sono elastiche, senza taglio di titoli, caratteristiche o link; nel PDF A4 orizzontale restano due colonne e due righe per pagina. La stampa da browser usa il DOM stesso del catalogo. Il builder Playwright verifica il numero **dinamico** di pagine (`ceil(n / 4) + 2`) e la corrispondenza degli URL.

**Attenzione al PDF della selezione:** con il parametro `immobili`, il pulsante per il PDF integrale statico viene nascosto per non scaricare per errore tutti gli annunci. Il cliente usa **«Scarica PDF della selezione»**, che apre la stampa del proprio browser: scegliere *Salva come PDF*, con tutte le pagine della selezione. Il PDF statico completo `La_Sacra_Catalogo_Tutti_Immobili.pdf` è generato dal workflow e contiene soltanto gli annunci residenziali ammissibili (`ceil(n/4)` pagine di annunci, più copertina e finale), ricompilati dal feed ufficiale al momento dell'esecuzione.

## Validazione e privacy

Nessun numero o email cliente viene raccolto dal lettore: la condivisione apre l'app locale. Il modulo di richiesta compila solo un messaggio WhatsApp/email, da inviare manualmente. Il consenso per comunicazioni future è facoltativo e richiede verifica e registrazione da parte dell'agenzia.

La whitelist `immobili-verificati.json` rimane un archivio separato per annunci **documentalmente verificati**. Non impostare falsi campi `apeVerified` o `availabilityConfirmed`. Consultare l'informativa in `privacy-richiesta.html`.
