# OCME Studio — Sito dedicato
Editor web per costruire schemi a cascata e stampare una Scheda di Comprensione OCME in PDF A4 orizzontale.

## Link pubblicato
https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/ocme/

## Separazione dai progetti esistenti
- Branch di lavoro: `ocme-editor`.
- Cartella applicazione: `ocme/index.html`.
- Copia pubblicata: `main/ocme/index.html` (GitHub Pages del repository già attivo).
- Non modificare le impostazioni Pages del repository: il sito attuale ha altre sezioni in produzione.
- Una modifica sul branch `ocme-editor` non raggiunge il sito pubblico fino alla pubblicazione della stessa versione su `main`, preferibilmente tramite revisione/PR.

## Utilizzo
1. Apri il sito.
2. Inserisci argomento, IDEA, SOLUZIONE e VISIONE.
3. Scrivi i rami: un nodo per riga e due spazi per livello gerarchico.
4. Verifica che il diagramma a cascata sia leggibile e semanticamente corretto.
5. Premi **Stampa / salva PDF A4** e seleziona **Salva come PDF**.
6. Imposta: A4, orizzontale, scala 100%, senza intestazioni/piè di pagina del browser.

## Funzioni
- Aggiornamento immediato del diagramma.
- Esempio Smartphone e modello vuoto.
- Importazione TXT o progetto JSON.
- Bozza euristica (non interpretazione semantica affidabile).
- Esportazione JSON per salvare/modificare la struttura.
- Salvataggio locale sul dispositivo tramite localStorage.
- Stampa nativa in PDF vettoriale tramite il browser.

## Limiti
- Attualmente non importa PDF o immagini direttamente: carica testo TXT o incolla il contenuto estratto.
- Non contiene un modello AI lato server.
- In caso di argomento esteso, suddividi in più schede: i caratteri non vengono ridotti indefinitamente.
- I contenuti sono locali al browser: cancellando i dati del sito si perdono, se non esportati in JSON.
- Il sito è pubblico; non inserirvi dati riservati se condividi screenshot o esportazioni.

## Dominio personalizzato (opzionale)
Per una vera URL autonoma, usare preferibilmente un repository GitHub Pages separato oppure un altro hosting, collegando il DNS al dominio scelto. Il sito pubblicato ora è un microsito nel repository esistente.
