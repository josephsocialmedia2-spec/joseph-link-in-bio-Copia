# CASE247 — Collaudo email individuale · Immobiliare La Sacra

Ultima verifica: 14 novembre 2026.

## Stato effettivo verificato

- Repository: `josephsocialmedia2-spec/joseph-link-in-bio-Copia`.
- Dashboard: `/gestione/email-volantini/` raggiungibile tramite link nella `/gestione/` principale.
- Supabase: progetto `qmeftxsdfeyqozwoivzo`, Edge Function `case247-flyer-mail`, **versione 2**, distribuita.
- Tabelle marketing già esistenti: `case247_mail_contacts`, `case247_mail_campaigns`. Nuove tabelle: `case247_mail_suppressions`, `case247_mail_events`; RLS attiva, permessi anon/auth revocati.
- Query di verifica: **0 destinatari di prova**, **0 campagne**, **0 campagne programmate** al momento dell'accertamento. Nessun invio reale avviato.
- Non è stato verificato un account Brevo, un mittente attivo né una casella di test designata. Non inventare questi prerequisiti.
- **Test-only**: il backend non prevede invii commerciali, ripetitivi o multi-destinatario. Le nuove campagne richiedono un solo destinatario esplicitamente impostato e il consenso registrato.
- Identità pubblica dell'email e del pannello dedicato: **Immobiliare La Sacra**. `CASE247` resta identificativo tecnico.

## Segreti richiesti, solo nel backend Supabase

Configurare in Supabase Dashboard, progetto `qmeftxsdfeyqozwoivzo` → Edge Functions → Secrets. Non inserirli in GitHub Pages né nelle richieste di assistenza.

| Nome | Significato |
|---|---|
| `BREVO_API_KEY` | API key dell'account Brevo |
| `BREVO_SENDER_EMAIL` | Email mittente registrata e verificata in Brevo |
| `BREVO_FOLDER_ID` | ID numerico cartella liste di Brevo |
| `CASE247_TEST_RECIPIENT` | Email *espressamente designata* per il collaudo e autorizzata |
| `CASE247_UNSUBSCRIBE_SECRET` | Segreto HMAC casuale di almeno 32 caratteri per link di disiscrizione |
| `CASE247_BREVO_WEBHOOK_TOKEN` | Token condiviso lungo almeno 24 caratteri per autenticazione del webhook |
| `CASE247_BREVO_WEBHOOK_ACTIVE` | `true` solo dopo la prova di ricezione webhook autenticato |
| `CASE247_PRIVACY_URL` | URL HTTPS dell'informativa effettiva del titolare dei dati |
| `CASE247_MAIL_SEND_ENABLED` | Interruttore: assente o `false` impedisce gli invii; `true` soltanto per il collaudo |

La connessione attiva del progetto Supabase non dimostra che la chiave Brevo sia già configurata. Il pannello mostra diagnostica non segreta soltanto all'amministratore autenticato.

Il mittente deve essere realmente **attivo** nella risposta Brevo `GET /v3/senders`; verificare anche autenticazione del dominio (DKIM/SPF/DMARC) nel pannello Brevo. Non alterare il logo ufficiale o dichiarare un mittente verificato senza prova.

## Webhook Brevo

Configura in Brevo → Integrations → Webhooks → Outbound, categoria Marketing Email.

- URL destinatario: `https://qmeftxsdfeyqozwoivzo.supabase.co/functions/v1/case247-flyer-mail?webhook=brevo`
- Autenticazione: token `Authorization: Bearer <CASE247_BREVO_WEBHOOK_TOKEN>` (valore solo negli archivi segreti e nel pannello Brevo).
- Eventi: `delivered`, `unsubscribe`, `spam`, `hard_bounce`, e altri di marketing se disponibili.
- Utilizzare il comando Brevo **Send test request** per verificare la ricezione e i log, quindi impostare `CASE247_BREVO_WEBHOOK_ACTIVE=true`.
- Dove disponibili, applicare anche whitelist IP ufficiali di Brevo. Le richieste senza token valido vengono rifiutate.
- Gli eventi sono registrati con hash SHA-256 univoco per evitare duplicazioni. `delivered` aggiorna il CRM per il destinatario/campagna corrispondente. `unsubscribe` e `hard_bounce` applicano soppressione permanente; nessuna riattivazione automatica.

