# REAL MEDIA PRO — Gestione editoriale e pubblicazione, versione corretta
**Ultimo aggiornamento tecnico: 27 ottobre 2026**. Questa pagina sostituisce il workflow precedente che descriveva un generatore programmato via API.

## Stato confermato
- **Archivio brand su GitHub**: `branding/REAL_MEDIA_PRO_BRAND_IDENTITY_GITHUB.zip` (28 grafiche uniche, SHA256 `f9697dba33fb64f5fbfd08768aa408e23f10c055aea6ad293027ce7827410357`); `branding/brand.json` con palette/logo.
- **Piano editoriale**: `campagne/piani-editoriali/`. Una task ChatGPT prepara ricercando le fonti la settimana successiva, domenica mattina.
- **Grafiche e caption**: Joseph le prepara e le consegna il lunedì in ChatGPT; si effettua controllo grafico, dati, fonti, ruoli e link.
- **Costi API**: workflow GitHub Actions di generazione di immagini GPT sospeso dal calendario, solo avvio manuale; **nessuna API OpenAI necessaria** per il flusso concordato su ChatGPT Plus. Non eseguire manualmente quel workflow per creare immagini se non hai intenzione di usare la relativa API a pagamento.
- **Pubblicazione social**: non considerare mai pubblicato un contenuto fino a ricevuta autentica su Facebook/Instagram/LinkedIn; i collegamenti autorizzati e la programmazione su Meta Business Suite restano necessari.

## Regola obbligatoria per TUTTE le caption
Ogni caption Facebook, Instagram e LinkedIn contiene, in forma testuale integrale:
1. **Modulo richiesta informazioni**: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/campagne/immobiliare/valore-casa/#modulo-whatsapp
2. **Guida gratuita PDF**: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/campagne/immobiliare/valore-casa/Guida_Quanto_Vale_La_Mia_Casa_Joseph_Digital_Strategist.pdf

**Fase privacy corrente:** la scelta di consenso facoltativo a comunicazioni promozionali non è attualmente attivabile. Le caption NON devono presentarla come già selezionabile né invitare a spuntare la casella: indicare chiaramente che l'iscrizione è sospesa, mentre modulo e guida sono fruibili subito e gratuitamente. Anche su Instagram entrambi gli URL devono apparire (non cliccabili in caption; utilizzare il link in bio se configurato).

Il codice `campagne/social-engine/social_engine/caption_engine.py` applica il controllo ai testi generati via motore; il revisore dei testi manuali dovrà applicarlo anche alle caption ricevute da Joseph.

## Dati personali: flusso attuale
- Form immobiliare: prepara nel browser un messaggio WhatsApp a Joseph, che parte solo dopo una scelta e un invio manuale del visitatore. Non registra i campi in un database GitHub Pages.
- Guida gratuita: accesso immediato senza form.
- Checkbox consensi marketing: **disabled**, non registra iscrizioni. Nessuna campagna promozionale da lead provenienti dal modulo senza separata acquisizione di consenso valido, con informativa completa.
- Documento informativo attuale: [privacy-censimento](https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/privacy-censimento/), in revisione; [procedura interna](../privacy-censimento/PROCEDURA-CONSENSI.md) con checklist.
- Scheda registro CSV vuoto sul repository come template tecnico; **mai inserire dati reali nel repository GitHub pubblico**. Per prove e revoche servono un archivio privato, limiti di accesso, tempi di conservazione e procedure reali.

## Riapertura consensi promozionali — non automatica
Consentire iscrizione WhatsApp/email soltanto dopo:
1. Identificazione del soggetto giuridico e dei ruoli; indicazione di informazioni effettive ex art. 13 GDPR.
2. Verifica fornitori, conservazione, sicurezza, eventuali trasferimenti, destinatari, richieste diritti.
3. Gestione della prova di consenso (cosa, chi, quando, versione testo) in archivio privato e della revoca semplice, eseguibile.
4. Test tecnici su mobile e revisione privacy da professionista qualificato.
5. Aggiornamento coerente di landing, `branding/conversion-cta.json` e caption, SOLO DOPO approvazione.

## Limiti della verifica
I test GitHub Actions validano codice e regole minime, **non certificano conformità legale**, trattamento storico dei dati né deliverability del marketing. Non impiegare automaticamente recapiti pubblici o archivi per messaggi promozionali. La mediazione immobiliare rimane prerogativa degli agenti abilitati; Joseph si occupa di marketing e comunicazione.
