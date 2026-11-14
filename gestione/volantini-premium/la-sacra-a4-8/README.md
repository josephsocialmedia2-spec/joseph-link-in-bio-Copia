# Immobiliare La Sacra — Volantino A4 8 immobili (in revisione)

Data verifica: 14 novembre 2026. **NON DISTRIBUIRE**.

Questa directory è isolata in un ramo di lavoro non integrato in main. Non modifica il generatore operativo da 18 immobili, il download pubblico o le campagne.

## Fonti

- Catalogo: `immobili/catalogo.json` (58 record; ultimo `last_success_at` 2026-11-13T12:22:02Z).
- Bozza A4 a sei varianti (12 facciate): Google Drive `CASE247_A4_6_VERSIONI.pdf` (11/11/2026).
- Fotografie: immagini estratte senza generazione dal PDF di progetto, posizioni elencate in `manifest.revisione.json`.
- Logo: estratto dalla copertina del catalogo ufficiale `CATALOGO-GENNAIO.pdf`; ritratto dalla bozza A4.
- Dati di prezzo, descrizione ed energia: schede ufficiali `https://lasacraimmobiliare.it/products/...` indicate nel manifest, confrontate con snapshot 13/11.

## Controlli eseguiti sul PDF locale

1. PDF creato effettivamente in **A4 orizzontale, due pagine**, verificato con render PNG e controllo visivo.
2. Tutti gli otto QR annuncio e il QR contatto decodificati dal PDF renderizzato: 9/9 corretti; QR degli annunci cliccabili.
3. Marchio in facciata: solo **IMMOBILIARE LA SACRA**; assenti le diciture Case in Pubblicità 24/7, CASE247 e RealMediaPro.
4. Font Lato incorporati, margini di sicurezza e stampa digitale controllati; nessuna prova di stampa fisica.
5. PDF per revisione **non caricato su GitHub Pages**, non inviato e non distribuito.

## Impedimenti alla qualifica di 'definitivo'

- Non è documentata una selezione di otto immobili *approvata per questo volantino*. Le approvazioni `campagne/case247/territorio/approvazioni.json` riguardano contenuti editoriali social.
- La bozza A4 del progetto ha 18 annunci, quella da otto è A5: il significato vincolante di 'interno' (pannelli piegati o facciata) non è comprovato.
- Le schede web indicizzate non forniscono una conferma live e attuale di disponibilità, prezzi, foto originarie e APE firmati.
- Serve riscontro dell'agenzia sulla selezione, disponibilità e APE prima di togliere l'etichetta BOZZA.

Per prudenza, `main` e il pulsante pubblico di download sono lasciati invariati.
