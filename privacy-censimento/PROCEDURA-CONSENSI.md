# REAL MEDIA PRO — Procedura operativa privacy per landing e contatti
**Versione di lavoro:** 27 ottobre 2026. **Stato:** bozza di implementazione, revisione e adozione necessarie prima del marketing diretto. **Titolare confermato dall'interessato:** Joseph Malafronte, persona fisica, per le attività di trattamento gestite direttamente sotto il nome commerciale REAL MEDIA PRO / Joseph Digital Strategist.
**Riferimento normativo:** GDPR UE 2016/679 artt. 5, 6, 7, 12–14, 15–22, 28, 30, 32; Codice privacy italiano art. 130; indicazioni Garante/EDPB.

## 1. Funzioni correnti e limiti reali
- Sito GitHub Pages, hosting statico: il modulo `campagne/immobiliare/valore-casa/` genera localmente una bozza di messaggio che il visitatore **decide se inviare** in WhatsApp a 371 370 8294. Il sito non registra gli inserimenti in un database. La conversazione, se inviata, resta nel servizio WhatsApp e nei dispositivi/account usati dal destinatario.
- La guida PDF `Guida_Quanto_Vale_La_Mia_Casa_Joseph_Digital_Strategist.pdf` è scaricabile subito senza form.
- **Iscrizioni marketing disabilitate**: la checkbox visibile è disattivata. I contatti provenienti dalle richieste non vengono aggiunti automaticamente ad alcuna lista pubblicitaria.
- Questo è un progetto con sito e pagine ulteriori: il controllo sopra descrive la pagina valutazione-casa, non certifica ogni landing, script, strumento di tracciamento o trattamento pregresso.

## 2. Gestione pratica di una richiesta ricevuta
1. Rispondi **soltanto alla richiesta spontanea** del mittente e al servizio esplicitamente domandato; evita offerte pubblicitarie non richieste o invii periodici.
2. Non mettere in liste marketing numeri provenienti da annunci pubblici, visure, contatti WhatsApp, scansioni di QR code, database aziendali o lead privi di prova di consenso valido.
3. Non registrare dettagli dell'immobile, nomi, numeri, messaggi o copie di documenti nel repository pubblico GitHub o nel sito statico.
4. Se condividi una richiesta con un'agenzia o altro professionista, spiega preventivamente a chi e per quale scopo sarebbe trasferita e verifica ruolo e base giuridica; non considerare tale trasferimento autorizzato solo dal contatto a Joseph.
5. Documenta separatamente eventuali opposizioni e richieste di cancellazione in un registro protetto; sospendi subito il marketing eventualmente in corso al ricevimento della revoca.

