# Registro privato REAL MEDIA PRO — Istruzioni operative Windows
**Scopo:** gestire richieste ricevute e opposizioni senza inserire dati dei clienti nel sito GitHub o utilizzare API a pagamento. **Non** è un servizio online; va eseguito solo sul PC privato del titolare e non carica nulla in rete.

## 1. Installazione
1. Scarica `privacy-censimento/registro_privato.py` sul computer. Puoi anche utilizzare la cartella locale GitHub del progetto.
2. Verifica che Python sia installato: PowerShell → `py --version`. Se non presente, usa Python da una fonte attendibile e controlla le impostazioni di sicurezza.
3. Consigliato: PC protetto da account Windows con password, disco BitLocker/Crittografia dispositivo attiva e backup privati protetti. **SQLite non cifra i dati da solo.**
4. Per impostazione predefinita il file dei dati si crea **fuori dal repository pubblico** in `%LOCALAPPDATA%\REAL_MEDIA_PRO\privacy\registro.sqlite3`. Non pubblicarlo e non inviarlo in ChatGPT.

## 2. Comandi (PowerShell)
Esegui questi comandi dalla cartella principale del repository locale (NON nella pagina web GitHub). Usa sempre il recapito reale SOLO sul tuo PC, mai nel repository:

```powershell
# Inizializza e verifica
py privacy-censimento\registro_privato.py summary

# Registra una richiesta volontariamente ricevuta via WhatsApp
py privacy-censimento\registro_privato.py request --contact "+39XXXXXXXXXX" --channel whatsapp

# Chiudi una richiesta, facendo decorrere il termine proposto di riesame
py privacy-censimento\registro_privato.py close --contact "+39XXXXXXXXXX"

# Revoca / opposizione: deve impedire il marketing anche dopo la cancellazione degli altri dati
py privacy-censimento\registro_privato.py withdraw --contact "+39XXXXXXXXXX" --channel whatsapp

# Controlla lo stato di un recapito
py privacy-censimento\registro_privato.py check --contact "+39XXXXXXXXXX"

# Elenco contatti chiusi da riesaminare dopo 365 giorni (non cancella nulla)
py privacy-censimento\registro_privato.py due --days 365

# Solo dopo valutazione del caso: cancella dalla copia locale (non dalle chat/backups)
py privacy-censimento\registro_privato.py erase --contact "+39XXXXXXXXXX" --confirm-erase
```

**NON** usare il comando `consent` per iscrizioni promozionali ora: resta bloccato dal flag `branding/conversion-cta.json`. Verrà reso disponibile solo dopo informativa definitiva, revisione professionale, procedure di prova e revoca e attivazione autorizzata.

## 3. Cosa questo strumento NON fa
- Non importa automaticamente le chat WhatsApp; i dati vanno annotati dal titolare.
- Non manda WhatsApp, SMS, email né pubblicità.
- Non modifica la rubrica del telefono, le chat o i backup, quindi la cancellazione negli altri sistemi è a carico del titolare.
- Non verifica automaticamente che un consenso sia legalmente valido, né certifica GDPR.
- Non cifrerà il file SQLite a riposo; è necessaria la protezione effettiva del PC e della cartella.
- Non programma da solo la revisione: esegui `due --days 365` su base mensile e documenta le cancellazioni conseguenti.

## 4. Campi e prove (fase futura)
Quando l'iscrizione promozionale verrà autorizzata, conservare separatamente la prova **originale ricevuta** dell'opt-in, la versione dell'informativa, il canale e la finalità, la data/ora, la revoca. Non considerare prova la semplice presenza di una checkbox nel browser o un contatto WhatsApp spontaneo. Il programma impedisce `consent` finché il gate è chiuso.

## 5. Fonte delle regole e revisione
Leggi `privacy-censimento/TRATTAMENTI-FORNITORI-E-CONSERVAZIONE.md` e `privacy-censimento/PROCEDURA-CONSENSI.md`; la politica di conservazione proposta di 12 mesi per richieste chiuse è **una proposta da approvare e attuare**, non un obbligo legale generale e non un automatismo già operativo. I dati fiscali, documenti d'incarico e contenziosi possono richiedere tempi diversi.

## 6. Problemi comuni
- Errore `REFUSED ... OUTSIDE ... GitHub repository`: il database è nella cartella pubblica; usa il percorso predefinito o uno privato.
- Errore `BLOCKED ... marketing`: comportamento corretto, l'opt-in non è ancora autorizzato.
- Errore `py non riconosciuto`: Python non è installato o non è presente nel PATH.
- Un contatto chiede STOP: esegui subito `withdraw`, annota la richiesta originale privatamente e non inviare altre promozioni; rispetta anche i messaggi già presenti sulle piattaforme effettive.
