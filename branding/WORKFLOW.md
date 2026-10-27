# REAL MEDIA PRO — Pipeline grafica, caption, pubblicazione

## Stato operativo al 27 ottobre 2026
- **Brand book su GitHub:** `branding/brand.json`; guida e inventario presenti.
- **Archivio binario delle immagini:** il file ZIP originale è stato letto e l'archivio deduplicato (28 visual unici da 38 file) è stato preparato e verificato nel runtime ChatGPT. **Non è ancora stato caricato sul repository GitHub**, perché il connettore GitHub disponibile accetta soltanto file di testo.
- **Generazione da GitHub Actions:** il workflow schedulato ogni 6 ore è già presente, ma l'ultima esecuzione verificata non generava immagini per `OPENAI_API_KEY` mancante.
- **Pubblicazione LIVE:** **DISATTIVATA** per default; nessun post viene inviato automaticamente senza asset verificati, account autorizzati e credenziali dei servizi.

## Archivio visivo
Il file binario da collocare nella cartella `branding/` è:
`REAL_MEDIA_PRO_BRAND_IDENTITY_GITHUB.zip`
SHA256 atteso: `f9697dba33fb64f5fbfd08768aa408e23f10c055aea6ad293027ce7827410357`.
Contiene 28 immagini WebP, l'anteprima, il catalogo di 38 nomi/duplicati e `brand.json`. Non rigenerare o ricomprimere lo ZIP dopo il calcolo SHA: il gate riconosce solo l'archivio verificato.

Per inserire l'archivio binario manualmente: apri il repository GitHub, naviga in `branding/`, scegli **Add file → Upload files**, seleziona lo ZIP alleggerito preparato e conferma con **Commit changes**. Il file è circa 7.1 MiB, sotto il limite web di GitHub. Il file originale integrale (38 originali PNG/WebP, circa 61 MiB) va conservato come backup, senza modificarlo.

## Autoregressione vincolata al brand
1. Il codice controlla lo SHA256 dell'archivio e carica il master delle montagne azzurre.
2. La grafica viene generata con il riferimento autentico di Joseph, il master e la palette.
3. Ogni output è analizzato da un secondo modello multimodale; un errore comporta una nuova generazione, massimo 3 tentativi, con feedback specifico.
4. La slide successiva usa la precedente **già approvata** come riferimento; non copia una bozza rifiutata.
5. Se anche un solo elemento non supera il gate visivo (90/100, nessun errore bloccante), la campagna non viene consegnata.
6. Il modello visivo è un controllo assistito, non un sostituto delle verifiche umane iniziali su loghi, testi, identità e licenze delle immagini.

## Caption
Il modello produce varianti distinte per Facebook, Instagram e LinkedIn. Le affermazioni su dati di mercato devono avere fonte e periodo confermati: nessun numero inventato. Caption Instagram con link in bio, Facebook e LinkedIn con URL della landing. Il contatto pubblicato è **solo Joseph**:
- WhatsApp: 371 370 8294
- Telefono: 352 202 4365

**Immobiliare La Sacra** è indicata esclusivamente come partner commerciale per attività dei professionisti immobiliari abilitati.

## Publisher social
Codice: `campagne/social-engine/social_engine/publisher.py`.
- Facebook: post multi-foto di una Pagina amministrata mediante Pages Graph API.
- Instagram: carosello di un profilo Instagram professionale con cinque immagini JPEG pubblicamente raggiungibili.
- LinkedIn: post organico MultiImage (NON carosello pubblicitario) su profilo/persona/organizzazione autorizzati.
- Le immagini sono prima caricate come asset di una GitHub Release temporanea e restano disponibili durante l'invio.
- Ogni piattaforma deve restituire un **post ID autentico**. Il publisher scrive le ricevute nel corpo della GitHub Release dopo ciascun successo, limitando il rischio di duplicazioni.
- La prima pubblicazione reale e la gestione degli errori di rete necessitano di collaudo autorizzato; gli endpoint e i permessi possono evolvere.
- I token non vanno mai salvati nei file di GitHub Pages, nei commit, in un manifest pubblico né inviati in chat.

## Configurazione GitHub → Settings → Secrets and variables → Actions
**Secrets richiesti**, da creare nel tuo account:
- `OPENAI_API_KEY`: chiave API OpenAI a consumo, distinta dal tuo piano ChatGPT.
- `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`: pagina Facebook con permessi di pubblicazione.
- `IG_ACCOUNT_ID`, `IG_ACCESS_TOKEN`: profilo Instagram professionale collegato e permessi.
- `LINKEDIN_OWNER_URN`, `LINKEDIN_ACCESS_TOKEN`: membro/persona o pagina autorizzata, con permesso `w_member_social` o `w_organization_social` secondo il caso.

**Repository variables:** `BRAND_FIRST_BATCH_APPROVED=true` soltanto dopo aver esaminato il primo lotto visivo; `SOCIAL_LIVE_PUBLISH=true` SOLO dopo il collaudo dei 3 account, altrimenti lascia disattivata. Il workflow gira ogni sei ore e il publisher non pubblica senza questa variabile.

## Workflow del motore
`.github/workflows/joseph-social-autopilot.yml`
- Autopilot: al massimo due campagne in preparazione/consegna.
- GPT Image: 7 output per campagna (1 singolo, 5 slide e 1 Story).
- Caption: generate dopo il superamento del QA grafico, una per canale.
- Staging: PNG, JPEG, caption e manifest nella GitHub Release per i servizi social.
- Publisher: invio solo di una campagna completamente verificata per ciclo.
- Stato: bozza / staging / pubblicazione provata da ID, **mai chiamare pubblicato ciò che è solo programmato o generato**.

## Limiti operativi
La generazione richiede archivio binario presente, crediti API e account abilitati; non è ancora una redazione autonoma di notizie fresche. Per un flusso continuativo di dati ISTAT, FIMAA, OMI e notizie locali occorre aggiungere raccolta automatica, attribuzione delle fonti e filtro di pertinenza. Nessuna notizia senza data e fonte deve diventare un dato di mercato nelle grafiche.

I social e la generazione tramite OpenAI GPT Image non sono un'autorizzazione a pubblicare automaticamente contenuti sensibili o promesse commerciali. Prima di attivare LIVE verificare permessi, policy, privacy e la qualità del primo lotto.
