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

## Tentativo di attivazione — 28 ottobre 2026 (ore mattutine italiane)

- VERIFICATO: `mcp__Supabase__list_organizations` restituisce organizzazione `fshyvehqjleenszxjchb`. Unico progetto attivo resta `nqnmlsmeiynxbdojeyjt`; non modificato.
- VERIFICATO: preventivo `get_cost` per nuovo progetto: **0 USD/mese**. Preventivo branch Supabase: **0,01344 USD/ora**, non autorizzato. Nessuna risorsa fatturabile creata.
- COMPLETATO: correzione del dispatcher per inserire nella coda i giorni correnti e successivi ad ogni esecuzione live protetta. Senza questa correzione il runner non avrebbe trovato alcuna pubblicazione.
- VERIFICATO: Actions sul commit `62332a25669f08a65a607e490aaee8b70034adb7` con conclusione `success` (test offline, non pubblicazione).
- VERIFICATO: hash MP4 preparato `eede47a5ded2c52e344c5f834aa6a6be958674531fd552aa8c306058dace9fc1` e assenza di tag licenza/metadati di titolarità.
- BLOCCATO: creazione di un nuovo progetto Supabase richiede selezione esplicita dell'organizzazione secondo le istruzioni del servizio. Non creata alcuna istanza.
- BLOCCATO: nessun accesso OAuth social verificabile nella sessione; il connettore GitHub non permette lettura dei Secrets e non consente l'inferenza del loro stato.
- BLOCCATO: diritti commerciali del video non documentati, URL video pubblica conforme e quote social non verificate.
- NON ESEGUITO: pubblicazione reale, controllo post via API ufficiali, merge su main e attivazione cron.

## Attivazione infrastrutturale confermata — 28 ottobre 2026, Europe/Rome

- **COMPLETATO:** progetto Supabase isolato creato, ID `tonwtdxjdseuizmezcht`, nome `REAL MEDIA PRO - Social Isolato`, organizzazione `fshyvehqjleenszxjchb`, regione `eu-central-1`, stato `ACTIVE_HEALTHY`. Prezzo confermato tramite preventivo provider **0 USD/mese**. Nessuna modifica al progetto preesistente `nqnmlsmeiynxbdojeyjt`.
- **COMPLETATO:** applicata migration `20261028054551_rmp_isolated_social_schema_initial` sul **nuovo** progetto. Sei tabelle `public.rmp_*`, tutte con RLS. Righe iniziali: settings 1, accounts 3, quotas 4 (tutte UNKNOWN), admins 0.
- **VERIFICATO:** `get_advisors(security)` restituisce nessun problema. `list_tables` e pg_policies verificano RLS e policy su tutte e 6 le tabelle. Un utente autenticato senza ruolo di admin vede 0 righe da settings/accounts/quotas/admins e non riesce a cambiare `enabled`; `anon` non ha SELECT; authenticated non ha UPDATE della colonna `rights_verified` e non può inserire post.
- **BLOCCATO:** un indice prestazionale suggerito per FK `rmp_events(post_id)` non è stato aggiunto perché il controllo di sicurezza ha respinto il DDL. Non influisce sul blocco delle pubblicazioni, ma va ri-verificato.
- **COMPLETATO:** inserite **63 voci READY** per 7 giorni 28 ottobre–3 novembre 2026; 3 fasce 10:00, 16:00, 20:00 e 3 canali. SQL con `AT TIME ZONE 'Europe/Rome'`, conflitti ignorati; validazione: 63 ID unici, 63 caption con entrambi i link, nessun disallineamento orario.
- **COMPLETATO:** pubblicati solo i **quattro file statici** della dashboard in `main:rmp-social/` con URL pubblico previsto `https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/rmp-social/`. Contiene esclusivamente key Supabase **publishable**, mai segreti o token. CI GitHub Pages `40640039706` ha terminato con `success`; raggiungibilità dal browser dell'utente non verificata.
- **BLOCCATO:** sul nuovo progetto Supabase Auth `auth.users` contiene zero utenti: nessun amministratore può ancora accedere al pannello; bootstrap Auth e iscrizione amministratore tramite modalità sicura ancora da completare.
- **BLOCCATO:** accessi OAuth/autorizzazioni ufficiali e identità account Facebook, Instagram e LinkedIn non verificati; diritti video non certificati; quote effettive Meta/LinkedIn/GitHub/Supabase sconosciute; video disponibile in Libreria ma non mediante URL HTTPS verificata per le API social.
- **VERIFICATO:** `rmp_settings.enabled=false`, `rights_verified=false`, `live_test_verified=false`. Nessuna pubblicazione effettiva (link post: nessuno); workflow scheduler su ramo separato, non attivo in `main`.
- **NON ESEGUITO:** prova di pubblicazione reale, verifica del post con API, attivazione scheduler e test di login di un vero utente admin.
