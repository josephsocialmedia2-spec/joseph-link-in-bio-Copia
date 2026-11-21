# Real Estate Weekly — produzione automatizzata

Questo percorso contiene le edizioni prodotte da GitHub Actions, senza modificare la rivista interattiva o il vecchio flusso ad approvazione manuale.

## Link permanenti su GitHub Pages (radice main)

- Rivista A4, 8 pagine: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/rivista/edizioni/auto/rivista-latest.pdf
- Seller Letter A4, fronte/retro: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/rivista/edizioni/auto/seller-letter-latest.pdf
- Metadati dell'edizione: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/rivista/edizioni/auto/latest.json

Copie archiviate per data: Real-Estate-Weekly-YYYY-MM-DD.pdf e Seller-Letter-YYYY-MM-DD.pdf.

## Operatività

- Workflow: .github/workflows/real-estate-weekly-autopub.yml
- Generatore: scripts/real_estate_weekly_autopub.py
- Test: tests/real_estate_weekly_autopub_test.py
- Pianificazione: ogni lunedì alle 07:00 Europe/Rome, con due cron UTC e gate CET/CEST; esecuzione manuale Actions > Run workflow.
- Primo numero: dopo la fusione su main viene creata l'edizione di lancio 21/11/2026, senza inventare nuove notizie settimanali.
- Fonti periodiche: feed RSS degli editori; si utilizzano titoli e descrizioni solo con URL del publisher, data e attribuzione. Un metadato RSS non equivale alla verifica del corpo completo dell'articolo.
- PDF: WeasyPrint, due formati A4 (8 pagine + 2 pagine), QR alla copia datata, archivio e due link latest.
- Pubblicazione: commit nella cartella gestione/rivista/edizioni/auto della radice di main. Non cambiare le impostazioni GitHub Pages da root a docs.
- Illustrazioni: immagini vettoriali originali dichiarate, non fotografie spacciate per immobili reali. Sostituire con fotografie autorizzate, diverse per pagina, per una tiratura fotografica definitiva.

## OpenAI facoltativo

Per aggiungere la riscrittura editoriale assistita dai metadati RSS, impostare in Settings > Secrets and variables > Actions il secret OPENAI_API_KEY. Il motore usa Responses API con validazioni sul formato e sulle affermazioni numeriche. La variabile OPENAI_MODEL può scegliere il modello.

Senza secret il sistema resta eseguibile e produce contenuti deterministici e attribuiti; non inventa dati né risultati di vendita. La sottoscrizione ChatGPT non sostituisce una chiave API, che può comportare costi.

## Limiti editoriali dichiarati

- I feed RSS possono essere temporaneamente indisponibili. In tal caso l'edizione rimane un approfondimento sulle basi OMI documentate, non una falsa rassegna di nuove notizie.
- OMI Avigliana 2026/1: intervalli per zona, tipologia e stato; non prezzi di rogito né valutazioni individuali. Non si dichiara che i valori vengano aggiornati automaticamente.
- Pagina 7: esempi metodologici, non due vendite dimostrate. Servono casi reali con autorizzazioni fotografiche e dati documentati prima di pubblicare numeri di vendita.
- Il QR funziona quando la copia datata è stata effettivamente distribuita da GitHub Pages; attendere la pubblicazione prima di stamparlo.
- La rivista esistente basata su approvazione editoriale resta indipendente e non viene disabilitata.
- Non occorrono TinyFish, Shopify o un secondo hosting.
