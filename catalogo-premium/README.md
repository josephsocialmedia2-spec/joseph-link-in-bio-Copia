# Catalogo integrale · Immobiliare La Sacra

Link pubblico: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/catalogo-premium/

Studio: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/volantini-premium/

## Fonte e filtri

Il sito, lo Studio e il PDF condividono le regole contenute in catalogo-premium/property-rules.js.
La fonte è immobili/catalogo.json, alimentata dalle schede ufficiali https://lasacraimmobiliare.it/products/...
Il feed attuale contiene **58 record**. Non vengono esclusi per categoria commerciale, comune non ricavabile, superficie,
numero di locali, APE o fotografia mancante.

Senza parametri il catalogo mostra tutte le schede. I filtri sono **facoltativi** e si scelgono
dal sito o dallo Studio per quello specifico link:

- ?immobili=ID1,ID2: ID ufficiali selezionati (al massimo 18 nello Studio).
- ?categoria=Commerciale: categoria riconosciuta dalla fonte ufficiale.
- ?comune=Avigliana: comune riconosciuto dai metadati.
- ?comune=Comune%20da%20verificare: gli annunci privi di comune ricavabile.
- ?stato=Disponibile: stato dell'immobile riportato dall'agenzia.

Lo stato deriva esclusivamente dai campi agency_status, listing_status, availability_status o status,
in quest'ordine. Il nome della fotografia e la descrizione NON modificano lo stato.
Se il file fotografico contiene una dicitura diversa, è necessario verificare la fonte presso l'agenzia.

I dati mancanti sono segnalati in scheda (Superficie n.d., Locali n.d., APE da verificare).
I titoli sono normalizzati con concordanza corretta, per esempio Appartamento ristrutturato
e Casa semindipendente ristrutturata. Il sistema preferisce una fotografia dell'immobile
rispetto a planimetrie e ritratti quando immagini alternative sono presenti in images o gallery.
**Nel feed attuale è presente soltanto il campo image**: per sostituire una foto impropria
la fonte deve fornire l'alternativa.

## Catalogo e PDF

Copertina blu La Sacra, quattro schede per pagina (griglia 2 × 2), finale
«RICHIEDI LA TUA VALUTAZIONE ORA». Ogni scheda mostra fotografia, comune, prezzo,
titolo, caratteristiche, stato, APE e URL ufficiale.

L'interfaccia web e la stampa usano lo stesso DOM, stessa tipografia, palette e componenti.
Il PDF è A4 landscape 297 × 210 mm. La visualizzazione mobile adatta le dimensioni
allo schermo: l'identità grafica rimane uguale, non la scala fisica del foglio.

Stampa / Salva PDF usa la funzione di stampa del browser. Per selezioni filtrate
il pulsante del PDF completo statico è nascosto, così da non includere schede estranee.
Il builder scripts/build-la-sacra-catalogo-pdf.cjs usa Playwright sullo stesso HTML,
verifica gli URL e richiede esattamente ceil(numero_annunci/4) + 2 pagine
(copertina + griglie + pagina finale). I dati non vengono duplicati in un secondo template.

## Privacy e controlli

Il modulo per richiedere altre proposte è facoltativo: prepara un messaggio WhatsApp
o email da inviare manualmente. Il consenso per comunicazioni successive è separato.
I test automatici verificano filtri, titoli, foto, stati, PDF e browser desktop/mobile.
