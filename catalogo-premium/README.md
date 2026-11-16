# Catalogo digitale premium — Immobiliare La Sacra

URL: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/catalogo-premium/

Il catalogo pubblico è una brochure pronta da condividere tramite WhatsApp, email e SMS. Il pulsante PDF/Stampa stampa le 5 pagine. La navigazione supporta swipe, frecce da tastiera e selettori pagina.

## Dati immobili

`immobili-verificati.json` è una whitelist *pubblica*. Non usare come feed direttamente `immobili/catalogo.json`: il catalogo Shopify corrente non contiene indici APE verificati e segnali affidabili di disponibilità per tutte le schede. I record di pubblicazione devono provenire da verifiche e approvazioni documentali.

Formato record richiesto:
```json
{
  "title": "Titolo verificato",
  "municipality": "Comune verificato",
  "description": "Sintesi conforme e verificata",
  "price": 120000,
  "image": "https://...",
  "url": "https://lasacraimmobiliare.it/products/slug",
  "status": "ACTIVE",
  "availabilityConfirmed": true,
  "locationVerified": true,
  "imageVerified": true,
  "priceVerified": true,
  "apeStatus": "PRESENTE",
  "apeVerified": true,
  "energyClass": "D",
  "epglNren": 180.4,
  "envelopeIndex": 110
}
```

Per immobili documentatamente esenti: `apeStatus:"ESENTE"`, `exemptionVerified:true`, `exemptionReason` scritto e approvato. La whitelist è comunque filtrata lato browser (non è un sistema di sicurezza), per evitare che valori incompleti vengano renderizzati accidentalmente. La whitelist **non** viene generata automaticamente da campi ignoti e non rappresenta una certificazione legale.

## Aggiornamento

1. Validare documenti APE, disponibilità, foto, prezzo e correttezza della scheda sul negozio Shopify.
2. Approvare l'inserimento di un record nella whitelist pubblica; non indicare `true` per dati non verificati.
3. Aggiornare `immobili-verificati.json` tramite una PR con audit. Il sito legge il feed in tempo reale (cache disabilitata).
4. Verificare l'annuncio pubblico e il link di contatto.

## Privacy e invio

Nessun indirizzo o telefono cliente viene raccolto in questa pagina; i pulsanti di condivisione aprono applicazioni locali e non spediscono messaggi automaticamente. L'invio a destinatari richiede la loro autorizzazione a ricevere comunicazioni commerciali. Nessuna campagna SMS o email massiva è attivata.

## Limitazione attuale

La versione pubblica mostra una brochure editoriale completa, ma la pagina immobili non elenca annunci finché non ci sono record conformi. Non chiamare il catalogo "portafoglio completo" prima di questo passaggio.
