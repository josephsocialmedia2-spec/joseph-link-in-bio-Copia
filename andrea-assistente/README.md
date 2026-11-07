# Andrea Assistente per Android

App Android privata per Galaxy S20+: agenda locale, calendari Android/Google già sincronizzati, promemoria di attività, orario scolastico, briefing mattutino e serale e lettura vocale.

## Permessi
- **Calendario**: legge gli eventi sincronizzati sul dispositivo (senza modificare Google Calendar).
- **Notifiche**: invia i promemoria locali.
- **Accesso alle notifiche** (facoltativo): salva sul dispositivo soltanto **le nuove notifiche email**, provenienti da Gmail, Outlook o Samsung Email. **Non legge tutta la casella** e non recupera vecchie email. Questo richiederebbe OAuth Gmail/Outlook con un progetto cloud e consenso.
- **Allarmi e promemoria** (facoltativo): permette avvisi puntuali; senza permesso l'orario può essere approssimativo.
- **Voce**: riconoscimento vocale fornito dai servizi Android installati; lettura tramite TextToSpeech.

## Installazione
Compilare con Gradle/Android SDK 35 oppure scaricare l'artefatto **Andrea-Assistente-APK** dalla scheda Actions del repository dopo un build riuscito. Il file nel ZIP è app-debug.apk, firmato con firma di debug (non per Play Store).
Aprire l'APK sul telefono e concedere i permessi necessari. All'installazione non sono memorizzate password Google.

## Funzioni
- Oggi e domani: eventi CalendarContract, impegni salvati e orario scolastico.
- Inserimento manuale o vocale delle attività e telefonate; completamento e cancellazione.
- Import dei dati delle nuove notifiche email autorizzate: oggetto, mittente/testo visibili nella notifica, non intero messaggio.
- Trasforma una mail in attività previa conferma dell'orario.
- Notifica mattutina (default 08:00) e serale (default 20:30) con riepilogo del giorno successivo; orari regolabili.
- Promemoria locali delle attività con scadenza e riprogrammazione al riavvio.
- Sintesi vocale "Leggi oggi" / "Leggi domani".
- Dati locali in SQLite; nessun backend, nessuna chiave API inclusa.

## Limiti
Non è un agente AI cloud e non analizza tutta la posta in arrivo. La lettura completa di Gmail/Outlook, l'interpretazione semantica avanzata delle email e la sincronizzazione multi-dispositivo richiedono una successiva integrazione OAuth sicura e un backend. La prima versione adotta regole semplici e conferma manuale prima di creare promemoria da una mail.
