# Real Estate Weekly — procedura di aggiornamento (novembre 2026)

## Cosa accade automaticamente

1. **Sabato e lunedì, ore 08:00 Europe/Rome**: il workflow `joseph-weekly-rassegna.yml` raccoglie notizie candidate e rigenera `gestione/rivista/data/latest.json` con la scheda per la verifica.
2. **Il responsabile editoriale** apre `/gestione/rivista/`, verifica titolo, data, testo, dati e fonte originale; approva da 3 a 8 articoli, compila numero, periodo, copertina ed editoriale, poi seleziona "Conferma chiusura editoriale" e "Esporta JSON".
3. Il JSON chiuso e approvato viene riportato in `gestione/rivista/data/approved.json` sul ramo `main`. È una **operazione editoriale esplicita**: la pagina browser non può modificare da sola il repository GitHub.
4. Il commit su `approved.json` avvia `joseph-weekly-pubblica.yml`, che convalida nuovamente tutte le fonti e, soltanto se i controlli passano, genera e pubblica i documenti.

## File aggiornati dopo approvazione

- `gestione/rivista/edizioni/auto/rivista-latest.pdf` — otto pagine A4.
- `gestione/rivista/edizioni/auto/doppie-pagine-latest.pdf` — quattro aperture orizzontali doppie (A3).
- `gestione/rivista/edizioni/auto/seller-letter-latest.pdf` — lettera A4 fronte/retro.
- `gestione/rivista/edizioni/auto/latest.json` — manifest con stato `approved`, QR, data, titoli e percorsi delle otto anteprime.
- `gestione/rivista/sfoglia/` — lettore a libro che carica le otto immagini delle pagine realmente generate.
- `gestione/rivista/edizioni/index.json` e `latest.pdf` — archivio e ultimo numero.
- `gestione/lettere-stampa/` — i tre PDF dai nomi storici restano disponibili; la pagina precedente viene reindirizzata al lettore **soltanto dopo il primo rilascio approvato**.

Il QR della lettera punta al PDF **datato** del numero (non a una destinazione variabile), in modo che le lettere già distribuite conservino lo stesso riferimento.

## Stato del contenuto e regole di sicurezza

- `data/approved.json` con `closed:false` o senza tre fonti originali verificate **non pubblica nulla**.
- Notizie RSS e testi raccolti automaticamente sono **candidati**, non contenuti approvati.
- I PDF di lancio archiviati nel 2026 rimangono visibili nella vecchia presentazione fino al primo numero chiuso.
- Il vecchio `real-estate-weekly-autopub.yml` è ora **solo QA**: non esiste più una pubblicazione RSS senza approvazione; il comando `--seed` produce esclusivamente copie tecniche nel runner di test.
- Le stime OMI non equivalgono a prezzi di rogito né a valutazioni individuali; le attività di mediazione sono riservate ai professionisti abilitati.
- Il flusso non invia messaggi WhatsApp o email e non richiede credenziali OpenAI.

## Verifica tecnica

La suite `real-estate-weekly-autopub.yml` prova sia il numero tecnico sia un'**approvazione simulata senza push** e controlla 8 pagine A4 + 4 aperture doppie + 2 pagine della lettera e le anteprime. La suite `joseph-weekly-qa.yml` verifica anche la sintassi del workflow di pubblicazione e i link del lettore.

Se un test fallisce, i file approvati preesistenti rimangono invariati e non si aggiorna la pagina pubblica.

## Pagine utili

- Centro Editoriale: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/rivista/
- Lettere & Stampa: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/acquisizione-farming/#lettere
- Nuovo lettore: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/rivista/sfoglia/
- Workflow approvato: https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/workflows/joseph-weekly-pubblica.yml
