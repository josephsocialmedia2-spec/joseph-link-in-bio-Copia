# PROCEDURA DI MANTENIMENTO — JOSEPH GDPR CONTROL

**Versione:** 24/10/2026. **Stato:** piano operativo, non certificazione.

## Prima di modificare o creare una landing
1. Aprire branch dedicato, evitare cambi diretti a `main`.
2. Registrare nuova pagina/servizio nel censimento.
3. Identificare se vengono raccolti dati, da chi, per quale finalità, tramite quale fornitore e per quanto tempo.
4. Verificare link all'informativa corretta; per form, informazione tempestiva; per dati indiretti, obblighi art.14.
5. Non inserire nuovi form, Pixel, analytics, embed o CRM senza revisione documentata e base giuridica.
6. Non aggiungere dati personali o token al repository pubblico.
7. Eseguire `python scripts/gdpr_guard.py` e la CI di PR; leggere CSV e riepilogo.
8. Se la modifica cambia finalità, fornitori, base giuridica o dati, ottenere revisione professionale documentata prima del merge.

## Dopo ogni modifica
- Il controllo GitHub Actions di questo PR (se approvato e mergiato) esegue verifiche su push e giornaliere; gli esiti sono artifact tecnici (non parere legale).
- Risolvere alert critici prima della messa online; aprire issue tecniche, ma non pubblicare dati personali nei ticket.
- Conservare versioni dell'informativa e registro delle decisioni in posizione con accesso controllato.
- Effettuare verifica in browser: richieste di rete, link, rendering, accessibilità, eventuali cookie e moduli.

## Configurazione GitHub da effettuare manualmente come amministratore
- Settings > Branches / Rulesets: proteggere `main`, richiedere Pull Request e status check `gdpr-static-preflight`, più revisione di persona autorizzata.
- Non è stato possibile configurare questa protezione via connettore. Fino alla sua attivazione, i workflow non impediscono necessariamente push diretti a `main`.
- Verificare permessi Actions e limitare segreti; `persist-credentials: false` e permesso `contents: read` già previsti dal workflow proposto.

## Gestione criticità delle pagine già pubblicate
Classificare criticità per gravità e trattamento concreto. Valutare tempestivamente contenimento, eventuale disattivazione della funzione interessata, revisione informativa, gestione diritti e, quando ricorrono le condizioni, obblighi di data breach (artt. 33-34 GDPR). Non eliminare informazioni e non dichiarare una violazione senza verifica.

## Firma e validazione
Il consulente privacy deve identificare versione esaminata, ambito, data, conclusioni e prescrizioni. Fino ad allora lo stato è `IN ATTESA DI VALIDAZIONE`. Una check automatica non può modificare questa qualifica.

## Priorità operative
**P0:** evitare raccolte nominative/campagne senza base giuridica provata; verificare informazioni e ruoli effettivi.  
**P1:** finalizzare informativa e contatti titolare, intervenire su 32 pagine informative con hyperlink assente.  
**P1:** rivedere strumenti CRM e dashboard pubblica con note locali.  
**P2:** verificare runtime e altri 94 file HTML account; classificare pubblico/privato/test.
