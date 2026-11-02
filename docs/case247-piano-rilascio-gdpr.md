# CASE IN PUBBLICITÀ 24/7 — Piano di rilascio GDPR e registro operativo
**Aggiornato:** 2 novembre 2026. **Stato:** PRE-PRODUZIONE, nessuna autorizzazione all'invio.

**Titolare dichiarato:** Joseph Malafronte, persona fisica. CASE IN PUBBLICITÀ 24/7 è il marchio del progetto, non il nome di una società verificata. La conferma del nominativo non equivale ad approvazione dell'informativa né certificazione di conformità.

## Principio operativo inderogabile
Nessun recapito proveniente da portali immobiliari, annunci privati, registri, CRM di altre attività, elenchi pubblici o scraping è automaticamente iscritto al marketing. La ricerca di opportunità immobiliari può costituire un archivio **di osservazioni sugli immobili**, distinto dalla banca dati dei soggetti che si registrano volontariamente. Nemmeno un primo messaggio promozionale per chiedere il consenso è autorizzato in assenza di idonea base giuridica.

**Canali ammessi in futuro:** email e WhatsApp ufficiale solo con scelta specifica per canale, prova della scelta, conferma del possesso del recapito, informativa valida, assenza di revoca, contenuto pertinente e diritti di promozione dell'immobile. Le campagne partono in DRAFT. Nessun servizio di invio è attivato da questo documento.

## Registro preliminare delle attività di trattamento (bozza da completare)
| Trattamento | Finalità | Dati minimi | Base giuridica da documentare | Conservazione |
|---|---|---|---|---|
| Richiesta spontanea | Rispondere a richiesta di acquisto/vendita/immobile commerciale | nome, uno o più recapiti, zona, tipologia, budget facoltativo | misure precontrattuali su iniziativa dell'interessato quando applicabile (art. 6(1)(b)); verificare i casi non precontrattuali | richieste non confermate: cancellazione dopo 30 giorni come implementato; altri casi da definire |
| Marketing per email | Proposte immobiliari coerenti con la richiesta | recapito email, preferenze, prove del consenso, stato conferma e revoca | consenso specifico art. 6(1)(a) GDPR e art. 130 Codice Privacy | da definire prima dell'abilitazione |
| Marketing WhatsApp | Proposte immobiliari coerenti con la richiesta | numero e prove del consenso WhatsApp, preferenze, prova di conferma e revoca | consenso specifico art. 6(1)(a) GDPR e art. 130 Codice Privacy; condizioni ufficiali WhatsApp | da definire prima dell'abilitazione |
| Sicurezza e audit | Prova del consenso, protezione antispam, revoche | versione informativa, testi delle autorizzazioni, date, hash tecnici minimi | obblighi di accountability e sicurezza (artt. 5, 6, 7, 24, 32 GDPR), verificare caso per caso | minimizzazione e durata da documentare |
| Comunicazioni richieste dall'interessato | Risposta alla singola domanda volontaria | recapito e contenuto strettamente necessario | base giuridica pertinente al servizio e al contesto, da documentare | da definire |

**Non ancora documentati:** recapito operativo ufficiale del titolare (email indicata sul sito ancora provvisoria), eventuali indirizzi necessari, ruolo dei responsabili del trattamento, hosting, localizzazione e trasferimenti, garanzie per fornitori extra SEE, tempi delle richieste confermate e dei log degli invii, procedure di backup, eventuale DPIA, valutazione rapporti con intermediari immobiliari. Non sostituire i campi con informazioni inventate.

## Matrice permessi e stato reale
- **Pubblico anonimo:** consulta landing e status; può inviare una domanda *solo* se il rilascio legale, i controlli server e il captcha sono tutti attivi. Oggi raccolta disabilitata.
- **Richiedente:** opt-in email e WhatsApp separati; nessuna casella preselezionata. Revoca disponibile anche quando il modulo di raccolta è chiuso.
- **Staff autorizzato:** accesso autenticato con controllo dell'organizzazione e lettura limitata da RLS; preparazione di sole bozze.
- **Servizio di invio:** non presente. Il trigger `case247_private.enforce_property_dispatch` respinge QUEUED/SENT senza privacy approvata, titolare confermato, antispam verificato, informativa non DRAFT, campagna APPROVED e con diritti verificati, richiesta VERIFIED non scaduta né revocata, canale abilitato, consenso e verifica del recapito con testo documentato.
- **GitHub Pages:** solo codice statico e informazioni non riservate. Nessun contatto, segreto server, token OAuth o chiave service-role va committato nel repository pubblico.
- **Supabase:** RLS delle tabelle dedicate attiva. Funzioni privilegiate solo lato server; verificare periodicamente policy, grants, inviti staff e audit.

