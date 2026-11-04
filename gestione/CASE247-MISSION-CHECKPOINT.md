# CASE247 — Audit e checkpoint operativo

Verifica: 2026-11-04. Fonte: branch main, file del repository letti direttamente.

## Stato verificato
- 41 comuni configurati in `config/case247-territorio.json`.
- 41 destinazioni territoriali in `gestione/social-routing.json`.
- Pubblicazione automatica territoriale disabilitata (`territorial.auto_publish=false`).
- 44 bozze in `campagne/case247/territorio/bozze.json`, pubblicazione automatica disabilitata.
- 58 immobili nel catalogo `immobili/catalogo.json` (numero di record, non disponibilità verificata individualmente).
- Workflow B2B Meta presente: `.github/workflows/case247-b2b-meta.yml`; scheduling condizionato da `CASE247_B2B_SCHEDULE`, credenziali in secrets, test e modalità dry-run previsti. Non prova che l'invio sia attivo o riuscito.

## Blocchi e sicurezza
- Non risultano verificati da questo audit i collegamenti Facebook/Instagram, il controllo degli account, i permessi di pubblicazione e i token per ogni comune.
- Non attivare automaticamente i 41 canali né pubblicare le 44 bozze senza verifica destinazioni, autorizzazioni e contenuti.
- GitHub Pages non può custodire credenziali né dati CRM privati; upload video e CRM richiedono un backend protetto.

## Piano di implementazione
1. Censire account Meta reali per comune e verificare controllo, Page ID, IG User ID, autorizzazioni e collegamenti.
2. Definire backend autenticato e storage video; creare endpoint upload, validazione, selezione comune/immobile e coda idempotente.
3. Integrare pubblicazione ufficiale Meta con rate limit per account, retry limitati, audit log e quarantena per errori permanenti.
4. Integrare nel pannello gestione i moduli Video, Calendario, Social, Immobili, CRM e Centro errori senza esporre dati sensibili.
5. Testare end-to-end un solo comune autorizzato; poi attivare progressivamente gli altri.
6. Attivare report settimanale basato su metriche effettivamente disponibili.

## Ripresa
Prossima azione: ispezionare il backend e i workflow esistenti, quindi implementare il primo modulo non distruttivo con test. Mantenere `auto_publish=false` finché non esiste prova di collegamento e pubblicazione autorizzata. Nessun servizio persistente nuovo è stato attivato da questo audit.
