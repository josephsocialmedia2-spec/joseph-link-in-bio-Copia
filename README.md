# Joseph – Digital Strategist | Link in Bio & vetrina servizi (v5)

Una pagina HTML completa, responsive, senza framework e adatta a **GitHub Pages**. Il sito principale `josephdigitalstrategist.com` non viene modificato.

## Contenuti

- Hero futuristica nella palette arancione/rosso/viola/blu, glassmorphism e animazioni.
- Messaggio principale: **Joseph raccoglie richieste volontarie da proprietari interessati a vendere e, con consenso, le indirizza a Immobiliare La Sacra**, i cui agenti abilitati gestiscono la mediazione.
- Galleria fotografica con 4 annunci pubblicati su `lasacraimmobiliare.it`, filtrabili fra Case e Attività commerciali, con collegamenti alle schede.
- Portfolio: una realtà della ristorazione senza citarne il nome, Dott.ssa Marta Ruffino, Giuly Cakes, Shore Cocktail Club.
- Due video reali reperiti nelle schede La Sacra (YouTube), caricati su clic.
- Due card Instagram e TikTok: visual e link già attivi verso profili/collezioni verificabili e supporto per incorporare singoli video quando si dispone degli URL.
- WhatsApp contestuale `+39 371 370 8294`, menu mobile, contatto email, servizi e CTA.

## Nuove aree commerciali (v5)

- **Siti web dinamici ed e-commerce su Shopify** con strategia, design responsive, pagine social collegate e pubblicazioni programmate tramite strumenti autorizzati. Nessuna automazione social è attiva solo pubblicando questo HTML: serve configurare accessi, permessi, strumenti terzi ed eventualmente abbonamenti.
- **Esempi di design** ispirati ai temi Shopify gratuiti **Dawn, Craft e Sense** con collegamenti alle rispettive schede ufficiali. Le anteprime sono mockup illustrativi progettati per questa pagina, non screenshot reali di lavori svolti o portfolio consegnati a clienti.
- **Servizi di grafica e stampa personalizzata**: biglietti da visita, volantini, cataloghi, adesivi, pannelli, roll-up, packaging, gadget, calendari, cartelli immobiliari e formati speciali. Il sito non cita alcun produttore o fornitore.
- **CTA “Richiedi preventivo dedicato”** per servizi web, stampa e singole categorie: le richieste aprono WhatsApp con messaggi precompilati. Le offerte economiche e la fattibilità saranno valutate individualmente.

## Inserire un Reel Instagram o un video TikTok

Apri `index.html`, cerca:

```js
const SOCIAL_VIDEO_URLS = { instagramReel: "", tiktokVideo: "" };
```

Inserisci **l'URL pubblico esatto** al video, es.:

```js
const SOCIAL_VIDEO_URLS = {
  instagramReel: "https://www.instagram.com/reel/CODICE_REALE/",
  tiktokVideo: "https://www.tiktok.com/@profilo/video/1234567890123456789"
};
```

Il codice trasforma automaticamente la card interessata in un video incorporato, mantenendo anche il link originale. Alcuni profili o piattaforme possono impedire l'incorporamento: il pulsante al video resterà disponibile.

**Nota:** non vengono inventati codici Reel o ID TikTok. I video YouTube pubblicati da La Sacra sono già collegati: `bTgeDsbwsyo` e `5SYdg9thjKM`.

## Modificare foto

Le immagini degli annunci sono richieste dai CDN originali di La Sacra. Le foto e le schede sono soggette a aggiornamenti o rimozione dal sito di origine; per un uso continuativo e con prestazioni ottimali si consiglia l'utilizzo di copie autorizzate e ottimizzate (WebP) nel proprio repository.

La sezione Ristorazione e le card Dott.ssa Marta Ruffino e Giuly Cakes usano visual astratti intenzionali, non fotografie attribuite erroneamente a persone o attività. Sostituire con foto proprie o con media autorizzati quando disponibili.

## Personalizzare contatti

Cerca l'oggetto `CONFIG` in fondo a `index.html`: cambia `whatsappNumber`, `whatsappMessage`, `email`, o `images`.

## Pubblicare

