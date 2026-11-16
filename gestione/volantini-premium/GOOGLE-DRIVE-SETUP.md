# CASE247 · Pubblicazione PDF definitivo su Google Drive

## Stato e funzionamento
- Lo Studio Volantini su GitHub Pages può generare un PDF di prova locale, con watermark. **Non lo carica né lo condivide su Google Drive**.
- Solo il comando **PDF definitivo + Drive**, dopo superamento dei controlli di dati, fotografie e QR, carica il documento con l'account Google autorizzato e richiede un permesso `anyone / reader`. Mostra il link al cliente **solo se la risposta di Drive conferma la lettura pubblica e restituisce `webViewLink`**.
- La prima pagina del PDF è il fronte A4 composto da due A5 verticali, quando caricati entrambi; il retro contiene le 18 schede.
- Il comando non invia messaggi né fa campagne WhatsApp in automatico; offre **Copia link cliente** e **Condividi su WhatsApp**, entrambi attivati manualmente dall'operatore.
- Se l'autorizzazione scade o Drive rifiuta il permesso pubblico, il sistema segnala la mancata pubblicazione e non mostra un link cliente.
- Le credenziali OAuth e l'access token non sono committati: l'access token è mantenuto soltanto nella memoria della scheda; il Client ID web, identificativo pubblico, è salvato nel browser. Nessuna chiave di servizio è esposta.

## Configurazione obbligatoria (da effettuare sull'account Google del titolare)
1. In Google Cloud creare o scegliere il progetto dedicato all'app e abilitare **Google Drive API**.
2. Configurare la schermata OAuth (Google Auth Platform), compresi stato di pubblicazione e utenti di test quando richiesto da Google; il permesso `drive.file` può richiedere il relativo controllo di verifica.
3. Creare un **OAuth 2.0 Client ID di tipo Web application**; impostare come **Authorized JavaScript origin**:
   `https://josephsocialmedia2-spec.github.io`
   (solo dominio, senza il percorso della repository).
4. Aprire lo Studio Volantini e inserire il Client ID `....apps.googleusercontent.com`, quindi premere **Salva configurazione** e **Collega Google Drive**. Se la finestra Google non si apre, autorizzare i popup per la pagina e verificare origin/consent.
5. Selezionare una scheda annuncio valida per tutte le 18 posizioni e confermare ogni requisito documentale. Premere **PDF definitivo + Drive**. Il sito crea il PDF, lo carica su Drive e mostra il link, se Drive conferma l'accesso in lettura.
6. Da browser non autenticato verificare il link; se Google vieta `anyone`, cambiare la policy dell'account/organizzazione **solo se autorizzato**, altrimenti lasciare il file privato e non condividerlo ai clienti.

**NOTA:** Il repository non contiene un Client ID web valido né può riutilizzare automaticamente l'autenticazione dell'assistente Google Drive o i secret di GitHub Actions. Fino a configurazione e accesso OAuth la pubblicazione automatica non è attiva. GitHub Pages statico non gestisce credenziali segrete.

## Collaudo richiesto
Test automatici Node: sintassi, instradamento bozza/definitivo, costruzione multipart/related, token in memoria, permessi reader e UI.
Non sostituiscono il collaudo E2E con account Google reale, PDF effettivo, link in incognito e lettura da smartphone. Non dichiarare «Drive collegato e funzionale» prima di quel collaudo.
