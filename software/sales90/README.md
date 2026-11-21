# Joseph Sales Automation 90 · MVP 0.1
**Stato: branch di sviluppo. Non pronto per dati reali o campagne live.**

Questo modulo non modifica i file già pubblicati in `/gestione/`, né le landing esistenti.
Nel progetto GitHub pubblico la cartella `software/sales90/` contiene SOLO codice sorgente e dati sintetici; **non inserire lead reali qui o nella demo**.

## Cosa funziona adesso
- Interfaccia responsive blu cobalto / blu notte.
- Demo nel browser con immobile sintetico Via Torino, €150.000, chiaramente etichettato.
- Creazione immobili dimostrativi (solo dati inventati) e piano dettagliato in 8 fasi, dal giorno 1 al 90.
- 37 attività generate automaticamente, con responsabilità e scadenze.
- Completamento attività, conteggio scadute, CSV e stampa.
- Modello di 6 promemoria ricorrenti, esposto come **non attivo** finché lo scheduler non sarà collegato.
- Schema SQL isolato, autenticazione ed RLS predisposte.
- App opzionalmente collegabile a Supabase mediante `config.js`; senza configurazione resta in demo.

## Cosa non è ancora operativo
- Invio vero di email/SMS/WhatsApp e notifiche ricorrenti (Edge Function pronta da collaudare e distribuire).
- Integrazione Meta Ads, Google Ads, GA4, CRM esterni e sincronizzazione portali.
- Generazione automatica di landing GitHub via API, lead webhooks e report automatici per i proprietari.
- Gestione agenti avanzata e ruoli organizzativi, Open House e GDPR definitivo.
- I dati demo sono nel localStorage del browser, non sono sincronizzati. Solo dati sintetici.

## Installazione di sviluppo
1. Test logica: `cd software/sales90 && npm test` (Node 20+).
2. Apri in un server web locale statico: `python -m http.server 8000` dalla root del repository e naviga su `/software/sales90/`.
3. Esamina `schema.sql` e applica **solo previa revisione** al progetto Supabase scelto. Le tabelle sono `public.s90_*`, hanno RLS e permessi per proprietario autenticato.
4. Copia `config.example.js` in `config.js` e inserisci URL e **publishable key** del progetto, mai la service role key.
5. Configura Auth email/password per utenti realmente autorizzati e testa la segregazione su due account distinti; verifica `Data API`, GRANT e policies.
6. Collauda creazione attività, scadenze e isolamento dati prima di usare dati reali.
7. Per i promemoria, distribuisci `supabase/functions/s90-reminders/index.ts` e configura segreti server privati: `SALES90_SCHEDULER_SECRET`, `RESEND_API_KEY`, `SALES90_FROM_EMAIL`. Predisponi un invocatore autenticato ogni 5 minuti (pg_cron + pg_net + Vault). **Nessuna notifica è attiva prima della configurazione**.
8. Fai test di errori, retry, deduplicazione e tracciamento consegna prima di attivare invii reali.

## Separazione del frontend e hosting
**GitHub Pages non è il backend e non è la sede raccomandata per un SaaS commerciale.**
Il repository GitHub conserva il codice. L'area privata andrà distribuita su hosting web adatto (es. Vercel) con Supabase come backend, dopo test sicurezza e autorizzazioni.
Non mettere password, API secret, chiavi service_role, contatti dei clienti, documenti riservati o indirizzi privati su GitHub.

## Stato dell'integrazione con il repository
Branch: `feature/joseph-sales-automation-90-mvp-20261025`.
Il ramo `main`, il pannello `/gestione/` e tutte le landing esistenti rimangono invariati fino a eventuale merge approvato.

## Regole professionali e privacy
- Joseph: marketing e automazione. Mediazione e trattative: agenti abilitati.
- 90 giorni = protocollo, non promessa di vendita.
- Prima dell'uso reale: validazione privacy, informativa, consensi e protocolli contrattuali.
- Dati fittizi in demo; nessun contatto reale gestito senza backend protetto.
- Nessun ad spend e nessun invio a terzi viene avviato automaticamente.

## Fasi successive prioritarie
1. Convalida migrazione SQL e integrazione Auth in ambiente staging isolato.
2. Test RLS con due account e audit dello scheduler.
3. Inserimento risposte landing e CRM lead protetto.
4. Email e notifiche ricorrenti affidabili.
5. Open House e report PDF.
6. Integrazione canali ADV e approvazioni.
7. Test end-to-end e rollout controllato.

**Note legali:** prima del go-live controllare limiti di GitHub Pages, costi e condizioni delle piattaforme, GDPR e ruolo delle persone autorizzate.
