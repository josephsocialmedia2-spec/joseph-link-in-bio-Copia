# CASE IN PUBBLICITÀ 24/7 — Premium Print Engine

Applicazione web **statica** in HTML, CSS e JavaScript pensata per GitHub Pages. Produce **una facciata A4 orizzontale con 18 schede** e, se l'operatore carica una facciata esterna, **un PDF a due pagine (esterno + interno)** stampabile su un solo foglio fronte/retro.

## Struttura

- `index.html` — interfaccia, anteprima, editing, caricamento facciata esterna.
- `styles.css` — A4 landscape, testata a curve/maschere SVG, sei template premium, griglia CSS 6 × 3, card e footer.
- `config.js` — brand, telefono, contatti, partner, percorsi, colori/nomi template.
- `core.js` — validazione URL, formato prezzi, classe APE, EPgl,nren, controllo schede.
- `qr.js` — QR SVG in anteprima e moduli **vettoriali nel PDF**.
- `pdf-engine.js` — esportazione con `html2canvas` + `pdf-lib`, file esterno, 19 QR e watermark quando mancano verifiche.
- `app.js` — UI, catalogo, import URL, foto fallback, modifica singole schede, salvataggio locale.
- `assets/joseph-scontornato.png` — immagine trasparente ottenuta dalla fotografia originale fornita dall'utente; verificarne visivamente i bordi prima della stampa definitiva.
- `assets/joseph-originale.png` — foto originale, conservata.
- `assets/foto-non-disponibile.svg` — segnaposto esplicito: **non è una foto di immobile**.
- `assets/territorio-placeholder.svg` — **illustrazione temporanea, non fotografia di Avigliana**: caricare un panorama reale prima di diffondere la brochure.
- `test/test-core.cjs` — test delle funzioni pure e della geometria QR.

## Installazione nel progetto GitHub esistente

1. Nel repository `josephsocialmedia2-spec/joseph-link-in-bio-Copia`, crea **una nuova cartella** `gestione/volantini-premium/`. Non sovrascrivere immediatamente `gestione/volantini/` già operativo.
2. Carica tutti i file di questo pacchetto all'interno della nuova cartella mantenendo le sottocartelle `assets/` e `test/`.
3. Apri `https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/volantini-premium/`.
4. Il pulsante `Dal catalogo` legge `/joseph-link-in-bio-Copia/immobili/catalogo.json` dallo stesso dominio GitHub Pages. Per importare URL non contenuti nel catalogo, è previsto un tentativo su `/products/<slug>.js`; questo **può fallire per CORS**. Se fallisce, la scheda viene creata come `DA COMPILARE` e va completata manualmente. Il codice non aggira restrizioni CORS.
5. Controlla le singole schede cliccandole. Carica la foto corretta, prezzo, comune, classe APE, EPgl,nren, eventuali indicatori dell'involucro e URL ufficiale.
6. Carica una fotografia **reale e autorizzata** di Avigliana tramite `Panorama`, oppure salva il file nella cartella `assets/` e configura `panoramaReal` in `config.js`. Il segnaposto non è destinato alla stampa commerciale.
7. Carica, se necessario, la facciata esterna in PDF/JPG/PNG. Per PDF multipagina seleziona la pagina desiderata.
8. Clicca `Genera PDF`: se mancano verifiche, il PDF contiene la filigrana `BOZZA - NON DISTRIBUIRE`.

Per collegarlo alla dashboard principale, aggiungi un link a `/gestione/volantini-premium/` nella pagina `gestione/index.html`. Non sono previsti backend o permessi di pubblicazione social.

## Architettura PDF — perché è diversa dalla semplice cattura Canvas

`html2canvas` produce **un'immagine raster**, anche impostando `scale: 3`. Il nostro esportatore cattura la grafica A4 a 3366 × 2382 pixel, quindi la inserisce nel PDF; **dopo**, `qr.js` ridisegna ciascuno dei 19 codici usando `pdf-lib.page.drawRectangle()` sui moduli della matrice QR originale. La quiet zone di **4 moduli** resta bianca.

I codici hanno destinazione diretta, **non abbreviata**:

