# Audit quote Supabase — 28 ottobre 2026
**Solo lettura sui progetti; nessuna cancellazione, variazione di cron, upgrade o spesa.**

## Dati forniti direttamente dal proprietario (Usage, 30/09–30/10/2026)
- Organizzazione `fshyvehqjleenszxjchb`, piano Free, **tutti i servizi limitati da HTTP 402** per `exceed_cached_egress_quota`, `exceed_egress_quota`, `exceed_storage_size_quota`.
- Egress **29,827 GB** / 5 GB; Cached Egress **69,375 GB** / 5 GB; Storage Size media del ciclo **1,45 GB** / 1 GB.
- Database Size uso riepilogato **0,391 GB** / 0,5 GB (per-progetto nel dettaglio: preesistente 372,75 MB, nuovo 25,43 MB).
- Log Ingestion 2,116 GB / 1 GB, metrica futura senza enforcement fino a inizio 2027 (secondo schermata).
- Il periodo corrente è 30/09/2026–30/10/2026; il rinnovo è previsto **30 ottobre 2026**, ma il provider avvisa che lo sblocco può richiedere un ritardo.
- Le quote Egress del ciclo non vengono azzerate con la cancellazione dei file. Il costo evitato rimane **0 USD**, nessun upgrade/Spend Cap modificato.

## Accertamenti verificati attraverso strumenti collegati
- `old=nqnmlsmeiynxbdojeyjt`: 177 oggetti Storage, 1.542.567.148 byte dichiarati dai metadati.
- Per bucket: `f1-content-media` **155 file, 1444,04 MiB**; `f1-backups` **1, 16,10 MiB**; `f1-marketing-brochures` **8, 8,26 MiB**; `f1-territory-photos` **1, 1,38 MiB**; `f1-marketing-templates` **12, 1,31 MiB**.
- Per estensione: **103 PNG ≈830,8 MiB**; **62 MP4 ≈604,4 MiB**; 3 JPG ≈11,6 MiB; 8 PDF ≈8,3 MiB; un JSON ≈16,1 MiB.
- `f1-content-media`: **76 oggetti oltre 10 MiB** occupano **1038,3 MiB**; i file originali non sono stati scaricati né confrontati bit per bit, perciò non è dimostrata la loro duplicazione.
- `old` ha 12 cron attivi. I job **14, 15, 17, 18**, rispettivamente `f1-radar-wave1-01`, `f1-radar-wave1-03`, `f1-radar-wave1-07`, `f1-radar-wave1-08`, sono programmati **ogni 10 secondi**.
- Conteggi in `cron.job_run_details` per 3 giorni, **25.814 successi per ciascun job**, totale **103.256 esecuzioni**. L'intera tabella `cron.job_run_details` occupa **241 MB** e contiene **1.309.773 righe**. Nessuna schedulazione alterata.
- Nei log PostgreSQL circa **69.127 voci** del periodo recente sono associate al backend `pg_cron launcher`. Il dato segnala carico/logging ad alta frequenza, ma NON dimostra che i cron abbiano causato da soli Egress e Cached Egress.
- `new=tonwtdxjdseuizmezcht`: 0 utenti Auth, `rmp_settings.enabled=false`, zero post `PUBLISHED`; coda conservata. Nessun accesso OAuth e prova live verificati.

## Remediation (non eseguita; richiede analisi d'impatto e approvazione per modificare il vecchio progetto)
1. Verificare dipendenze e requisiti di frequenza dei quattro cron 10 s; se non essenziali a latenza di 10 secondi, richiedere approvazione specifica per **ridurne la frequenza**, con punto di rollback. Un passaggio 10 s → 1 min ridurrebbe il numero di invocazioni del singolo job di circa 6 volte; 10 s → 5 min di circa 30 volte.
2. Non cancellare lo storico `cron.job_run_details` senza politica di retention, verifica dei riferimenti, backup verificato e approvazione; il suo peso contribuisce all'utilizzo **Database**, non allo Storage dei bucket.
3. Analizzare riferimenti applicativi dei 103 PNG e 62 MP4. Individuare originali riutilizzati e versioni sovradimensionate; preparare sostituzioni compresse **soltanto con URL compatibili e backup/rollback testato**, non overwrite immediati. Per abbassare l'attuale Storage di 1,5426 GB sotto 1 GB occorre una riduzione netta >0,543 GB, meglio con margine.
4. Per attribuire i 99+ GB cumulati a provider, bucket, endpoint e giorno, utilizzare report storici di Usage/Observability e conservazione log compatibile. I log degli ultimi 24 h durante il blocco non bastano.
5. Al rinnovo 30/10 verificare consumo/limiti e sblocco HTTP 402; se persiste, controllare la causa residua e contattare supporto. NON effettuare richieste di creazione utente in loop.
6. Solo dopo sblocco e tutti i controlli OAuth/diritti/quote, riprendere l'attivazione del nuovo scheduler social. Nessun merge del PR #3 finché il worker non supera test live.

## Fonti ufficiali
- https://supabase.com/docs/guides/platform/manage-your-usage/storage-size
- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/docs/guides/platform/billing-faq

**Stato:** diagnosi e audit SOLO LETTURA completati; sblocco servizio, ripulitura, riduzione cron, OAuth e pubblicazione NON eseguiti.
