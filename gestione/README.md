# Real Media Pro — Regia Digitale

Dashboard: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/

## Piano editoriale (47 schede, 23 ore)

Calendario: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/piano-editoriale/

Il piano deriva dalla lettura delle 47 pagine registrate nella Cabina di Regia e usa [pagine.json](piano-editoriale/pagine.json) come fonte delle domande, risposte, errori comuni e azioni operative.

- **47 uscite quotidiane** nel calendario completo, distribuite fra 00:00 e 22:59 nel fuso Europe/Rome. Gli orari ruotano giornalmente.
- **329 uscite in sette giorni**, con sette angoli comunicativi: domanda, errore, verifiche, vero/falso, azione, scenario ipotetico e FAQ.
- Filtri per **39 landing commerciali**, 21 immobiliari, 18 attività locali e 8 pagine di servizio.
- **REGIA** è interna e **PRIVACY** è una bozza: il piano segnala entrambe come non adatte alla pubblicazione senza valutazione preventiva.
- Ogni riga mostra orario, pagina, canale proposto, materiale creativo richiesto, stato e testo per il post. Lo stato si conserva solo nel browser; esporta il backup degli stati.
- Esporta CSV per il giorno o per sette giorni, con contenuti completi, destinazioni UTM e formati suggeriti. Il CSV non pubblica nulla.
- I collegamenti social sono letti dal file pubblico `gestione/social-links.json` e anche dalle impostazioni locali della Cabina di Regia nello stesso browser.
- **Nessuna pubblicazione automatica è attivata.** L'eventuale importazione in un sistema esterno richiede revisione dei testi, produzioni grafiche e autorizzazioni ai profili.

Il pianificatore è uno **strumento tecnico interno** e non viene incluso fra le 47 pagine editoriali da promuovere.

## FATTO con data e collegamenti social

- Ogni pagina mostra il pulsante **✓ FATTO** con la data reale del completamento (formato italiano, fuso Europe/Rome). Premilo una seconda volta per annullare FATTO dopo conferma.
- Le icone **Facebook, Instagram, YouTube e TikTok** sono visibili accanto a ogni pagina. Quando un link è configurato, aprono quel profilo; in assenza di link sono grigie e aprono i campi di configurazione.
- In **Gestisci → Social dedicati a questa pagina** puoi inserire gli URL HTTPS effettivi, salvare localmente e generare un archivio JSON per GitHub. Non vengono creati profili social o collegamenti fittizi.
- **Stato e data FATTO e URL inseriti nella dashboard si salvano solo nel browser corrente.** Per condividere gli URL tra dispositivi, esporta `social-links.json` e pubblicalo in `gestione/social-links.json` tramite GitHub autenticato.
- I pulsanti **Backup note JSON** e **Esporta registro CSV** includono lo stato FATTO con data; il CSV include anche gli URL social.

## Gestione delle landing

- Cerca per ID o titolo oppure usa i filtri per categoria.
- Clicca **Gestisci** per visualizzare tre suggerimenti editoriali specifici per quella pagina e una checklist di revisione.
- **Apri pagina** visualizza la landing pubblicata; **Modifica HTML** apre il file nel percorso esatto di GitHub, richiedendo l'accesso al proprio account GitHub. Dopo la modifica occorre salvare un commit affinché GitHub Pages ricostruisca il sito.
- **Crea richiesta su GitHub** precompila un Issue, non aggiorna automaticamente la pagina. **Copia istruzioni** copia l'intervento proposto.
- Note, checklist, date FATTO e URL social locali vengono salvati **soltanto nel browser corrente**. Usa **Backup note JSON** per esportare e **Importa note JSON** su un altro dispositivo. Non salvare password, token, dati personali o altre informazioni riservate nelle note.
- **Verifica URL HTTP** controlla dal browser le risposte dei percorsi pubblici. Una risposta HTTP 200 non dimostra che grafica, CTA e comportamento mobile siano corretti: testarli separatamente.
- **Aggiorna da GitHub** cerca nuovi file index.html nel branch `main` del repository pubblico. Le nuove voci ricavate sono temporanee e devono essere aggiunte anche all'inventario sorgente.
- **Esporta registro CSV** genera un inventario utilizzabile per attività di revisione.

## Sicurezza

Questo è un **sito pubblico statico** su GitHub Pages, non un'applicazione amministrativa riservata. La direttiva `noindex` limita l'indicizzazione ma non garantisce la segretezza. Le operazioni di modifica dei file avvengono invece sul sito GitHub con autenticazione e permessi sul repository. Non inserire password o Personal Access Token in questa dashboard.

## Recapiti fissi delle campagne

- Email: agenziarealmediapro@gmail.com
- WhatsApp: 371 370 8294 → https://wa.me/393713708294
- Telefono: 352 202 4365 → tel:+393522024365

## Totali verificati il 24 ottobre 2026

- 47 pagine web navigabili, inclusa la Regia Digitale.
- 21 landing immobiliari, 18 landing per attività locali, 8 pagine di servizio.
- 48 file HTML complessivi nel repository: uno è un modello tecnico interno, non una pagina pubblica.

## Inventario di riferimento

[Inventario corrente (46 pagine)](../campagne/INVENTARIO.md) · [Audit storico delle prime pagine](../campagne/CONTROLLO_LANDING.md) · [Piano social](../campagne/PIANO_SOCIAL.md)
