# Registro pre-modifica e rollback — cron progetto preesistente

**Progetto:** `nqnmlsmeiynxbdojeyjt` (vecchio progetto, non il nuovo REAL MEDIA PRO).
**Autorizzazione:** utente ha approvato espressamente la modifica di soli 4 job da `10 seconds` a 1 minuto, lasciando i job attivi e senza cambiare file/tabelle/altri scheduler.

## Snapshot prima della modifica

| Job ID | Nome | Schedule iniziale | Attivo | Comando invariato | MD5 del comando |
|---|---|---|---|---|---|
| 14 | f1-radar-wave1-01 | `10 seconds` | true | `select f1_private.email_radar_cron_for('Bruzolo');` | `1cc7a464442d53ed342a858ee5569136` |
| 15 | f1-radar-wave1-03 | `10 seconds` | true | `select f1_private.email_radar_cron_for('San Giorio di Susa');` | `de46824405bd92fb379d0ee3276ecd99` |
| 17 | f1-radar-wave1-07 | `10 seconds` | true | `select f1_private.email_radar_cron_for('Caprie');` | `879223d83c2b6a852bf1f4040a35115d` |
| 18 | f1-radar-wave1-08 | `10 seconds` | true | `select f1_private.email_radar_cron_for('Sant''Antonino di Susa');` | `80d14f83d1fe94ce2d485434095eb464` |

Database, username, active prima della modifica: `postgres`, `postgres`, `true` per tutti.
Verificata firma API installata `cron.alter_job(job_id bigint, schedule text DEFAULT NULL, command text DEFAULT NULL, database text DEFAULT NULL, username text DEFAULT NULL, active boolean DEFAULT NULL)`.

## Rollback, SOLO se necessario ed espressamente richiesto

```sql
begin;
select cron.alter_job(14, schedule => '10 seconds');
select cron.alter_job(15, schedule => '10 seconds');
select cron.alter_job(17, schedule => '10 seconds');
select cron.alter_job(18, schedule => '10 seconds');
commit;
```

Verificare successivamente con `select jobid,jobname,schedule,active,md5(command) from cron.job where jobid in (14,15,17,18) order by jobid;`.

## Modifica prevista

Impostare soltanto `schedule => '* * * * *'` per i quattro job. Restano intatti SQL, ruoli, database e `active=true`.
Il passaggio da 10 secondi a 60 secondi riduce gli avvii teorici da 360 a 60 per ora per job, cioè circa **83,3%**. Non azzera il consumo Egress/Storage già fatturato e non dimostra la causa degli oltre 99 GB di traffico.

## Esiti

Da compilare con risultati verificati, non presumere che la modifica sia riuscita.

## Esito operativo verificato — 28/10/2026

- **COMPLETATO**: eseguita modifica SQL transazionale soltanto su ID 14, 15, 17, 18 usando `cron.alter_job(..., schedule => '* * * * *')`.
- **VERIFICATO**: guardia prima e dopo la modifica su ID, nome, hash del comando, database, username, attivo e pianificazione; query successiva restituisce tutti e quattro con `schedule='* * * * *'` e `active=true`.
- **VERIFICATO**: hash dei comandi invariati: 14 `1cc7a464442d53ed342a858ee5569136`; 15 `de46824405bd92fb379d0ee3276ecd99`; 17 `879223d83c2b6a852bf1f4040a35115d`; 18 `80d14f83d1fe94ce2d485434095eb464`.
- **VERIFICATO**: totale sempre 12 job, tutti attivi, 4 target al minuto e 8 job non destinatari invariati nella loro pianificazione.
- **VERIFICATO**: dopo il cambio tutti e quattro hanno registrato esecuzione `succeeded` alle `2026-10-28 06:18:00 UTC` (da `cron.job_run_details`).
- **NON ESEGUITO**: nessuna modifica a media, bucket, dati applicativi, schema, quota o credenziali; nessun upgrade.
- **NOTA**: non si può assumere che il cambio liberi le quote Supabase già superate. L'organizzazione resta soggetta al 402 fino al ripristino del provider.
