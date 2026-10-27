# Revisione statica delle landing REAL MEDIA PRO — 27 ottobre 2026

## Ambito effettivamente controllato
Sono stati letti tramite connettore GitHub 42 file HTML esistenti:
- 24 file tra `campagne/immobiliare/` e `strategie-immobiliari/`;
- 18 file in `campagne/attivita/`.
Non è stata eseguita un'analisi runtime nel browser, non sono state esaminate tutte le risorse JavaScript collegate né la configurazione tecnica dei singoli fornitori.

## Risultati del controllo statico basilare
- **Moduli HTML trovati: 2**: `campagne/immobiliare/valore-casa/index.html` e `campagne/immobiliare/vendere-seconda-casa/index.html`. Entrambi preparano una richiesta WhatsApp senza server-side form submission; richiedono monitoraggio e informativa accurata.
- **Checkbox marketing trovate: 1** nel modulo valore-casa: ora `disabled`, non preselezionata, senza registrazione di un consenso. Il secondo modulo non presenta checkbox marketing.
- **Tracce testuali dirette di Meta Pixel, Google Tag Manager, gtag e Hotjar:** nessuna nelle 42 pagine HTML lette. Ciò non dimostra che siano assenti da script esterni, risorse caricate dinamicamente, altre pagine o futuri deploy.
- **Riferimento diretto a `privacy-censimento`:** presente in 21 delle 24 pagine immobiliari, assente in `campagne/immobiliare/index.html`, `campagne/immobiliare/materiali-promozionali/index.html`, `strategie-immobiliari/index.html`. Nelle 18 landing attività non c'è un link a `privacy-censimento` nel markup HTML di base; le pagine riportano però riferimenti testuali ai servizi esterni e all'indirizzo email per le richieste privacy.
- L'assenza di link all'informativa in una pagina senza modulo non dimostra di per sé una violazione, ma indica un'opportunità per garantire informazioni accessibili quando il visitatore avvia contatti WhatsApp/email.
- Molte landing rinviano a servizi terzi: occorre verificare i ruoli effettivi dei fornitori e la presentazione dell'informativa prima del passaggio dei dati.

## Esiti correttivi già applicati
- Landing `valore-casa`: modulo e PDF restano disponibili; consenso promozionale temporaneamente disattivato; anteprima WhatsApp non dichiara un consenso acquisito.
- Landing `vendere-seconda-casa`: chiarito che l'invio WhatsApp è volontario, che non esiste newsletter automatica e che la privacy è in completamento.
- `privacy-censimento/index.html`: spiegazione separata di come funziona il modulo immobiliare; informativa marcata come provvisoria.
- `branding/conversion-cta.json`: flag di opt-in disabilitato; link form/PDF richiesti in tutte le caption.
- `privacy-censimento/PROCEDURA-CONSENSI.md`: prescrizioni operative, prove opt-in e revoca, archivio privato, verifiche prima del marketing.
- Nuovi test automatici `test_privacy_gate.py` e `test_conversion_cta.py`.

## Azioni successive (non dichiarate concluse)
1. Completare identificazione giuridica titolare, indirizzo di contatto, ruoli e fornitori.
2. Definire, applicare e verificare politiche di conservazione/cancellazione per richieste, WhatsApp, CRM, liste, censimenti immobiliari e registri consensi.
3. Condurre inventario completo di script/cookie, strumenti pubblicitari, link esterni e trattamenti reali anche su tutte le pagine non esaminate.
4. Uniformare l'accessibilità dell'informativa su tutte le landing che offrono contatti e interazioni.
5. Implementare registro **privato** e verificabile dei consensi prima di attivare un opt-in marketing; completare informativa con professionista privacy qualificato.
6. Testare gli invii e il funzionamento mobile di ogni modulo in ambiente pubblico senza dati di persone reali.

**Conclusione:** revisione statica parziale, NON audit GDPR completo o certificazione di conformità.