1. Repository pubblico in uso: `josephsocialmedia2-spec/joseph-link-in-bio-Copia`.
2. Carica `index.html`, `.nojekyll`, `CNAME` e l’intera cartella `assets/` nella radice.
3. In `Settings > Pages` configura `Deploy from a branch`, ramo `main` e directory `/(root)`.
4. Nel campo `Custom domain` imposta `link.josephdigitalstrategist.com`.
5. Nel gestore DNS del dominio crea un record `CNAME` con host `link` e target `josephsocialmedia2-spec.github.io` (l'account attualmente collegato, da verificare in fase di pubblicazione). Abilita HTTPS appena disponibile.

Il dominio principale e gli altri repository non vengono modificati. Nessun backend e nessun canone GitHub aggiuntivo sono richiesti.

## Immagini dimostrative e temi Shopify

Nei tre esempi e-commerce si usano immagini di sfondo da `images.unsplash.com` con fallback grafico in CSS. Sono risorse dimostrative esterne, non prove di siti effettivamente realizzati. Le schede puntano ai temi gratuiti nel catalogo ufficiale Shopify (prezzi e disponibilità dei temi soggetti a modifiche). Per progetti reali, sostituire foto e contenuti con materiali di proprietà o concessi in licenza.

## Fonti esterne

- `https://lasacraimmobiliare.it/` — annunci, immagini e collegamenti schede.
- `https://www.shoretorino.it/` — foto del cocktail bar.
- `https://www.giulycakes.com/` — Giuly Cakes.
- `https://www.instagram.com/pelvicamente.marta/` — Dott.ssa Marta Ruffino.
- `https://www.instagram.com/giulycakes.design/` — Giuly Cakes Instagram.
- `https://www.youtube.com/@Immobiliarelasacra/shorts` — video verticali immobiliari.

Font Google: Orbitron, Rajdhani, Inter. Visualizzazione immagini/iframe esterni richiede connessione Internet.

## Footer — riferimenti amministrativi (v3, mantenuti nella v4)

Sono stati aggiunti, in fondo alla pagina, i valori comunicati dal committente:

- Partita IVA: `13492740017`
- Numero REA: `1366940`

**Da verificare prima della messa online:** questi identificativi devono corrispondere al soggetto giuridico indicato come titolare/gestore del sito e/o chiaramente attribuito. La pagina non include un'attribuzione societaria non confermata.


## Aggiornamento v5: fotografie e valutazione

- Nel riquadro futuristico della prima schermata è inserita la **fotografia personale consegnata da Joseph** (`assets/joseph-malafronte.webp`).
- Nella sezione immobiliare è inclusa una scheda dorata con il logo **“Quanto vale la tua casa? / Richiedimi la tua valutazione professionale”** (`assets/valutazione-professionale.webp`).
- Cliccando sul logo o sul pulsante **RICHIEDI LA TUA VALUTAZIONE** si apre `https://www.agentpricing.com/j.malafronte`. Il collegamento è stato fornito dal committente; verificare nella sessione dell'account di AgentPricing che sia attivo e aggiornato.
- **Caricare tutta la cartella `assets/`** insieme a `index.html`. Le immagini non sono incluse nell'HTML ma sono nel pacchetto ZIP e devono restare negli stessi percorsi.

**Stato di pubblicazione:** i file sono pronti per GitHub Pages, ma la creazione del repository e la configurazione DNS richiedono accesso appropriato e non si considerano completate fino a conferma.

## Dominio predisposto
Il file `CNAME` contiene `link.josephdigitalstrategist.com`. Per funzionare richiede un record DNS `CNAME` con host `link` diretto a `josephsocialmedia2-spec.github.io`, e l’attivazione di Pages nelle impostazioni del repository. Verificare l’HTTPS dopo la propagazione.

## Dati fiscali e ambito professionale

I riferimenti Partita IVA 13492740017 e REA 1366940 indicati nel dialogo appartengono a un agente abilitato, **non a Joseph**. Per evitare attribuzioni inesatte non compaiono nel footer personale. Il marketing/lead generation non autorizza attività riservate agli agenti immobiliari: il rapporto di collaborazione, i compensi e le attività svolte devono essere verificati con un consulente specializzato.