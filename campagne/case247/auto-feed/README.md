# CASE247 — Feed Instagram automatico: specifica operativa

Stato: generatore di bozze e coda configurati; pubblicazione Meta NON ancora abilitata.

## Programma Europe/Rome
04:15 — GitHub Actions prepara un tema da Google News RSS (oppure tema educativo) e genera tre proposte A/B/C. Usa solo fotografie riutilizzabili con licenza identificabile oppure foto autorizzate nella cartella photo-bank. Nessuna immagine AI a pagamento.
Prima delle 09:45 — l'amministratore sceglie A/B/C nel pannello web autenticato via Supabase.
09:45 — se la scelta manca, il motore sceglie in autonomia; impara dalle precedenti preferenze manuali e penalizza la ripetizione visiva; accoda un post oppure un carosello di cinque slide, alternati.
10:00 — orario editoriale desiderato, NON esecuzione Meta già attivata.

## Percorsi
- photo-bank/ — archivio di fotografie autorizzate o riutilizzabili commercialmente.
- days/YYYY-MM-DD/ — tre anteprime e manifest con caption, fonte e licenza.
- ready/YYYY-MM-DD/ — immagine finale o cinque slide per un carosello.
- queue/YYYY-MM-DD.json — selezione del giorno con stato QUEUED_NOT_PUBLISHED.
- review/ — pannello visivo per scelta dell'amministratore.

## Componenti
- GitHub Actions: case247-daily-feed.yml con runner standard in repository pubblico, senza API grafiche a pagamento.
- Supabase: case247_feed_choices (decisione admin), case247_feed_queue (coda), case247-feed-choice e case247-queue-ingest (Edge Functions).
- Il trasferimento da GitHub a Supabase usa GitHub OIDC JWT a breve durata e firma controllata.
- Social Meta: non viene chiamato dal workflow: per pubblicare realmente serve ri-autorizzare il token Meta e collegare il publisher alla coda. Non dichiarare PUBLISHED finché non esiste un media ID verificato.

## Qualità e diritti
I contenuti rappresentano il brand CASE IN PUBBLICITÀ 24/7 con fotografie realistiche, composizione architettonica premium, blu navy/cobalto e dettagli viola/arancio. Le fotografie provenienti da fonti esterne richiedono controllo del diritto di riutilizzo; i metadati non costituiscono garanzia legale. Niente immagini prelevate dalla Meta Ads Library senza autorizzazione.

Il compositore Pillow non crea immagini fotorealistiche ex novo; impagina fotografie fotografiche già esistenti. Se non ci sono almeno 3 fotografie utilizzabili, blocca la produzione senza fabbricare contenuti.

## Pannelli
- Revisione: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/campagne/case247/auto-feed/review/
- Regia: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/canali-case247/
- Workflow: https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/workflows/case247-daily-feed.yml
