# RAPPORTO TECNICO — REAL MEDIA PRO ISOLATO
Data: 2026-10-28; ramo: `feature/rmp-social-isolato-20261028`.

## Risultati con evidenza

| Stato | Oggetto | Evidenza |
|---|---|---|
| VERIFICATO | GitHub e accesso in scrittura | Repo pubblico `josephsocialmedia2-spec/joseph-link-in-bio-Copia`, branch nuovo creato |
| COMPLETATO | Materiali sorgente | 3 file richiesti letti da `main` |
| VERIFICATO | Supabase precedente escluso | `nqnmlsmeiynxbdojeyjt`, nessun SQL, Storage o cron alterato |
| COMPLETATO | Schema isolato con RLS | `rmp-isolato/sql/schema.sql`, non applicato |
| COMPLETATO | Nove slot al giorno | `rmp-isolato/schedule.py`: 3 orari × 3 piattaforme |
| COMPLETATO | Varianti caption | 3 canali, 3 slot; entrambi i link in ogni testo; avvertenza perizia/mediazione |
| COMPLETATO | Dispatcher e coda | `worker.py`, claim, riconciliazione, tentativi limitati, log |
| COMPLETATO | Dashboard HTML/CSS/JS | 7 sezioni, login/RLS e pulsanti sospensione/ripresa; NON ospitata |
| VERIFICATO | Video originale | 3.540.857 byte, 17,566667 s, H.264 480×854 30 fps, AAC 44,1 kHz |
| COMPLETATO | Nuova versione locale | 2.542.302 byte, 540×960, H.264 30 fps, AAC 48 kHz; nessun upload cloud |
| VERIFICATO | CI offline | Successo unit-test su Actions, ma NON è prova API né database |
| BLOCCATO | Diritti commerciali | Nessuna licenza/documentazione sufficiente per immagini/template/audio nei materiali esaminati |
| BLOCCATO | OAuth/destinazioni | Nessuna identità e concessione API social verificata in questa ripresa |
| BLOCCATO | Nuovo Supabase | Costi e disponibilità nuovo progetto NON verificati; non creato |
| BLOCCATO | Quote consumi | Limiti/consumi concreti non osservabili: UNKNOWN, nessuna assunzione di illimitato |
| BLOCCATO | URL pubblica del video | Libreria ChatGPT non equivale a origine HTTPS leggibile da Meta |
| NON ESEGUITO | Prova reale | Nessuna chiamata di pubblicazione effettuata |
| NON ESEGUITO | Attivazione scheduler | Workflow presente solo su ramo non predefinito |
| NON ESEGUITO | URL dashboard live | Nessun deployment sicuro attivo |

## Hash verificati
- Originale: `24148c620f19747ffc7cb8a865680e19b40411ac1d21d3fa2288b8c552fe97cb`.
- MP4 normalizzato: `eede47a5ded2c52e344c5f834aa6a6be958674531fd552aa8c306058dace9fc1`.

## Prossimi slot teorici (NON ATTIVI)
- 28 ottobre 2026: 10:00, 16:00, 20:00 Europe/Rome.
- 29 ottobre 2026: 10:00, 16:00, 20:00 Europe/Rome.
- Tre pubblicazioni per ora (Facebook, Instagram, LinkedIn) = 9 al giorno
  **solo dopo l'attivazione**, senza pubblicazioni extra per il test.

## QA
Test eseguiti in CI: 9 slot unici, presenza di entrambi i link,
avvertenze, cambio orario marzo/ottobre 2026, soglia 45 minuti,
caption data-distinta, piattaforma non consentita, rifiuto Supabase vecchio,
URL video non HTTPS, quota sconosciuta e token assenti.
Test da eseguire su progetto nuovo: RLS e autorizzazioni reali,
upload con risposte delle API, lookup duplicati, ripristino da crash,
ritardo effettivo di Actions e comportamento del dashboard login.

## Decisone operativa
Il progetto non è concluso. Non autorizzare merge, live test né attivazione
finché tutti i blocchi di identità, licenza, costo/quota e DB non
sono risolti e verificati. Non sono necessari reset o backup del vecchio
Supabase per il nuovo schema isolato: la protezione è l'assenza di
qualsiasi mutazione nel vecchio progetto.

Per i dettagli e i passaggi restanti: `README.md` in questa cartella.