Il provider riferisce l'evento **consegnato**; non prova lettura, apertura né posizione nella casella.

## Flusso del test

1. Configurare Brevo e sender in modo verificabile; testare il webhook e l'informativa.
2. Designare esplicitamente un indirizzo di prova e registrarlo con data, consenso e prova documentata. La semplice presenza in una rubrica non è sufficiente.
3. Nella dashboard creare una bozza. L'URL immagine/PDF è facoltativo per il **collaudo tecnico**. Se incluso, deve essere un file HTTPS del repository CASE247, accessibile e autorizzato.
4. Premere **Simula**. Il report controlla destinatario, consenso, blocchi, configurazione e modalità prova; non contatta il provider.
5. Soltanto dopo tutti i controlli premere **Programma prova**. La Edge Function verifica nuovamente consenso e blacklist Brevo, crea una lista contenente **un solo destinatario** e una campagna con `scheduledAt` documentato dalle API Brevo.
6. Brevo risponde con ID campagna, da salvare nel CRM; il sistema legge anche lo stato tramite `GET /v3/emailCampaigns/{id}`. Il provider può dare stato `scheduled` senza aver consegnato.
7. Un webhook `delivered` autentico aggiorna `delivered_at`. Se non arriva, l'esito resta sconosciuto, non dichiarare consegna.
8. Disiscrivere il destinatario tramite il link firmato presente nel messaggio oppure tramite Brevo. Il link di disiscrizione non richiede login; una pagina permette di confermare e interrompere gli invii futuri.
9. Rieseguire **Simula** su una nuova bozza per dimostrare l'esclusione. Il contatto non va riattivato.

**Non** fare clic su Programma prova in assenza di test autorizzato. Nessun avvio automatico ricorrente è configurato.

## Arresto, annullamento, diagnosi

- Arresto globale: impostare `CASE247_MAIL_SEND_ENABLED=false` nel backend. Impedisce **nuove** programmazioni, non annulla quelle già inviate al provider.
- Annullare da dashboard con il pulsante **Annulla**: se esiste un ID Brevo, il backend invia `PUT /v3/emailCampaigns/{id}/status` con `status=cancel`. Controllare l'esito reale in Brevo.
- Stato incerto: **non ritentare** l'invio; prima usare **Riconcilia** con l'ID Brevo. Un errore di rete dopo la richiesta al provider non prova che il messaggio non sia partito.
- Controllare gli eventi nelle tabelle `case247_mail_events` e `case247_mail_suppressions` con accesso amministrativo, e gli eventi Brevo.
- Se una soppressione avviene mentre il provider ha già acquisito una pianificazione, il backend prova a cancellarla. Se Brevo non conferma la cancellazione, lo stato diventa `uncertain`; verificare e fermare la campagna direttamente in Brevo.
- Non ripristinare automaticamente contatti disiscritti.
- Salvataggio della sola data nel database **non** equivale a invio. La richiesta a Brevo deve essere verificata.

## Limiti residui da collaudare

- Non è stato possibile effettuare un invio reale perché non c'è un test recipient esplicitamente designato. Non sono stati forniti accessi verificabili a Brevo.
- Verifica mobile e footer effettivo nel client email ancora da eseguire.
- Brevo genera automaticamente una versione plain text dall'HTML. La resa e il testo devono essere verificati nell'anteprima Brevo prima del collaudo reale.
- Il webhook autenticato non è dichiarato attivo sino alla ricezione di un test dall'account Brevo.
- Una soppressione tra l'ultima verifica e l'accettazione Brevo può creare una condizione di concorrenza; il test deve verificare eventuale cancellazione/blacklist presso il provider.
- Nessun invio commerciale o ricorrente deve essere abilitato in questa implementazione.

## Fonti ufficiali

- https://developers.brevo.com/reference/create-email-campaign
- https://developers.brevo.com/reference/get-email-campaign
- https://developers.brevo.com/reference/update-campaign-status
- https://developers.brevo.com/reference/get-senders
- https://help.brevo.com/hc/en-us/articles/27824932835474-Create-outbound-webhooks-to-send-real-time-data-from-Brevo-to-an-external-app
- https://help.brevo.com/hc/en-us/articles/360000486460-How-do-I-create-edit-the-plain-text-version-of-HTML-emails
- https://supabase.com/docs/guides/functions
- https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/10313574