## Checklist pre-attivazione — nessun punto di seguito è una concessione di autorizzazione
1. [x] Confermata identità del titolare: Joseph Malafronte, persona fisica.
2. [x] Landing a 3 percorsi predisposta, consensi per canale distinti, link di revoca.
3. [x] Database RLS e trigger di blocco, rafforzato il 2 novembre 2026.
4. [x] Cron di eliminazione richieste non confermate dopo 30 giorni verificato.
5. [ ] Confermato un recapito realmente presidiato per comunicazioni privacy (indirizzo email attuale non verificato).
6. [ ] Completata e approvata informativa art. 13: destinatari, ruoli, basi giuridiche, retention e trasferimenti.
7. [ ] Valutati accordi art. 28 e configurazione dei fornitori.
8. [ ] Cloudflare Turnstile configurato e verificato sul dominio reale; protezione da abuso e rate limit valutati.
9. [ ] Implementata e testata conferma proprietario dei recapiti tramite canali ufficiali, senza invio di promozioni prima del consenso.
10. [ ] Autenticazione staff, revoca, cancellazione, disiscrizione e incidente testati con casi sintetici.
11. [ ] Verificati autorizzazione di marketing dell'immobile, correttezza schede e matching per preferenze.
12. [ ] Provider email / WhatsApp Business ufficiale collegati con segreti server e template approvati; verificate le policy delle piattaforme.
13. [ ] Test end-to-end con contatti reali che abbiano scelto e confermato ciascun canale.
14. [ ] Riesame umano legale e decisione documentata di rilascio.

## Procedura per richieste diritti (artt. 12–22 GDPR)
1. Acquisire la richiesta dal recapito privacy operativo **una volta verificato**; annotare data e tipo di diritto in sistema riservato, mai sul repository pubblico.
2. Verificare l'identità in modo proporzionato, senza richiedere documenti superflui. Per una revoca con token valido, l'API permette l'interruzione senza ulteriore marketing.
3. Per opposizione al marketing o revoca, interrompere la comunicazione nei sistemi collegati; verificare eventuali code già predisposte e liste di esclusione.
4. Individuare eventuali dati in copie, processori, backup e log; applicare termini di cancellazione legalmente giustificati.
5. Rispondere senza ingiustificato ritardo e di norma entro un mese; documentare motivazione di eventuali proroghe nei termini dell'art. 12.
6. Non inviare richieste di conferma del consenso ai recapiti prelevati da annunci pubblici.

## Accessi e verifiche tecniche
- **Console:** `/gestione/case247-comunicazioni/`
- **Centro verifiche in sola lettura:** `/gestione/case247-conformita/`
- **Modulo:** `/campagne/case247/richieste-immobili/`
- **Privacy DRAFT:** `/campagne/case247/privacy-richieste-immobili/`
- **Revoca:** `/campagne/case247/revoca-consenso/`
- **Funzione SQL versionata:** `supabase/schema/case247-dispatch-gate-hardened.sql`
- **Rilascio bloccato:** `privacy_notice_approved=false`, `anti_bot_verified=false`, `intake_enabled=false`, `email_outbound_enabled=false`, `whatsapp_outbound_enabled=false`. Non modificare questi flag senza l'intero collaudo.

### Findings dell'advisor Supabase del 2 novembre 2026
- `rls_enabled_no_policy` su altre tabelle di questo database: alcune tabelle sono volutamente isolate e NON devono ricevere policies permissive per eliminare il warning.
- `pg_net` installato in `public`: richiede valutazione d'impatto su tutte le funzioni esistenti prima di spostarlo. Non modificato.
- Leaked Password Protection disattivata: miglioramento sicurezza Auth da valutare nella configurazione dell'account, senza alterare l'autenticazione di altri servizi in produzione.
Questi rilievi non vengono dichiarati risolti.

## Fonti
- GDPR artt. 5, 6, 7, 12, 13, 24, 28, 32: https://eur-lex.europa.eu/eli/reg/2016/679/oj/?locale=it
- Garante, art. 130 / comunicazioni indesiderate: https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10263918
- Garante, linee guida spam: https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/2542348
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Meta WhatsApp Business Messaging Policy: https://business.whatsapp.com/policy/

Documento operativo, non parere legale e non autorizzazione alla raccolta dati o all'invio.
