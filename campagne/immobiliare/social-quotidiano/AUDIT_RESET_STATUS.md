# REAL MEDIA PRO — stato ricostruzione (2026-10-27)

## Audit verificato
- Supabase Free project: nqnmlsmeiynxbdojeyjt.
- Database stimato da pg_database_size: 372108435 byte; 187 tabelle public.
- Storage: 177 oggetti; dimensione dai metadati circa 1542567148 byte (non equivale necessariamente al consumo fatturabile).
- 31 Edge Functions attive.
- Esempi di dati da proteggere: leads (~5020), properties (~2048), tasks (~2351), interactions (~2630), approval_queue (~1120).
- Repository storico open-social-scheduler: README non trovato (404); non è prova definitiva dell'inesistenza.
- Video locale VID-20261027-WA0006.mp4: H.264/AAC, 480x854, 17.57 secondi, 3540857 byte.

## Stato
- Inventario parziale: VERIFICATO.
- Backup integrale di database + Storage + Edge Functions + test di ripristino: BLOCCATO (non disponibile con gli strumenti correnti).
- Reset distruttivo: NON ESEGUITO; vietato fino a backup verificato e conferma finale sulle conseguenze.
- Collegamenti OAuth e pubblicazione reale: NON VERIFICATI.
- Scheduler di produzione: NON ATTIVO.

## Specifica
- Europe/Rome: 10:00, 16:00, 20:00 ogni giorno; tre piattaforme.
- AgentPricing: https://www.agentpricing.com/j.malafronte
- WhatsApp: https://wa.me/393713708294
- Prima di attivare: verificare quote effettive e autorizzazioni; dry-run, prova reale autorizzata, quindi attivazione.

Il file locale `REAL_MEDIA_PRO_STAGING_DRY_RUN.zip` contiene uno script offline di generazione di nove bozze al giorno; non pubblica e non accede a Supabase.
