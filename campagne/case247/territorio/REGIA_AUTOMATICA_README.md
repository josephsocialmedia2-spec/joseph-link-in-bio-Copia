# CASE247 — Regia territoriale automatica (fase tecnica)
Data: 2026-11-11. I contenuti non vengono pubblicati da questo modulo.
## Collegamenti e stato
- Origine: immobili/catalogo.json, sincronizzato da scripts/sync_sacra_catalog.py
- Territori: config/case247-territorio.json, 41 landing
- Grafiche: campagne/case247/dietro-le-quinte/manifest-60.json
- Pianificazione: scripts/case247_territorial_regia.py
- Output tecnico: campagne/case247/territorio/regia-plan.json
- Controllo quotidiano: .github/workflows/case247-territorial-regia-18.yml
## Vincoli
- Una sola uscita di ogni annuncio al giorno sull'intera rete FB+IG.
- Distanza geografica massimo 20 km da coordinate dell'immobile a coordinate del comune della landing.
- Senza coordinate verificate la destinazione rimane bloccata; il solo centro del comune dell'immobile non dimostra il raggio reale.
- Si usano esclusivamente canali con URL, status CONNESSO/VERIFICATO/ATTIVO e auto_publish=true.
- Post immobiliari negli slot 00:00, 08:00, 16:00; grafiche negli slot 04:00, 12:00, 20:00. Capacità massima, non pubblicazioni forzate.
- Nessun post viene pubblicato da questo workflow.
## Dipendenze ancora da completare
1. Popolare config/case247-verified-coordinates.json con coordinate geografiche effettivamente verificate per le destinazioni e geocodificare gli immobili con sufficiente precisione; non indovinare coordinate.
2. Collegare con autorizzazione ufficiale le Pagine Facebook e Instagram territoriali; la configurazione corrente segna le 41 pagine come non collegate.
3. Integrare il dispatcher Metricool per prenotare/modificare/ritirare post futuri e riconciliare provider ID, media hash, prezzo e disponibilità.
4. Integrare le grafiche sintetiche dopo controllo diritti, QR, privacy, etichettatura IA.
5. Testare la pubblicazione reale e i report degli esiti, senza toccare programmazioni già esistenti.
## Garanzia
Lo stato PLAN_ONLY_NO_SOCIAL_API_CALL NON significa SCHEDULED o PUBLISHED.
