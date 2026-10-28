-- REAL MEDIA PRO | 45 landing x 3 canali = 135 bozze differenziate.
-- Partenza calendario: 29 ottobre 2026, 10:00 / 16:00 / 20:00 Europe/Rome.
-- Sicurezza: tutte DRAFT, nessuna chiamata alle API social.
-- Idempotenza su idempotency_key, non sovrascrive bozze o modifiche esistenti.
BEGIN;
WITH editorial(seq,page_id,question,answer,action) AS (
 VALUES
  (1,'PARTNER','Qual è il partner commerciale immobiliare di REAL MEDIA PRO?','Immobiliare La Sacra è il partner commerciale: i suoi agenti abilitati gestiscono mediazione, valutazioni e trattative. Joseph Digital Strategist cura marketing e contatto promozionale.','Contatta Joseph su WhatsApp 371 370 8294 per informazioni sul percorso promozionale.'),
  (2,'HOME','Perché una strategia territoriale aiuta la vendita?','Una campagna coordinata collega il messaggio al territorio e ai servizi del partner commerciale Immobiliare La Sacra.','Collega pagina, pubblico e richiesta di informazioni.'),
  (3,'STRATEGIE','Come organizzare marketing e incarichi?','Le 23 strategie collegano richieste, appuntamenti, incarichi, promozione e analisi.','Assegna a ogni strategia un obiettivo e un indicatore.'),
  (4,'SCOPRI','Come trovare informazioni e guide utili per le attività locali?','Scopri il catalogo dei percorsi di REAL MEDIA PRO per imprese e promozione immobiliare.','Consulta la guida e contattaci per una proposta personalizzata.'),
  (5,'CREATIVE','Come coordinare volantini A5 e banner?','Un messaggio coerente tra stampa, social e landing rende riconoscibile la campagna.','Controlla margini, grafica e QR prima della stampa.'),
  (6,'COM01','Come ottenere più richieste per un ristorante?','Menu, atmosfera e occasioni vanno raccontati con un contatto immediato.','Crea un percorso chiaro dalla foto alla richiesta.'),
  (7,'IMM-HUB','Quale domanda affrontare prima di vendere casa?','Le 21 guide raccolgono temi diversi, dalle valutazioni ai documenti e alla promozione.','Apri la guida che risponde alla tua esigenza.'),
  (8,'COM02','Come valorizzare le ore tranquille del bar?','Colazioni, pranzi e aperitivi parlano a pubblici differenti.','Promuovi una proposta reale per una fascia specifica.'),
  (9,'IMM01','Quanto vale la mia casa?','Contano microzona, caratteristiche e confronti pertinenti: OMI non equivale a stima puntuale.','Descrivi l''immobile e chiedi un primo orientamento.'),
  (10,'COM03','Come ottenere ordini di torte personalizzate?','Esempi, porzioni e tempi minimi aiutano richieste più precise.','Chiarisci modalità, tempi e contatti.'),
  (11,'IMM02','Vendere casa in Valle di Susa è uguale in ogni Comune?','Ogni microzona ha caratteristiche e domanda proprie.','Valuta zona, tipologia e punti di forza reali.'),
  (12,'COM04','Come far conoscere le nuove collezioni?','Novità, abbinamenti e disponibilità meritano una comunicazione dedicata.','Coordina vetrina, social e richieste.'),
  (13,'IMM03','Cosa rende efficace un annuncio immobiliare?','Servono un titolo preciso, informazioni verificabili e immagini fedeli.','Prepara la scheda con tipologia, caratteristiche e CTA.'),
  (14,'COM05','Come ricevere più richieste per un salone?','Servizi, tempi e prenotazioni spiegati bene possono migliorare i contatti.','Presenta trattamenti e modalità di appuntamento.'),
  (15,'IMM04','Perché una casa non riceve richieste?','Prezzo, visibilità, presentazione e pubblico devono essere analizzati insieme.','Confronta visualizzazioni, contatti e immobili simili.'),
  (16,'COM06','Come ottenere preventivi più chiari per artigiani?','Intervento, zona e sopralluogo devono essere comprensibili.','Definisci il servizio e il percorso di contatto.'),
  (17,'IMM05','Come pubblicizzare casa da privato?','La promozione richiede messaggi accurati, canali adatti e gestione responsabile dei contatti.','Usa contenuti reali, contatti chiari e verifiche professionali.'),
  (18,'COM07','Come comunicare un hotel o B&B?','Posizione, ospitalità e attrazioni aiutano il cliente a immaginare il soggiorno.','Collega l''esperienza alla richiesta di disponibilità.'),
  (19,'IMM06','Quanto valgono le case vendute nella mia zona?','Prezzi richiesti, quotazioni OMI e corrispettivi effettivi non sono la stessa fonte.','Confronta zona, data e tipologia con dati verificabili.'),
  (20,'COM08','Come promuovere le esperienze di un agriturismo?','Stagione, cucina e territorio sono parti dell''esperienza.','Mostra le esperienze effettivamente prenotabili.'),
  (21,'IMM07','Cosa fare se la casa è in vendita da mesi?','È utile verificare le campagne già svolte, il prezzo e l''interesse effettivo.','Analizza i risultati e pianifica un rilancio.'),
  (22,'COM09','Come spiegare l''offerta di una palestra?','Corsi, livelli, orari e prove devono essere facili da capire.','Prepara schede comprensibili per i diversi iscritti.'),
  (23,'IMM08','Come preparare casa alla vendita?','Ordine, luce e informazioni accurate rendono gli ambienti più comprensibili.','Organizza gli ambienti e mostra lo stato reale.'),
  (24,'COM10','Come essere trovati quando serve un''officina?','Interventi, veicoli, zona e prenotazione sono informazioni decisive.','Rendi semplici i contatti e le informazioni sul servizio.'),
  (25,'IMM09','Un video immobiliare può aiutare?','Un video ben strutturato presenta ambienti e contesto senza sostituire la visita.','Prepara riprese autentiche e una versione breve.'),
  (26,'COM11','Come comunicare uno studio professionale?','Competenze, ambiti di attività e contatto devono essere verificabili.','Presenta servizi e requisiti con chiarezza.'),
  (27,'IMM10','Come pubblicizzare un immobile ad Avigliana?','Volantini, social, landing e Open House possono completare la promozione dell''agenzia.','Coordina la distribuzione, i QR e i contenuti.'),
  (28,'COM12','Come costruire una reputazione verificabile?','Recensioni autentiche e risposte professionali sostengono la fiducia.','Richiedi feedback veri secondo le regole.'),
  (29,'IMM11','Quanto costa vendere casa?','Spese tecniche, compensi professionali e aspetti fiscali variano secondo il caso.','Chiedi un prospetto scritto delle spese applicabili.'),
  (30,'COM13','Come far tornare i clienti?','Novità e aggiornamenti pertinenti mantengono relazioni con chi desidera riceverli.','Progetta comunicazioni rispettando le preferenze.'),
  (31,'IMM12','Quali documenti servono per vendere casa?','Titolo di provenienza, dati catastali e verifiche tecniche vanno controllati dai professionisti.','Raccogli le carte e confrontati con tecnico e notaio.'),
  (32,'COM14','Come promuovere eventi e cerimonie?','Capienza, menu e disponibilità vanno raccolti in un percorso di presentazione.','Crea una pagina dedicata all''evento.'),
  (33,'IMM13','Come valutare casa ad Avigliana?','Microzona, stato e tipologia possono cambiare molto la stima.','Descrivi posizione e caratteristiche per una valutazione.'),
  (34,'COM15','Come sviluppare collaborazioni locali?','Imprese complementari possono realizzare iniziative condivise utili.','Definisci un vantaggio concreto e i ruoli.'),
  (35,'IMM14','Vendere casa senza agenzia elimina tutti i costi?','La vendita privata comporta comunque documentazione e responsabilità.','Confronta le attività da gestire e i professionisti necessari.'),
  (36,'COM16','Quando serve un e-commerce?','Catalogo, preventivi, prenotazioni e vendita online richiedono percorsi diversi.','Scegli la funzione del sito prima della tecnologia.'),
  (37,'IMM15','Come vendere casa ereditata?','La successione e gli eventuali coeredi devono essere chiariti prima della commercializzazione.','Organizza atti e verifica con i professionisti.'),
  (38,'COM17','Come progettare un video breve utile?','Una domanda reale e una risposta immediata possono rendere il video pertinente.','Scrivi un copione con apertura, risposta e CTA.'),
  (39,'IMM16','Come stimare un immobile ereditato?','Valore di mercato, rendita catastale e valori fiscali hanno scopi diversi.','Chiedi una stima motivata con criteri condivisi.'),
  (40,'COM18','Come ricevere richieste via WhatsApp più precise?','Un messaggio precompilato aiuta il cliente a chiarire il bisogno.','Prepara un messaggio breve e verifica la CTA.'),
  (41,'IMM17','Come vendere una seconda casa in Valle di Susa?','Posizione, utilizzo, costi e pubblico richiedono un posizionamento specifico.','Verifica caratteristiche e fiscalità con i professionisti.'),
  (42,'IMM18','Prezzo richiesto e valore di stima coincidono?','Il prezzo richiesto è una proposta, la stima un''analisi e il prezzo finale nasce dalla vendita.','Distingui i tre valori quando pianifichi la vendita.'),
  (43,'IMM19','Catasto e conformità urbanistica sono la stessa cosa?','I due controlli sono distinti e richiedono verifiche tecniche adeguate.','Coinvolgi un tecnico per documenti e stato dei luoghi.'),
  (44,'IMM20','Come valutare una casa indipendente?','Contano superfici, lotto, giardino, stato e domanda locale.','Usa comparabili davvero omogenei.'),
  (45,'IMM21','Come scegliere un''agenzia immobiliare?','Conta la chiarezza dell''incarico, la competenza locale e un piano di marketing verificabile.','Confronta condizioni, abilitazioni e piano promozionale.')
), channels(platform) AS (
 VALUES ('facebook'),('instagram'),('linkedin')
), prepared AS (
 SELECT e.seq, r.page_id, r.track_slug, r.public_url,
 p.id AS social_profile_id, c.platform,
 (date '2026-10-29' + ((e.seq-1)/3) +
 (CASE ((e.seq-1)%3) WHEN 0 THEN time '10:00:00' WHEN 1 THEN time '16:00:00' ELSE time '20:00:00' END))
 AT TIME ZONE 'Europe/Rome' AS schedule_rome,
 (CASE c.platform
 WHEN 'facebook' THEN e.question || E'\n\n' || e.answer || E'\n\n' || e.action || E'\n\nLeggi la guida: ' || r.public_url || E'\nPer informazioni: WhatsApp 371 370 8294.'
 WHEN 'linkedin' THEN e.question || E'\n\n' || e.answer || E'\n\n' || e.action || E'\n\nApprofondimento: ' || r.public_url || E'\nContatto: WhatsApp 371 370 8294.'
 ELSE e.question || E'\n\n' || e.answer || E'\n\n' || e.action || E'\n\nRichiedi il link alla guida in DM o su WhatsApp 371 370 8294.'
 END) AS caption,
 'rmp-45landing-v1-' || c.platform || '-' || e.page_id AS idempotency_key
 FROM editorial e
 JOIN public.rmp_landing_routes r ON r.page_id=e.page_id
 CROSS JOIN channels c
 JOIN public.rmp_social_profiles p ON p.track_slug=r.track_slug AND p.platform=c.platform
 WHERE r.promotion_status='DRAFT'
)
INSERT INTO public.rmp_publication_jobs
(track_slug,social_profile_id,landing_id,platform,content_type,caption,media_url,scheduled_at,timezone,status,idempotency_key,source_system)
SELECT track_slug,social_profile_id,page_id,platform,'POST',caption,NULL,schedule_rome,'Europe/Rome','DRAFT',idempotency_key,'RMP_CATALOG_BATCH_20261028'
FROM prepared
ON CONFLICT(idempotency_key) DO NOTHING;
COMMIT;
