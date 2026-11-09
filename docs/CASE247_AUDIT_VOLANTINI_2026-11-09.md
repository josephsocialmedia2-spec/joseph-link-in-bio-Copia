# CASE247 — Audit e piano di correzione (09/11/2026)

## Riscontri verificati nel repository
- `gestione/index.html`: dashboard esistente.
- `campagne/case247/auto-feed/review/index.html`: pagina revisione; contiene riferimenti a una coda GitHub di 12 grafiche del 31/10/2026, dichiarate non pubblicate su Meta all'epoca. NON equivale a verifica dello stato attuale.
- `campagne/case247/auto-feed/review/volantino/index.html`: generatore A5 a **due facciate**, con selezione fino a 8 immobili, catalogo `immobili/catalogo.json`, approvazioni territorio, stato in localStorage e stampa browser A5. NON è ancora un pieghevole A4 a quattro facciate e NON sincronizza automaticamente le approvazioni con Meta.
- `package.json` alla radice non presente: non presumere build npm.

## Sequenza vincolante
1. Audit in sola lettura di scheduler, dati Supabase, queue GitHub e conferme Meta degli ultimi 30 giorni. Se le API non sono accessibili, riportare **non verificato**; mai inferire pubblicazione da record locali.
2. Identificare il generatore originale delle creatività, correggere layout 1080×1350, 1080×1080, 1080×1920. Foto reali, ritratto originale, prezzo, comune, codice, APE, CTA; nessun testo tagliato.
3. Evolvere il generatore A5 esistente a **quattro facciate** su A4 orizzontale fronte/retro: foglio esterno [retro, copertina], interno [pagina 2, pagina 3]. Quattro immobili verificati per pagina interna; copertina e retro servizi.
4. Usare solo otto immobili verificati dal catalogo La Sacra, priorità Avigliana; se insufficienti, bloccare approvazione e segnalare.
5. Quattro QR verificati (appuntamento, mutuo, valutazione, sito), senza URL fittizi; evitare dipendenze esterne per QR in stampa quando possibile.
6. Verificare diciture professionali: CASE247 è servizio promozionale, non qualificare come agenzia senza prova; distinguere La Sacra per l'intermediazione.
7. Integrare approvazione e catalogo con versionamento; non toccare volantini già approvati e non alterare connessioni Meta.
8. Testare impaginazione A4 (297×210 mm, abbondanza 3 mm), QR, mobile, dati energetici, duplicati e stati Meta.
9. Riprendere soltanto i post mancanti, approvati e autorizzati, con idempotenza; registrare ID restituito dalla piattaforma.

## Stato
- Branch di lavoro creato; nessun merge su main.
- Questo documento è un audit preliminare e una specifica, **non** un'attestazione di implementazione, pubblicazione o test.
- Richiesta approvazione grafica prima del merge.
