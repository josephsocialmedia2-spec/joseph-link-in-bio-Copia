# Catalogo digitale unico — Immobiliare La Sacra

URL cliente: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/catalogo-premium/

Studio parametri: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/volantini-premium/

## Catalogo sfogliabile

- **Un solo catalogo** per cliente. Le precedenti tre varianti per referente non fanno parte della condivisione.
- Prima pagina: copertina grafica Immobiliare La Sacra nello stile blu/bianco, con sfondo fotografico tratto dall'archivio dell'agenzia.
- Pagine centrali: **quattro immobili per pagina**, sempre in griglia 2×2, con grandi fotografie originali, comune e prezzo come riportati nel feed, link alla scheda ufficiale e caratteristiche presenti nella fonte; nessun dato APE inventato.
- Ultima pagina: **RICHIEDI LA TUA VALUTAZIONE ORA**, telefono dell'agenzia e WhatsApp.
- La pagina mantiene il modulo facoltativo per richiedere altre proposte, con consenso separato.
- Il cliente può navigare con «Precedente/Successiva», touch-swipe o frecce e **stampare/salvare il PDF** dalla pagina. Per l'intero catalogo è disponibile anche un PDF statico rigenerato con GitHub Actions.

## Origine dei dati e URL selezionati

Le schede provengono da `immobili/catalogo.json` (sincronizzazione Shopify La Sacra) e sono visualizzate solo quando la loro URL è diretta su `lasacraimmobiliare.it/products/...` e lo stato è `AVAILABLE` nel feed. Questo è il criterio editoriale del feed, **non una verifica documentale della disponibilità o dell'APE**; prezzi, disponibilità, fotografia e caratteristiche vanno confermati prima di usarli per decisioni o distribuzione pubblicitaria formale.

Lo Studio Premium permette di inserire fino a 18 URL ufficiali in un ordine scelto. Il link cliente include un parametro `immobili=ID1,ID2,...` (massimo 18 ID Shopify) per mostrare **solo i record ancora presenti nell'archivio**, sempre verificati contro i record pubblici al caricamento. Il parametro non permette di iniettare dati o URL di terze parti. Il client vede esclusivamente il catalogo sfogliabile, mai lo Studio Premium.

**Attenzione al PDF della selezione:** con il parametro `immobili`, il pulsante per il PDF integrale statico viene nascosto per non scaricare per errore tutti gli annunci. Il cliente usa **«Scarica PDF della selezione»**, che apre la stampa del proprio browser: scegliere *Salva come PDF*, con tutte le pagine della selezione. Il PDF statico completo `La_Sacra_Catalogo_Tutti_Immobili.pdf` è generato dal workflow e contiene tutti gli annunci del feed (attualmente 58, quindi 15 pagine interne più copertina e finale).

## Validazione e privacy

Nessun numero o email cliente viene raccolto dal lettore: la condivisione apre l'app locale. Il modulo di richiesta compila solo un messaggio WhatsApp/email, da inviare manualmente. Il consenso per comunicazioni future è facoltativo e richiede verifica e registrazione da parte dell'agenzia.

La whitelist `immobili-verificati.json` rimane un archivio separato per annunci **documentalmente verificati**. Non impostare falsi campi `apeVerified` o `availabilityConfirmed`. Consultare l'informativa in `privacy-richiesta.html`.
