# CASE247 — Audit due quadri (16 novembre 2026)

## Allegati
- Allegato 1: “Siti e strumenti esistenti” + indice branch GitHub, 76 branch nello snapshot fornito.
- Allegato 2: dashboard di regia social, rete territoriale, materiale editoriale e riepilogo Meta.

## Perimetro verificato
- L'albero del repository `main` include i percorsi HTML interni principali dei due quadri.
- Il nuovo quadro strumenti distingue HTTP raggiungibile da funzione applicativa realmente collaudata: solo la prima condizione può essere verificata nel browser pubblico con il pulsante “Verifica pagine”.
- Il nuovo quadro territoriale mostra lo stato del registro di configurazione, non un'autenticazione live Meta.
- Il vecchio pannello e gli accessi duplicati sono nascosti dall'interfaccia iniziale ma recuperabili per audit e per evitare rotture; nessun dato è stato distrutto.
- Nuovi test automatici: link relativi, parsing JS, accesso ai due quadri dalla dashboard e divieto di dichiarare Meta live senza conferma.

## Problemi confermati
1. `config/case247-territorio.json` censisce **42** comuni, mentre due suite CI preesistenti ne richiedono **41**: failure dei test `test_case247_social_41.py` e `test_case247_avigliana_pilot.py`. La UI nuova non promette più 41 senza leggere il registro.
2. Le due suite cercano `CASE247_TERRITORIAL_ACCOUNTS_JSON` nel workflow `case247-territorial-publisher.yml`, mentre il workflow presente utilizza un percorso di pubblicazione diverso, con i propri gate. Non si deve ripristinare una variabile o rimuovere un gate solo per far passare un test.
3. L'allegato social espone diagnosi Meta HTTP 401 (token scaduto o non valido) **datata 9 novembre 2026**: non è prova dello stato corrente.
4. Dai dati allegati risultano zero coppie FB/IG territoriali verificate, pubblicazione territoriale non attivata. Non etichettare le pagine come attive.
5. Il tentativo di apertura esterna delle pagine GitHub Pages in questa sessione non è riuscito: impossibile certificare comportamenti visuali, autenticazione, invio social, esportazione PDF o salvataggio dati.

## Decisioni
- Conservare tutte le fonti e le automazioni, nascondendo dalla vista quotidiana i moduli legacy e i collegamenti duplicati.
- Non eliminare un'app perché non è accessibile a un tester non autenticato.
- Non creare nuovi account social o attivare publisher.
- Prima della fusione: completare QA browser e verificare che non vi siano regressioni del Control Center.
