# OCME Visual First 5.0 — specifica permanente
Integra il Master Mnemonic System e il PROMPT_MASTER della materia. In caso di conflitto sulla presentazione visiva, questa specifica prevale; teoria, fonti, accuratezza scientifica e accessibilità restano obbligatorie.

## Interfaccia predefinita
- Non mostrare una pagina di lettura come ingresso: aprire direttamente una mappa mnemonica in costruzione.
- Un'immagine centrale; rami illustrati che appaiono progressivamente, ordine alfabetico orario da ore dodici nella mappa generale. Sottoargomenti organizzati per sequenza causale o didattica.
- Quattro fasi selezionabili: O organizzazione (mappa progressiva), C comprensione (sequenze, metafore e diagrammi corretti), M memorizzazione (vignette PAV e loci), E esposizione (riepilogo visuale e ascolto a scelta).
- Etichette brevi, preferibilmente 1–2 parole; modalità senza etichette; spiegazioni lunghe nell'audio o nell'archivio teorico, non visibili di default.
- Nessun quiz automatico; non cambiare fase senza scelta dell'utente.
- Teoria completa, strumenti mnemonici, fonti, salvataggi e accessibilità sempre recuperabili senza perdita dei dati.

## Estetica
Cartoon comico, esagerato, assurdo: soggetti concreti in interazione impossibile, azione leggibile, contorni marcati, deformazioni e colori vividi. Usa palette complementare acida (viola elettrico, verde fluo, giallo acido, ciano, arancione, rosa shock). Conserva fondo chiaro e contorni scuri nelle vignette; palette normale selezionabile. Mai invertire i colori dei diagrammi scientifici quando ciò altera la lettura. Non confondere metafora mnemonica e fatto scientifico.
Le immagini devono servire a recuperare una precisa informazione: non usare immagini decorative o segnaposto. Le immagini personali hanno precedenza; dichiarare vettori e generazione AI per ciò che effettivamente sono.

## Montaggio
Centro → rami → sotto-rami → vignette → connessioni → riepilogo.
Transizioni brevi e fluide, alternando ingresso da destra, sinistra, basso, alto. Consentire costruzione automatica, pausa, passo singolo, mappa completa, ricostruzione. Rispettare prefers-reduced-motion e offrire disattivazione movimento; niente lampeggi. L'audio non parte automaticamente.
Durante l'audio, sincronizzare blocco/nodo/immagine e percorso; lasciare facoltativi i sottotitoli. Conservare pausa/ripresa, stop, velocità, navigazione manuale e posizione salvata. Un diagramma scientifico può essere affiancato da una vignetta PAV distinta.

## Architettura condivisa
Motore visivo riutilizzabile: `ocme/engine/visual-first.js`. I contenuti specifici rimangono nella materia. Interfaccia: `OCMEVisual.mount(dataset, adapter)`. Dataset: id, title, rootArt, modules (id, title, label, art, blocks). Block: id, title, label, art, diagram opzionale, flow, locus, source. Art e diagram devono essere nodi DOM clonabili o funzioni che restituiscono nodi freschi. Adapter: play(block,single), pause(), stop(), isPlaying(), rate(), setRate(), caption(), status(), observe(), openArchive(kind,current). Chiamare onAudio(blockId) al cambio blocco del docente. Conservare l'archivio didattico precedente come fallback se il motore non si carica.
Primo adattatore: `ocme/lezioni/geopedologia/index.html`. Non dichiarare migrate altre materie finché non sono effettivamente collegate al motore. Non introdurre dipendenze esterne o credenziali.

## Consegna e collaudo
Pubblicare su GitHub Pages mantenendo gli URL permanenti. Verificare sintassi, copertura dei nodi, progressione, quattro fasi, palette, etichette, navigazione, sincronizzazione, salvataggi, archivio e accessibilità. Distinguere test di logica, simulazione DOM e test reali nel browser. Non dichiarare audio udibile o pagina pubblica verificata senza prova effettiva. Restare nell'ambito ocme/**.

## Editor visuale 5.1 — requisiti permanenti
Ogni nodo deve essere espandibile a profondità arbitraria, anche quando non ha ancora figli. Distinguere Mostra ramo (rivelazione progressiva) da + Nuovo ramo (creazione persistente sotto il nodo corrente). Consentire modifica ed eliminazione dei rami personali con protezione dei discendenti e dei nodi originali. Navigazione per breadcrumb e livello precedente. Ascolta audio, pausa/ripresa e stop disponibili anche in Organizzazione; un ramo personale legge il testo salvato o il titolo se vuoto. Tutte le vignette mnemoniche visualizzate devono accettare sostituzione tramite drag-and-drop da file locale o immagine web HTTPS, oltre alla scelta del file; conservare immagini originali ripristinabili. Non alterare diagrammi scientifici. Salvare modifiche in archivio locale con esportazione/importazione JSON, dichiarando limiti di quota, privacy e disponibilità delle immagini remote. Non dichiarare test audio udibili o drag-and-drop reale se eseguiti solo in DOM simulato.
