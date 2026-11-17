# CASE247 · Pubblicazione PDF definitivo su Google Drive

## Stato e funzionamento
- Lo Studio Volantini su GitHub Pages può generare un PDF di prova locale, con watermark. **Non lo carica né lo condivide su Google Drive**.
- Solo il comando **PDF definitivo + Drive**, dopo superamento dei controlli di dati, fotografie e QR, carica il documento nella cartella **VOLANTINO** (Drive Primary, ID `1fk3pG5Pci0AQGhqbCiFr8eN7axwxsbO7`) con l'account Google autorizzato e richiede un permesso `anyone / reader`. La cartella e la destinazione vengono verificate dalla API dopo l'upload. Mostra il link al cliente **solo se la risposta di Drive conferma la lettura pubblica e restituisce `webViewLink`**.
- La prima pagina del PDF è il fronte A4 composto da due A5 verticali, quando caricati entrambi; il retro contiene le 18 schede.
- Il comando non invia messaggi né fa campagne WhatsApp in automatico; offre **Copia link cliente** e **Condividi su WhatsApp**, entrambi attivati manualmente dall'operatore.
- Se l'autorizzazione scade o Drive rifiuta il permesso pubblico, il sistema segnala la mancata pubblicazione e non mostra un link cliente.
- Le credenziali OAuth e l'access token non sono committati: l'access token è mantenuto soltanto nella memoria della scheda; il Client ID web, identificativo pubblico, è salvato nel browser. Nessuna chiave di servizio è esposta.

## Configurazione obbligatoria (da effettuare sull'account Google del titolare)
1. In Google Cloud creare o scegliere il progetto dedicato all'app e abilitare **Google Drive API**.
2. Configurare la schermata OAuth (Google Auth Platform), compresi stato di pubblicazione e utenti di test quando richiesto da Google; il permesso Google Drive completo `drive` (necessario per una cartella preesistente) può richiedere revisione/verifica dell’app: l’accesso autorizza la web app a gestire file in Drive, quindi è importante utilizzare un progetto OAuth controllato dal titolare.
3. Creare un **OAuth 2.0 Client ID di tipo Web application**; impostare come **Authorized JavaScript origin**:
   `https://josephsocialmedia2-spec.github.io`
   (solo dominio, senza il percorso della repository).
4. Aprire lo Studio Volantini e inserire il Client ID `....apps.googleusercontent.com`, quindi premere **Salva configurazione** e **Collega Google Drive**. Se la finestra Google non si apre, autorizzare i popup per la pagina e verificare origin/consent.
5. Confermare i dati delle 18 schede reali e i requisiti documentali. Premere **PDF definitivo + Drive**. Il sito crea il PDF, lo carica nella cartella VOLANTINO e mostra il link soltanto se Drive conferma parent corretto e permessi di sola lettura.
6. Da browser non autenticato verificare il link; se Google vieta `anyone`, cambiare la policy dell'account/organizzazione **solo se autorizzato**, altrimenti lasciare il file privato e non condividerlo ai clienti.

**NOTA:** Il codice contiene un identificativo pubblico OAuth Web (`DEFAULT_CLIENT_ID`), ma questo non prova che l'origine JavaScript sia stata autorizzata su Google Cloud né che l'utente abbia concesso i permessi. L'autenticazione dell'assistente Google Drive o i secret di GitHub Actions non sono riutilizzabili dalla pagina. Fino a consenso OAuth effettivo e collaudo con Google Drive reale, la pubblicazione automatica non può essere dichiarata attiva. GitHub Pages statico non gestisce credenziali segrete.

## Collaudo richiesto
Test automatici Node: sintassi, instradamento bozza/definitivo, costruzione multipart/related, token in memoria, permessi reader e UI.
Non sostituiscono il collaudo E2E con account Google reale, PDF effettivo, link in incognito e lettura da smartphone. Non dichiarare «Drive collegato e funzionale» prima di quel collaudo.

## Archiviazione esistente, 16 novembre 2026

- Cartella: https://drive.google.com/drive/folders/1fk3pG5Pci0AQGhqbCiFr8eN7axwxsbO7
- Con il connettore Google Drive autorizzato in ChatGPT sono stati caricati: due A5 PDF, due PNG e il fronte A4 PDF (unica pagina con due A5).
- Tutti i file risultavano **privati** a verifica dell’API: **non** sono link pubblici per i clienti.
- Non confondere il collegamento del connettore ChatGPT con il consenso OAuth del browser GitHub Pages: sono autenticazioni diverse.
- Il retro con le 18 schede non è stato aggiunto al fronte archiviato, perché esistono verifiche immobiliari ancora aperte.

## Recupero del link cliente (17 novembre 2026)

- Una volta connesso l'account Google, lo Studio prova a recuperare l'ultimo **ID file PDF** pubblicato da questo browser. L'ID (non il token) è salvato in `localStorage`.
- Il link viene mostrato di nuovo soltanto dopo una nuova verifica delle API `files.get` e `permissions.list`: PDF non cestinato, cartella VOLANTINO, permesso `anyone/reader`, `webViewLink` presente.
- Il link recuperato è etichettato **ultimo PDF pubblicato**: non implica che l'editor corrente, con eventuali modifiche locali successive, coincida con quel PDF.
- Copia link usa Clipboard API quando disponibile, altrimenti seleziona il campo di testo per copia manuale; il pulsante WhatsApp trasmette solo l'URL del PDF confermato.
- Il definitivo richiede entrambi gli A5 del fronte, le 18 schede e tutte le verifiche. Non rimuovere i blocchi APE, fotografie o disponibilità per ottenere artificialmente un link.
- Test simulati: `node gestione/volantini-premium/test-link-cliente.cjs`. Restano necessari login OAuth, caricamento effettivo, apertura anonima e prova QR/stampa con un browser reale.