- QR `listing-0` … `listing-17` → URL HTTPS esatti delle 18 schede `lasacraimmobiliare.it/products/...`.
- QR `whatsapp` → `https://wa.me/393713708294?text=VENDO`.

Le matrici vengono ricalcolate dalla libreria `qrcode-generator` con correzione errori L, così da contenere la densità su URL lunghi. Il riquadro da 70px sul layout 1122px di larghezza corrisponde a circa **18,53 mm** su A4. Sulle 18 URL campione del catalogo, il modulo più denso stimato con encoder QR è di circa 0,38 mm. È una **verifica geometrica**, non una prova di scansionabilità del PDF effettivo.

## Preflight obbligatorio

- Titolo immobile, comune, prezzo, URL ufficiale.
- Classe energetica e EPgl,nren **documentati**. Se assenti: `Da verificare`, non `Classe G` inventata.
- Fotografia della fonte; in caso di errore di rete / CORS il programma mostra un segnaposto **dichiarato** e apre una verifica.
- Conferma manuale che disponibilità, APE, prezzo e fotografie siano corretti.
- Nessun duplicato tra i 18 URL.
- PDF: controllare grafica, dimensioni A4, ritratto, fascia contatti, tutti e 19 QR.
- **Solo dopo**: stampa di prova al 100% e scansione con smartphone, senza riduzione/adattamento del foglio.

L'applicazione genera **bozze anche quando mancano dati**, ma applica la filigrana. La versione commerciale non è da considerare validata finché la verifica documentale e la prova di stampa non sono completate.

## Dipendenze browser (tramite CDN)

- `qrcode-generator@1.4.4` — matrici QR (API `getModuleCount`, `isDark`).
- `html2canvas@1.4.1` — acquisizione grafica, `scale: 3`.
- `pdf-lib@1.17.1` — PDF A4, pagine caricate, disegno vettoriale dei QR.

Per una installazione **totalmente indipendente da CDN**, scarica legalmente le librerie nella cartella `vendor/` e aggiorna le tre `<script src>` in `index.html`. Questo pacchetto **non incorpora** il codice di terze parti.

## Test

```
node test/test-core.cjs
node --check app.js
node --check pdf-engine.js
node --check qr.js
```

I test comprendono URL autorizzati, normalizzazione prezzi e valori energetici, 18 posizioni, prevenzione duplicati, creazione di una matrice QR SVG e costruzione della sua geometria vettoriale PDF. Non sono test E2E del browser né scansioni di un PDF esportato.

## Note tecniche e limiti

1. **GitHub Pages è solo statico**: una pagina remota può bloccare `fetch()` o l'uso di fotografie cross-origin sul canvas. Il catalogo same-origin è la prima fonte; altrimenti è disponibile l'editor manuale. Non serve, e non è corretto, aggirare CORS con proxy pubblici non autorizzati.
2. La foto di Joseph è un PNG con trasparenza, posizionato assolutamente sopra la testata (`z-index:12`). Puoi sostituirla con un PNG scontornato ad alta risoluzione dal pannello sinistro.
3. `externalFile` resta nello stato della sessione: il file esterno non viene salvato in LocalStorage. A ogni riapertura va ricaricato; i dati immobiliari e le impostazioni invece vengono conservati nel browser, salvo limiti di quota.
4. In `@media print` l'elemento A4 interno è isolato; **per ottenere sempre il PDF completo usare il pulsante Genera PDF**, non il comando di stampa del browser.
5. Il layout è una ricostruzione editoriale premium ispirata ai modelli forniti, non una copia pixel-perfect di un'immagine raster. Permette di cambiare i dati senza rigenerare le immagini.
## Versione integrata su GitHub Pages

La versione pubblicata usa il ritratto JPEG originale già presente in `../volantini/portrait-default.js` per non duplicare una risorsa binaria. Per qualità di stampa, caricare dalla UI il PNG scontornato ad alta risoluzione fornito dall'utente. Il segnaposto panoramico è dichiaratamente illustrativo e non può essere usato per la distribuzione commerciale. L'editor precedente `/gestione/volantini/` non è stato modificato.
