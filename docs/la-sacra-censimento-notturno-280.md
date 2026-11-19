# Immobiliare La Sacra | Censimento notturno Avigliana 20 km

**STATO DAL 19/11/2026: RICERCA AUTOMATICA SOSPESA SU RICHIESTA DELL'UTENTE.** Il workflow non ha più un trigger `schedule` né un job di raccolta. La dashboard contiene ora il pulsante **Partita IVA Avigliana · Apri Google**, che apre manualmente la ricerca `https://www.google.com/search?q=partita+iva+avigliana`. Le istruzioni sottostanti descrivono soltanto il funzionamento storico; i vecchi artefatti cifrati rimangono consultabili secondo la conservazione prevista da GitHub.


## Stato tecnico

Ricerca programmata alle **23:00 Europe/Rome** (cron GitHub UTC 21:00/22:00, filtro automatico fuso e ora legale). Il job si svolge all'interno della finestra fino alle **03:55**, massimo cinque ore e **280 attivita nuove per notte**. Se trova meno risultati, crea un lotto ridotto: mai record inventati.

L'esecuzione non invia email. Il limite di 280 e **numero di schede aziendali per lotto**, non numero garantito di partite IVA o email.

## Archivio dei dati

I repository accessibili all'app GitHub risultano **pubblici**. Non pubblicare qui CSV, XLSX o recapiti in chiaro. Il processo:

1. Consulta OpenStreetMap/Overpass per 16 settori dell'area e filtra ogni punto con Haversine entro 20 km dalle coordinate 45.0800, 7.3980.
2. Recupera ragione sociale, indirizzo, sito, contatti pubblici e prova a riscontrare partita IVA sulle pagine aziendali, rispettando robots.txt. I campi non trovati restano vuoti; il solo checksum non conferma la posizione fiscale.
3. Deduplica per ID OSM, scorre i 4 quadranti e limita il lotto a 280 schede.
4. Produce **Excel con foglio LOTTO 280** (nome, partita IVA, email, telefono, comune e indirizzo in prima posizione), riepilogo, CSV e file campagna idonei (inizialmente vuoto).
5. Cifra il pacchetto ZIP con AES-256-GCM e RSA-OAEP usando **solo la chiave pubblica** `config/la-sacra-census-public.pem`.
6. Carica solo `.case247` come artefatto GitHub Actions, durata 90 giorni.
7. Registra in `state/la-sacra-av20-processed.json` soltanto identificativi OSM e impronte SHA-256 delle aziende trattate, senza email, telefoni o partite IVA in chiaro.

## Scaricare il lotto quotidiano

Aprire **Actions** → **LA SACRA - Ricerca notturna 23-04 - 280 aziende giornaliere** → ultima esecuzione → **Artifacts** → `LA-SACRA-CIFRATO-<ID>`.

Conservare la **chiave privata fornita separatamente** e non caricarla mai su GitHub, in chat pubbliche o in sistemi esterni.

Per decifrare sul proprio PC:

```bash
python -m pip install cryptography==46.0.4
python scripts/decrypt_la_sacra_batch.py LA_SACRA_AV20_2026-11-17_280.case247 --key LA_SACRA_CHIAVE_PRIVATA_NON_CARICARE_SU_GITHUB.pem --out lotto_2026-11-17.zip
```

Il file ZIP ottenuto contiene un foglio Excel con massimo 280 aziende, CSV, riepilogo e `CAMPAGNA_AUTORIZZATI.csv` inizialmente vuoto.

## Campagna email

**Non attiva.** Le email reperite pubblicamente non attestano consenso marketing. Per l'import automatico su un provider occorre attivare un connettore sicuro, mittente verificato, archivio autorizzazioni e gestione opposizioni/disiscrizioni. Non usare Hotmail personale per 280 invii massivi. Il batch notturno resta una base di ricerca, non una lista marketing autorizzata.

## Verifiche, limiti e trasparenza

- Fonte: OpenStreetMap, attribuzione e licenza ODbL. Non e un censimento ufficiale delle partite IVA.
- Dati di fonte OSM/siti aziendali, verifica ufficiale partita IVA separata e non simulata.
- Alcune aziende possono non comparire in OSM o non avere dati di contatto.
- Il scheduler GitHub Actions e **best effort**, può subire ritardi o mancate esecuzioni; controllare esiti nel tab Actions.
- I dati rimangono cifrati anche se l'artifact e visibile su un repository pubblico, fintanto che la chiave privata e custodita.
- Lo stato iniziale contiene 329 ID OSM derivati dagli archivi gia disponibili, per evitare di riciclare quei record nel primo lotto; nessuna email o telefono di tali archivi e stata pubblicata.
- Le esecuzioni duplicate dello stesso giorno vengono ignorate tramite stato. Gli artifact decadono dopo 90 giorni, scaricarli periodicamente.

**Nessun uso di TinyFish e Supabase.**
