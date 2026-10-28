# REAL MEDIA PRO — audit operativo 27 ottobre 2026

## Stato della missione
Audit parziale: VERIFICATO. Backup integrale e ripristino: BLOCCATO.
Reset, ricostruzione in produzione, pubblicazione e attivazione: NON ESEGUITO.

## Misure rilevate tramite connettore Supabase
- Progetto nqnmlsmeiynxbdojeyjt: ACTIVE_HEALTHY; PostgreSQL 17.6.1.166.
- Organizzazione: piano free verificato.
- Database: 372198547 byte al momento della lettura.
- Tabelle public: 185 (il precedente riferimento a 187 non è confermato).
- Policy RLS complessive: 464.
- Utenti Auth: 4.
- Migrazioni registrate: 176.
- Storage: 11 bucket, 177 oggetti; 1542567148 byte secondo i metadati, non misura del consumo fatturato.
- Edge Functions: 31, tutte restituite ACTIVE.
- Cron: 12 job attivi; quattro hanno frequenza 10 seconds.
- cron.job_run_details occupa 249184256 byte, indici inclusi.
- Conteggi esatti: leads 5020; properties 2048; tasks 2351; interactions 2629; approval_queue 1120.
- Catalogo tabelle letto per gli schemi non di catalogo; reltuples è una stima, non conteggio esatto per tutte le tabelle.
- Estensioni installate: http 1.6, pg_cron 1.6.4, pg_net 0.20.4, pg_stat_statements 1.11, pg_trgm 1.6, pgcrypto 1.3, plpgsql 1.0, supabase_vault 0.3.1, uuid-ossp 1.1, vector 0.8.2.

## Dipendenze e impatto
Esistono risorse CRM, campagne, contenuti, email, territorio, casefamiglia, empatia e marta.
L'elenco completo delle applicazioni esterne dipendenti NON è verificato.
Un reset potrebbe interrompere acquisizione contatti, CRM, accesso ai media, campagne e automazioni esistenti.
Nessun job è stato disattivato e nessuna risorsa Supabase modificata.

## GitHub
caption-master.md e automation-config.json: letti e verificati.
open-social-scheduler: get_repo restituisce 404; può essere assente o non accessibile al connettore.
Configurazione richiesta confermata: Europe/Rome, 10:00 / 16:00 / 20:00, Facebook / Instagram / LinkedIn.

## Blocco backup
La dashboard nel browser disponibile richiede il login.
I comandi supabase, pg_dump, docker e gh non risultano presenti nel PATH del runtime.
Non è stata stabilita una connessione PostgreSQL diretta autenticata né un canale di download completo dello Storage privato.
Il connettore SQL consente l'inventario ma l'inventario non costituisce backup.
Non è stato creato BACKUP_SUPABASE_PRE_RESET_REAL_MEDIA_PRO.zip.
Non è stata effettuata una prova di ripristino.
Non sono stati esportati valori di secrets o credenziali.
Il prossimo passaggio è autenticare la dashboard, poi verificare una via di esportazione e ripristino completa; il login da solo non garantisce il backup.

## Attività ancora da eseguire
- Inventario completo con conteggi esatti per ogni tabella, definizioni, trigger, indici, policy, webhook, secrets (solo nomi) e dipendenze esterne.
- Backup database, Storage, sorgenti Edge Functions, Auth esportabile e configurazioni; checksum e prova isolata.
- Conferma esplicita prima del reset, inclusione separata degli utenti Auth.
- Nuova infrastruttura, dashboard protetta e integrazioni OAuth.
- Video: dati presenti nel precedente audit, NON ricontrollati in questa esecuzione.
- Quote residue: NON VERIFICATE. Nessun upgrade o acquisto eseguito.
- Test automatici e dry run della nuova infrastruttura: NON ESEGUITO.
- Facebook / Instagram / LinkedIn: autorizzazioni API NON VERIFICATE.
- Prova reale e attivazione finale: NON ESEGUITO; richiedono le autorizzazioni previste dall'utente.

La documentazione ufficiale consultata per il backup è https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore .


## Avanzamento esportazione senza browser
- COMPLETATO: recuperati i file sorgenti restituiti per tutte le 31 Edge Functions.
- COMPLETATO: esportati cataloghi con 244 tabelle non di catalogo, 3415 colonne, 939 vincoli, 719 indici, 464 policy, 74 trigger, 186 funzioni/procedure applicative e 176 migrazioni.
- COMPLETATO: conteggi esatti per 244 tabelle, effettuati su database attivo senza snapshot comune.
- COMPLETATO: manifest 11 bucket/177 oggetti; non contiene i byte dei file Storage.
- VERIFICATO: archivio parziale di 45 file, 603796 byte, CRC e SHA-256 verificati dopo rilettura.
- SHA-256 ZIP: 1e666cc23e8a6a6df2ec2522770740a706b0ce78632f9968ebfb4a525f5ca337.
- Nome: ESPORTAZIONE_PARZIALE_SUPABASE_20261027.zip. Archivio conservato separatamente dal repository, non pubblicato su GitHub Pages.
- BLOCCATO: dump dati completo e download Storage privato, in assenza di un canale autenticato utilizzabile da client PostgreSQL/Storage.
- NON ESEGUITO: prova di ripristino, reset e ricostruzione di produzione. L'integrità dello ZIP non equivale a ripristinabilità del progetto.


