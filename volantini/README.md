# CASE247 | Invio volantini dopo telefonata

Ultimo aggiornamento: 14 novembre 2026.

## Link da usare

Pagina pubblica permanente:
https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/volantini/

Pannello operativo WhatsApp:
https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/whatsapp-volantini/

Entrambe le pagine sono collegate alla dashboard principale, e il pannello WhatsApp prepara il testo soltanto dopo la conferma di aver parlato con il destinatario. Nessun messaggio viene inviato automaticamente.

## Stato dei materiali

La cartella Google Drive CASE247_Volantini_Pubblici contiene, al 14 novembre, solo il PDF `CASE247_A4_6_VERSIONI.pdf`. Questo PDF porta la dicitura **BOZZA DI REVISIONE - NON DISTRIBUIRE SENZA VERIFICA APE E DISPONIBILITA**. Non e stato reso pubblico e non viene piu offerto dalla pagina.

Fino all'approvazione di un PDF immobiliare aggiornato e documentato, il pulsante OK scarica un PDF di **presentazione generale del servizio** creato da `volantini/download.js`. Non contiene annunci, prezzi o prestazioni tecniche non verificate. Il pulsante produce un download PDF da Blob; nel test browser del 14 novembre il download e partito e non si sono verificati errori JavaScript.

Quando un volantino immobiliare e stato definitivamente verificato, salvarlo su GitHub Pages nello stesso percorso `/volantini/` e aggiornare `APPROVED_PDF_PATH` in `download.js` con il **percorso relativo** del file PDF autorizzato. Il collegamento della landing non cambia. Non usare PDF in revisione o promuovere offerte non autorizzate.

## Privacy

Il segno di spunta prima di OK conferma **esclusivamente la richiesta di download** di un singolo file. Non e un consenso GDPR a invii promozionali futuri: la pagina non acquisisce dati personali, non salva contatti ne prove di opt-in, non invia WhatsApp, email o eventi al database. Un eventuale consenso marketing richiede informativa approvata, flag separato per canale e prova lato backend.

Dopo una telefonata, inviare il WhatsApp una sola volta e solo se il destinatario ha richiesto o autorizzato quel collegamento. Non attribuire automaticamente lo stato "CONSENSO_MARKETING" o "PDF_SCARICATO" nel CRM.

## Linkly

Il vecchio shortlink `https://linkly.link/336Br` continua a indirizzare alla cartella Google Drive privata. Il tentativo di modificare la sua destinazione verso GitHub Pages ha ricevuto un rifiuto dal provider: `HTTP 400 - This destination is not allowed (1743)`. **Non utilizzare il vecchio shortlink nei nuovi messaggi**, perche non conduce al modulo OK.

Usare la URL permanente della pagina fino a quando non sia disponibile uno shortlink compatibile e verificato.

## Verifiche

- GitHub Pages: workflow Pages completato con successo il 14 novembre 2026.
- Browser pubblico: checkbox e pulsante OK presenti; senza checkbox, blocco download corretto.
- Browser pubblico: dopo checkbox, download `CASE247_Presentazione_Servizio.pdf` avviato, nessun errore JavaScript osservato.
- Integrita interna e visualizzazione del PDF completo nei vari lettori: da collaudare separatamente.
- Pannello WhatsApp: creazione e presenza codice nel repository verificate; invio reale non effettuato.
