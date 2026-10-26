# JOSEPH SOCIAL ENGINE — V1.0

**Sistema sequenziale per 39 campagne / 117 copy, grafica esclusivamente GPT Image (OpenAI), consegna controllata a Later e cancellazione sicura.**

## Come funziona

1. Carica i due CSV esistenti del repository in `campagne/assets/`.
2. Genera un calendario di 117 post a sei ore d'intervallo, alternando campagne immobiliari e locali.
3. Produce su richiesta **sette immagini per campagna**: una statica, cinque slide per il carosello e una Story, usando `images.edit` e una fotografia di riferimento approvata di Joseph. Nessun motore grafico terzo, nessun fallback.
4. Crea le didascalie e i manifest per consegnare immagini e testi a Later.
5. Accetta conferme esterne di importazione / programmazione / pubblicazione, con identificativo o URL.
6. Pulisce i PNG solo dopo una conferma per ciascuno dei tre social, lasciando manifest, prompt, didascalie, hash e archivio.

## Setup in ambiente virtuale

```bash
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m unittest discover -s tests -v
```

Su Windows: `.venv\\Scripts\\python` al posto di `.venv/bin/python`.

## Comandi

Dal **root del repository GitHub** (non dalla sottocartella del programma):

```bash
python -m social_engine plan --input campagne/assets/rmp-piano-social-63-post.csv campagne/assets/piano-social-attivita-54-post-2026.csv --start 2026-11-01T08:00:00+01:00
```

Se il programma è collocato in `campagne/social-engine`, usare `PYTHONPATH=campagne/social-engine` prima di `python -m social_engine`, oppure avviare i comandi da `campagne/social-engine` specificando i percorsi relativi corretti e `--root` come destinazione.

Generare un blocco (richiede API key OpenAI a consumo e un ritratto autorizzato):

```bash
export OPENAI_API_KEY=...   # chiave personale; mai committarla
python -m social_engine generate --campaign IMM01 --portrait assets/joseph-malafronte.webp
python -m social_engine status
```

Dopo aver caricato i file nella Media Library Later, fornire SOLO conferme verificabili, per ogni canale:

```bash
python -m social_engine receipt --campaign IMM01 --channel facebook --state media_imported --proof LATER_EXTERNAL_ID_OR_VERIFIED_REFERENCE
python -m social_engine receipt --campaign IMM01 --channel instagram --state media_imported --proof LATER_EXTERNAL_ID_OR_VERIFIED_REFERENCE
python -m social_engine receipt --campaign IMM01 --channel linkedin --state media_imported --proof LATER_EXTERNAL_ID_OR_VERIFIED_REFERENCE
python -m social_engine cleanup --campaign IMM01
```

La conferma `receipt` è **un dato inserito**: il programma non verifica autonomamente l'autenticità degli ID Later. Non creare ricevute inventate in produzione. Anche quando viene registrato `media_imported`, verificare che Later conservi i media prima della pulizia.

## Limiti verificati

- Il piano Later e i profili social non sono connessi al presente software.
- **Later Social non documenta un'API pubblica di programmazione**; quindi non esiste un publisher automatico affidabile verso Later in questa versione. CSV e asset sono un pacchetto di consegna, **non un CSV importabile automaticamente da Later**.
- Le immagini devono essere caricate nella Media Library / Post Builder Later tramite il suo flusso approvato. In futuro è possibile adottare automazione browser autorizzata e verificata oppure un servizio di publishing con API ufficiale, ma non è implementata qui.
- L'API OpenAI richiede credito API separato dal piano ChatGPT. Non c'è una chiave OpenAI nel runtime di test, quindi **la generazione live non è stata eseguita**: gli integration test usano una copia di una precedente immagine ChatGPT generata come fixture, mai un generatore terzo.
- La QA automatica controlla dimensione, formato e hash, non garantisce che l'AI abbia riprodotto correttamente volto o testo: servono un ritratto autorizzato e controllo umano iniziale sul batch pilota.
- 39×7 = 273 file grafici potenziali: non generare tutto in una singola corsa se non hai stimato i costi API e la capacità del piano Later.
- I limiti di Github storage non sono evitati automaticamente: le immagini finali rimangono locali nella outbox finché non sono consegnate. **Non committare i PNG nel repository se il limite di spazio è la priorità.**

## Privacy e compliance

Joseph gestisce promozione e comunicazione; valutazioni, trattative, mediazione immobiliare e visite sono riservate a professionisti abilitati. Non simulare clienti reali, recensioni o metriche. Tracciamento e remarketing richiedono consenso ove previsto.

## Staging temporaneo GitHub (senza aumentare la cronologia Git)

Per conservare le immagini su GitHub senza riempire permanentemente la storia git, il programma usa gli **asset di GitHub Releases** in una release di prepubblicazione per campagna, non dei commit PNG nel repository.

```bash
export GITHUB_TOKEN=...  # token con permessi Contents:write per il repository
python -m social_engine stage-github --campaign IMM01
# Dopo conferma del caricamento in Later per tutti i profili:
python -m social_engine remove-github --campaign IMM01
python -m social_engine cleanup --campaign IMM01
```

**Attenzione:** i download URL dei release asset pubblici sono accessibili a terzi. Usare soltanto materiali approvati per pubblicazione. Il programma non può verificare automaticamente che Later abbia effettivamente acquisito i media; in assenza di ricevute l'eliminazione è bloccata. Non inserire dati personali riservati nei media.
## CI reale sui CSV

Il workflow GitHub Actions esegue i 7 test automatici, legge anche i CSV originali delle 39 campagne / 117 post e produce un archivio temporaneo di consegna `joseph-later-handoff-117` (durata tre giorni).
