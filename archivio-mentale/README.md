# Archivio Mentale — sito didattico

Sito statico indipendente (un singolo `index.html`) basato sul PDF «ARCHIVIO MENTALE» fornito dall'utente.

## Funzioni
- Schedario numerico completo 00–99, ricercabile e filtrabile.
- Dieci parole-ancora per le cifre 0–9 e tabella del codice fonetico del PDF.
- Flashcard in dieci gruppi, con registrazione delle associazioni ricordate.
- Palazzo della Memoria con 10 loci e scene PAV personalizzabili.
- Allenamento da 10 domande e verifica finale da 20 domande (due per ogni gruppo).
- Correzione e riepilogo degli errori; soglia 80% per superare la verifica finale.
- Progressi salvati nel browser, esportazione/importazione in JSON.
- Nessun servizio esterno, account o chiave API.

## URL del sito
https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/archivio-mentale/

## Nota sui dati
L'applicazione usa `localStorage`: i progressi non si sincronizzano tra dispositivi. Prima di cambiare browser o dispositivo, usa «Esporta progressi» e poi «Importa progressi».

## Origine dei dati
Le 100 parole, le dieci ancore e la codifica fonetica riproducono il PDF fornito. Eventuali apparenti incongruenze sono conservate e segnalate; non vengono introdotte correzioni non richieste.

## Come spostarlo in un repository autonomo
Copia `index.html` nella radice di un nuovo repository pubblico GitHub e attiva in **Settings > Pages** la pubblicazione da `main / (root)`. L'indirizzo diventerà `https://josephsocialmedia2-spec.github.io/NOME-REPOSITORY/`.