## Verifica backup esistenti — 28 ottobre 2026
- VERIFICATO: database 375229587 byte; 177 oggetti Storage; 12 job attivi.
- VERIFICATO: le ultime cinque registrazioni f1_backup_runs (23–27 ottobre) sono NON_VERIFIED, byte_size 0, created_at e verified_at null. Non dimostrano backup utilizzabili.
- VERIFICATO: il bucket f1-backups contiene un solo oggetto, datato 5 ottobre, 16887005 byte secondo i metadati. Contenuto e ripristinabilità NON VERIFICATI; non è un backup attuale del progetto.
- VERIFICATO: snapshot interni joseph_crm.daily_backups disponibili fino al 27 ottobre, record_count 300. Conservati nello stesso database, non costituiscono un backup integrale esterno.
- COMPLETATO: censiti due nomi di secrets Vault, senza leggere valori. Non equivale all'inventario dei secrets Edge Functions.
- BLOCCATO: backup completo e prova di ripristino. Nessuna modifica Supabase o cancellazione eseguita.


## Ripresa operativa — 28 ottobre 2026, verifica SQL 05:05 UTC / 06:05 Europe/Rome
- VERIFICATO: riletti rapporto, caption-master.md e automation-config.json tramite GitHub.
- VERIFICATO: connettore Supabase operativo; progetto ACTIVE_HEALTHY, PostgreSQL 17.6.1.166; organizzazione free.
- VERIFICATO: database 375254163 byte, Storage 177 oggetti / 11 bucket, Auth 4 utenti, cron 12 job attivi. Nessuna modifica alla produzione.
- VERIFICATO: sistema operativo Windows confermato dall'utente in questa sessione.
- VERIFICATO: Library individua il video VID-20261027-WA0006.mp4 (3540857 byte) e lo ZIP parziale (603796 byte). In questa ripresa non sono stati riletti i byte: checksum, codec, audio e diritti del video restano da verificare.
- VERIFICATO: workflow social esistente avviabile solo manualmente; contiene generazione OpenAI e pubblicazione social opzionale. NON avviato. Il workflow CI su push filtra percorsi diversi da questo rapporto.
- BLOCCATO: autenticazione client PostgreSQL e download Storage privato non stabiliti. Accesso dashboard sul computer dell'utente ancora da verificare; nessun nuovo tentativo nel browser condiviso.
- NON ESEGUITO: dump completo, download Storage, ripristino isolato, reset, deployment e pubblicazioni.
- BLOCCATO: quote residue effettive non disponibili dai controlli eseguiti; piano free non equivale a disponibilità illimitata.
- Prossimo passaggio: aprire sul computer Windows la dashboard del progetto e il pannello Connect; riferire solo se è visibile, senza condividere stringhe o credenziali. Eventuale login esclusivamente nel browser locale dell'utente.
- Consultata documentazione ufficiale Backup and Restore using the CLI: prevede client, credenziali database e gestione separata delle personalizzazioni auth/storage e della cronologia migrazioni. Nessun reset password autorizzato o eseguito. Il changelog markdown non è stato recuperato dal lettore web (content-type non supportato); ricontrollare prima dell'implementazione.
- BACKUP_SUPABASE_PRE_RESET_REAL_MEDIA_PRO.zip non creato: non assegnare tale nome all'esportazione parziale.

## Implementazione isolata — 28 ottobre 2026, ramo non predefinito

- COMPLETATO: creato il ramo `feature/rmp-social-isolato-20261028` senza modifiche al ramo `main` o al Supabase `nqnmlsmeiynxbdojeyjt`.
- COMPLETATO: realizzati file in `campagne/immobiliare/social-quotidiano/rmp-isolato/` (coda, RLS, programmatore, worker API, dashboard, CI, rapporto).
- VERIFICATO: recuperato originale 3.540.857 byte, H.264 480×854/30fps, AAC 44,1kHz; hash `24148c620f19747ffc7cb8a865680e19b40411ac1d21d3fa2288b8c552fe97cb`.
- COMPLETATO: normalizzato localmente MP4 540×960, H.264 30 fps, AAC 48kHz, 2.542.302 byte; hash `eede47a5ded2c52e344c5f834aa6a6be958674531fd552aa8c306058dace9fc1`. Nessun video inserito in Storage.
- VERIFICATO: test CI di logica e calendario eseguiti sul ramo, ma non dimostrano OAuth, RLS applicata o pubblicazioni reali.
- BLOCCATO: licenze e diritti materiali non provati; account Facebook/Instagram/LinkedIn e OAuth non verificati tramite credenziali reali; quota provider non misurata; nuovo Supabase gratuito non verificato.
- NON ESEGUITO: SQL su nuovo progetto, hosting dashboard, pubblicazione prova, link post, attivazione schedulazione.
- DETTAGLI: `rmp-isolato/AUDIT_IMPLEMENTAZIONE_20261028.md` e `rmp-isolato/README.md`. Nessuna autorizzazione a resettare il Supabase preesistente.