## 3. Prima di riattivare il consenso marketing (gate bloccanti)
- [x] **Identità del titolare delle attività dirette:** Joseph Malafronte, persona fisica; REAL MEDIA PRO / Joseph Digital Strategist è il nome commerciale, non un ulteriore titolare per tali attività. Email: agenziarealmediapro@gmail.com; WhatsApp: 371 370 8294; telefono: 352 202 4365.
- [ ] **Recapito postale/indirizzo professionale e ruoli di terzi:** confermare un indirizzo pubblicabile e, caso per caso, i ruoli di eventuali agenzie/clienti, contitolari e responsabili; non inventare indirizzi né attribuire automaticamente a Joseph i trattamenti di Immobiliare La Sacra.
- [ ] **Finalità e basi giuridiche:** richieste in ingresso, valutazione/mediazione effettuata da abilitati, marketing WhatsApp, email, eventuale profilazione e censimento nominativo valutati separatamente.
- [ ] **Informativa art. 13:** destinatari/categorie, eventuali trasferimenti extra SEE e relative garanzie, conservazione effettiva dei dati, conseguenze del mancato conferimento, diritti e reclamo, fonte se dati non raccolti direttamente, eventuali decisioni automatizzate quando presenti.
- [ ] **Registro trattamenti e fornitori:** hosting GitHub Pages, WhatsApp/Meta, eventuale email, cloud, CRM, strumenti advertising, Agenzia e fornitori, dati trasferiti, ruoli e accordi.
- [ ] **Consenso distinto per CANALE e FINALITÀ:** richiesta di informazioni mai condizionata; preferenza marketing sempre non preselezionata; testi approvati, finalità specifica (es. promozioni immobiliari via WhatsApp).
- [ ] **Prova documentabile:** quando (UTC), chi ha espresso il consenso, messaggio originale ricevuto, fonte, versione dell'informativa mostrata, testo della scelta, finalità e canale, eventuale revoca. Archiviazione **privata e protetta**, accesso limitato, non GitHub.
- [ ] **Revoca:** istruzioni semplici alla persona (“scrivi STOP/REVOCA a ...”), verifica e immediata esclusione dalla lista e dalla prossima campagna; conserva la prova della revoca per il tempo necessario.
- [ ] **Conservazione:** fissare termini e cancellazioni effettivamente eseguibili per richieste, contatti, registri consenso, opposizioni, documenti forniti e log, distinguendo obblighi legali.
- [ ] **Test end-to-end:** richiesta form senza consenso; download gratuito senza registrazione; messaggio WhatsApp non spedito finché l'utente non lo invia; opt-in facoltativo specifico; prova registrata in archivio privato; revoca; mobile/accessibilità.
- [ ] **Revisione privacy qualificata:** l'identità del titolare, le basi giuridiche e la correttezza del processo marketing devono essere validate prima di abilitare il flag `marketing_enabled`.

## 4. Schema registro privato
Template privo di dati personali: `privacy-censimento/registro-consensi-template.csv`. Copiarlo **fuori dal repository pubblico**, in uno spazio privato protetto con autorizzazioni e backup adeguati, prima di inserire qualsiasi dato reale.

Campi consigliati: identificativo interno non sequenziale, data/ora e fuso, prova/posizione protetta del messaggio originale, canale, finalità, versione testo legale, versione checkbox, stato consenso SI/NO/REVOCA, timestamp della revoca, metodo revoca, operatore incaricato, data di eliminazione pianificata e concreta. **Non inserire direttamente nomi, numeri di telefono, email e contenuti delle conversazioni nel repository GitHub.**

Non produrre una falsa prova: registrare *SÌ* solo dopo una manifestazione valida ed effettivamente ricevuta e solo da quando il sistema sarà attivato e l'informativa completa sarà stata mostrata.

## 5. Regola per le caption in questa fase
Ogni caption Facebook, Instagram e LinkedIn deve contenere entrambi:
- **Modulo richieste:** https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/campagne/immobiliare/valore-casa/#modulo-whatsapp
- **Download guida PDF:** https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/campagne/immobiliare/valore-casa/Guida_Quanto_Vale_La_Mia_Casa_Joseph_Digital_Strategist.pdf

Formulazione veritiera: “Compila il modulo per richiedere informazioni. Il consenso facoltativo alle comunicazioni promozionali non è ancora attivabile e l'iscrizione resta sospesa. Scarica la guida PDF gratuita senza registrazione.” Non chiedere di spuntare una casella non attiva.

## 6. Stato e responsabilità
- **Completato nel codice:** separazione richiesta/promozioni; download senza form; checkbox marketing disabilitata; link e messaggio esplicito; QA delle caption.
- **Identità individuata:** Joseph Malafronte, persona fisica, indicato come titolare delle attività dirette. **Da completare:** recapito postale di contatto, ruoli e accordi con terze parti/fornitori, tempi di conservazione realmente attuati, scelta di un archivio privato per la prova e revoca e revisione dell'informativa.
- **Non dimostrato:** conformità GDPR globale delle altre landing e campagne, trattamento di elenchi e contatti pregressi, invii marketing già eseguiti.

## 7. Fonti istituzionali
- GDPR (art. 7, 13, 28 e 32): https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX:32016R0679
- Garante — doveri e consenso: https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/8981258
- Garante — WhatsApp marketing e preventivo consenso (provv. 13 marzo 2025): https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/10120366
- EDPB linee guida 05/2020: https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_it
