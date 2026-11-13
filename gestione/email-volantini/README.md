# CASE247 · Distribuzione volantini email

## Stato verificato
- Dashboard: `/gestione/email-volantini/`.
- Edge Function distribuita: `case247-flyer-mail` nel progetto Supabase `qmeftxsdfeyqozwoivzo`.
- Database: `public.case247_mail_contacts` e `public.case247_mail_campaigns`, entrambe protette con RLS senza permessi per `anon` e `authenticated`.
- Servizio email: API **Brevo Marketing Campaigns**, non SMTP transazionale.
- **Invio bloccato se mancano API key, mittente verificato, cartella Brevo e contatti con consenso valido.**
- Nessuna email è stata inviata nel processo di installazione.

## Attivazione del provider (una sola volta)

1. Nella piattaforma Brevo verifica un mittente e il dominio, configura SPF/DKIM e crea una cartella per le liste CASE247. Ricava l'ID numerico della cartella.
2. Genera una chiave API Brevo e conserva la chiave soltanto nei segreti del progetto Supabase. Nel Supabase Dashboard apri **Edge Functions → Secrets** sul progetto `qmeftxsdfeyqozwoivzo`.
3. Configura i quattro segreti usando i valori reali dell'account:
   - `BREVO_API_KEY`: API key di Brevo
   - `BREVO_SENDER_EMAIL`: indirizzo mittente verificato
   - `BREVO_FOLDER_ID`: identificativo numerico cartella Brevo
   - `BREVO_SENDER_NAME`: nome del mittente (facoltativo)
4. Apri `https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/email-volantini/`, accedi con amministratore Supabase già autorizzato in `case247_admins`.
5. Registra un contatto di prova soltanto se il consenso è documentato, usando data e prova di consenso reale. Non utilizzare indirizzi raccolti da directory o siti senza base giuridica valida.
6. Crea una bozza per **Privati** o **Aziende**, scegliendo un URL pubblico approvato JPEG/PNG/PDF del repository CASE247 e una data futura di almeno 15 minuti.
7. Usa **Programma in Brevo**. Il backend crea una lista per la campagna, controlla blocchi del provider, sincronizza i contatti ammissibili e programma la campagna Brevo. Da quel momento non serve che la dashboard resti aperta.

## Sicurezza e conformità
- Le richieste richiedono un access token Supabase valido e corrispondenza con la tabella `case247_admins`.
- Le operazioni amministrative sono svolte esclusivamente nella Edge Function con credenziali server-side.
- Le tabelle dei contatti non sono accessibili direttamente dal browser o tramite API pubbliche.
- Ogni contatto registra settore, data, prova del consenso e versione privacy. L'importazione non può riattivare un contatto precedentemente disiscritto.
- Brevo include il collegamento di disiscrizione marketing tramite `{{ unsubscribe }}` e gestisce l'email blacklist.
- L'esclusione nella dashboard esclude il contatto dalle campagne **future**; se una campagna è già programmata sul provider, interrompere/rimuovere anche quel contatto in Brevo.
- Verificare prima di usare in produzione: titolare del trattamento, informativa, conservazione, registro consensi, contratto responsabile con Brevo, provenienza dei dati e giurisdizione.

## Limitazioni attuali
- La demo non include un modulo pubblico di double opt-in: il contatto viene registrato solo dall'operatore che dispone della prova di consenso.
- La sincronizzazione col provider è limitata a meno di 500 contatti per campagna per impedire invii parziali non controllati. Per segmenti più grandi va implementata paginazione idempotente.
- Le email di mancata consegna e disiscrizione intervenute su Brevo dopo la pianificazione devono essere riconciliate con webhook prima di considerare completo il CRM.
- Il frontend visualizza fino a 100 contatti e campagne recenti. Nessun invio indiscriminato automatizzato è abilitato.
- Se l'API Brevo non è ancora collegata, la creazione delle bozze funziona ma la programmazione restituisce un errore esplicito.

## File
- `gestione/email-volantini/index.html`: pannello amministrativo
- `supabase/functions/case247-flyer-mail/index.ts`: API sicura di amministrazione e scheduling
- Le tabelle PostgreSQL sono state create sul progetto Supabase operativo tramite migration `case247_flyer_email_marketing`.

## Stato di pubblicazione
Le grafiche su `/campagne/case247/auto-feed/review/` e l'archivio editoriale sono la fonte delle creatività; le email hanno un calendario indipendente. Creare una bozza non equivale a inviare email. L'ID della campagna Brevo e lo stato sono memorizzati in Supabase.
