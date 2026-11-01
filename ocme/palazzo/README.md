# OCME Studio — Palazzo della Memoria

Percorso guidato per imparare a usare il **Palazzo della Memoria / Tecnica dei Loci** e il metodo **P.A.V.** (Paradosso, Azione, Vividezza).

## Pubblicazione

- URL pubblico: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/ocme/palazzo/
- Repository: `josephsocialmedia2-spec/joseph-link-in-bio-Copia`
- Branch di sviluppo isolato: `ocme-palazzo`
- Branch di pubblicazione: `main`, cartella `/ocme/palazzo/`
- Pagina originaria: `/ocme/` (editor schemi a cascata, separato)

## Funzioni

1. Scegli casa, ufficio, strada o un altro luogo familiare. Definisci 5–10 loci in ordine logico, orario o antiorario.
2. Inserisci da 5 a 10 concetti, uno per riga (numero di concetti non superiore ai loci).
3. Associa ogni concetto a una scena P.A.V.; modifica il gancio concreto e la scena. Alcuni esempi immobiliari hanno suggerimenti fonetici predefiniti. Per gli altri, completa manualmente il gancio.
4. Ripercorri mentalmente il percorso, mostra la soluzione, registra "L'ho ricordato" oppure "Da ripassare" e ottieni il riepilogo.
5. Esporta e importa un esercizio JSON.
6. Stampa la scheda del percorso in A4 orizzontale e scegli "Salva come PDF" nel browser.

## Note tecniche

- Applicazione HTML/JS statica, senza server, chiavi API o servizi esterni.
- Dati salvati in `localStorage` del browser, non sincronizzati tra dispositivi.
- Il PDF viene generato dalla funzionalità di stampa del browser; per 5–10 scene brevi è progettato per essere compatto, testi lunghi possono occupare più pagine.
- I suggerimenti P.A.V. sono **regole e repertori di immagini**, non immagini o testi generati con una AI online.
- Il test usa autovalutazione e non verifica semanticamente la risposta scritta.
- Il sito GitHub Pages è pubblico: non ospita contenuti personali inseriti dagli utenti sul server, ma chi usa un dispositivo condiviso dovrebbe esportare il progetto e cancellare i dati locali.

## Sviluppo e rilascio

Lavorare su `ocme-palazzo`. Quando verificato, distribuire gli stessi file su `main/ocme/palazzo/` senza cambiare la configurazione Pages dell'intero repository. Link relativo di ritorno `../` verso l'editor OCME di schemi a cascata.