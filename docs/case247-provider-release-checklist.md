# CASE IN PUBBLICITÀ 24/7 — Configurazione fornitori e criteri di attivazione
Data: 2 novembre 2026. Ambiente: `qmeftxsdfeyqozwoivzo`. Stato: **pre-produzione, nessun invio**.

## Blocco attuale, da preservare
```text
controller_confirmed=true
privacy_notice_approved=false
anti_bot_verified=false
intake_enabled=false
email_outbound_enabled=false
whatsapp_outbound_enabled=false
notice_version=DRAFT-2026-11-02
```
Le credenziali e le approvazioni di terzi non sono deducibili dal codice. Non inventare segreti né utilizzare test fittizi come prove di consenso.

## Responsabilità e requisiti esterni
| Sistema | Da predisporre tecnicamente | Dati e conferme realmente necessari | Stato |
|---|---|---|---|
| Recapito privacy | Informativa e procedure richieste interessati | Verifica della ricezione e gestione effettiva di `caseinpubblicita@gmail.com`, o sostituzione con recapito verificato | Non verificato |
| Cloudflare Turnstile | Widget nella landing, verifica server-side del token, confronto hostname e gestione errori (già predisposti) | Site key e secret emesse dal relativo account; test reale su `josephsocialmedia2-spec.github.io`; configurazione rate limit/WAF | Mancano chiavi e test reale |
| Email transazionale | Conferma dell'indirizzo dopo scelta volontaria; URL di verifica con token, scadenza, consumo singolo, audit e revoca | Scelta fornitore ESP, eventuale dominio, DNS SPF/DKIM/DMARC, contratto privacy, API key e test di consegna | Non implementata integrazione provider |
| WhatsApp Business Platform | Opt-in con testo chiaro, gestione template, webhook ufficiale, disiscrizione, quality check e prova canale | Business Account, numero ufficiale, accesso API, template approvati, configurazione webhook e accordi applicabili | Non implementata integrazione provider |
| Supabase | Database RLS, trigger di blocco, Edge Functions, revoche e emergency stop admin | Verifica autorizzazioni staff, backup e sicurezza account, retention documentata e test end-to-end | Parziale |
| GitHub Pages | Landing, privacy DRAFT, revoca, console e centro verifiche | Pubblicazione pagine verificata, monitoraggio deploy e CI | Verificata |
| Diritti degli interessati | Procedura manuale e contatto privacy, revoca tramite link/token | Individuazione addetto, prova di risposta nei termini, archiviazione sicura richieste e documenti | Parziale |
| Marketing immobiliare | Bozze e anteprima matching solo staff | Diritto effettivo di promuovere ogni immobile, accuratezza, tempi e target, revisione campagna | Da verificare immobile per immobile |

## Requisiti precisi per implementare i fornitori

**Turnstile:**
- Registrare l'hostname effettivo `josephsocialmedia2-spec.github.io`, prestando attenzione al percorso della landing.
- Assegnare site key e secret ai Supabase Edge Secrets: `CASE247_TURNSTILE_SITE_KEY` e `CASE247_TURNSTILE_SECRET_KEY`.
- Validare `success`, `hostname`, scadenza e uso singolo del token; aggiungere test reali, rate limit e protezione dagli abusi.
- Nessuna chiave privata in GitHub Pages o nei file sorgente pubblici.

**Email:**
- Valutare il fornitore ESP e il suo accordo ex art. 28 GDPR, ubicazione dei dati e trasferimenti.
- Prima implementare soltanto messaggi strettamente necessari alla verifica di una richiesta realmente avviata; non usarli per sollecitare iscrizioni da elenchi esterni.
- Archiviare proof-of-consent e proof-of-control separati; mai settare `email_verified_at` senza effettiva verifica.
- Sviluppare blocco unsubscribe, bounce/complaint suppression e test dei link.
- Abilitare eventuali messaggi promozionali SOLO dopo approvazione, con invio fail-closed e ricontrollo del consenso immediatamente prima di ciascun messaggio.

**WhatsApp:**
- Utilizzare solo WhatsApp Business Platform o fornitore autorizzato; mai browser automation su WhatsApp Web.
- La policy Meta richiede l'opt-in, i template approvati per avvio conversazioni e appropriate procedure di disiscrizione; verificare il numero e i webhook.
- Non trattare una conversazione WhatsApp iniziata dall'utente come consenso generale al marketing ricorrente.
- Evitare l'uso improprio dei template e rispettare la finestra di assistenza di 24 ore per i messaggi non-template consentiti.

## Regole di sicurezza e gestione dei consensi
1. Ogni canale ha consenso espresso indipendente, snapshot testuale e verifica del recapito.
2. La revoca può riguardare solo email, solo WhatsApp o entrambi. La funzione DB cancella le code HELD/QUEUED del canale interessato; non riscrive la storia dei messaggi inviati.
3. Il pulsante STOP nella console è accessibile soltanto allo staff con ruolo `admin`; l'Edge Function `case247-emergency-stop` verifica nuovamente il ruolo e può solo portare a `false` i tre flag di raccolta e invio.
4. Il matching nella console è una **anteprima interna**, non una lista di destinatari in coda. Richiede comunque conferma di disponibilità, diritti e pertinenza.
5. Evitare importazioni di recapiti scraped, acquistati o visibili pubblicamente nelle liste marketing.
6. Un futuro dispatcher deve ricontrollare tutte le condizioni al momento immediatamente precedente al contatto e rispettare lo STOP anche per job già letti in memoria.

## Prove da effettuare dopo l'integrazione dei fornitori
- Conferma effettiva della mailbox privacy, tempo di risposta ai diritti, cambiamento recapito nelle informative.
- Turnstile con token valido, scaduto, riutilizzato, hostname non valido; rate-limiting e fallback.
- Email di conferma e link di verifica effettivamente ricevuti in mailbox controllata; prova negativa sul token non valido.
- WhatsApp: numero confermato, template approvato, opt-out, webhook e gestione errore; test su contatti che hanno scelto il canale.
- Campagna DRAFT priva di diritti: mai accodata. STOP da admin: annullamento QUEUED/HELD.
- Recovery e rollback, audit RLS, log senza dati personali non necessari, scansione segreti.

## Fonte normativa di riferimento
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj/?locale=it
- Garante 14 maggio 2026: https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10263918
- WhatsApp Business Policy aggiornata al 23 settembre 2026: https://whatsappbusiness.com/policy/

Questo documento non approva l'informativa, non abilita la raccolta né autorizza gli invii.
