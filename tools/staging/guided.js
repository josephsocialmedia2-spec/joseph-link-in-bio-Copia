/* Zero to Diamond · Two-pane guided operations, synthetic-only training.
 * The left frame is the EXISTING repo management interface, never an external production URL.
 * No real outbound messaging, real-lead import or professional real-estate mediation.
 */
(()=>{'use strict';
const PREFIX='/joseph-link-in-bio-Copia/';
const API='/__staging__/api/state';
const MODULES={
 dashboard:{title:'Dashboard gestionale',url:PREFIX+'gestione/'},
 farming:{title:'Farming territoriale',url:PREFIX+'gestione/acquisizione-farming/'},
 crm:{title:'CRM del progetto (sola lettura)',url:PREFIX+'gestione/acquisizione-farming/crm/'},
 funnel:{title:'CRM SQLite di prova — dati TEST',url:'/__staging__/funnel.html'},
 letters:{title:'Lettere e Stampa',url:PREFIX+'gestione/lettere-stampa/'},
 reader:{title:'Rivista sfogliabile',url:PREFIX+'gestione/rivista/sfoglia/'},
 catalog:{title:'Catalogo premium',url:PREFIX+'catalogo-premium/'},
 flyer:{title:'Volantini premium',url:PREFIX+'gestione/volantini-premium/'},
 newsletter:{title:'Newsletter',url:PREFIX+'newsletter/'}
};
const C=(id,label)=>({type:'check',id,label});
const O=(id,label,options)=>({type:'select',id,label,options});
const Q=(id,label)=>({type:'qa',id,label});
const zoneOptions=[['','Seleziona una microzona'],['AVI-01','AVI-01 — Avigliana Centro / Stazione'],['AVI-02','AVI-02 — Laghi / Drubiaglio'],['SAM-01','SAM-01 — Sant’Ambrogio'],['ALM-01','ALM-01 — Almese'],['VIL-01','VIL-01 — Villar Dora'],['CON-01','CON-01 — Condove']];
const sharedSafety='Ruolo esclusivo: marketing, comunicazione e promozione territoriale. Nessuna stima professionale, mediazione, negoziazione o chiamata a freddo non autorizzata.';
const FLOW={
 materiali:{title:'Materiali, lettere e QR',subtitle:'Fai operazioni nel gestionale a sinistra e spunta le prove nella guida a destra.',steps:[
  {title:'Apri il gestionale',module:'dashboard',focus:'Lettere & Stampa',body:'1. Guarda la pagina operativa.\n2. Cerca il pulsante «Lettere & Stampa» nella dashboard.\n3. Verifica che il menu del gestionale sia leggibile e che non si tratti del sito di produzione.',tip:'Non aprire la produzione. Il gestionale nella finestra è una copia di collaudo del repository.',fields:[C('dashboard','Dashboard caricata senza errori visibili.'),C('q01','Ho individuato il comando Lettere & Stampa (Q01).')]},
  {title:'Apri Lettere & Stampa',module:'letters',focus:'Lettere',body:'1. Apri la schermata Lettere & Stampa.\n2. Individua i modelli delle lettere A, B e C.\n3. Scegli l’uso del documento e controlla che non contenga dati personali di residenti.',tip:'Le lettere A e C sono per distribuzione non nominativa. La B è risposta individuale a richiesta documentata, mai per distribuzione generica.',fields:[
   O('letter','Lettera selezionata',[['','Scegli'],['A','A · guida non nominativa'],['B','B · risposta individuale inbound'],['C','C · rivista non nominativa']]),
   O('purpose','Destinazione',[['','Scegli'],['generica','Distribuzione non nominativa'],['inbound','Risposta a richiesta volontaria']]),
   C('anonymous','Ho verificato mittente, veridicità dei contenuti e regole di distribuzione.')
  ],guard:'letter'},
  {title:'Territorio e dati OMI',module:'farming',focus:'OMI',body:'1. Apri Farming.\n2. Individua la microzona in cui vuoi svolgere il test.\n3. Controlla la fonte, il semestre ufficiale e la natura orientativa dei dati OMI.',tip:'I valori OMI non costituiscono una valutazione professionale del singolo immobile.',fields:[O('zone','Microzona per la simulazione',zoneOptions),C('source','Fonte OMI e semestre verificati nella pagina.'),C('indicative','Sul materiale è chiaro che OMI è indicativo, non una stima.') ]},
  {title:'Rivista e approvazione editoriale',module:'reader',focus:'approv',body:'1. Apri lo sfogliatore.\n2. Controlla l’eventuale stato «Non ancora approvata».\n3. Se l’edizione non è approvata, non pubblicare PDF o QR che la presentino come pronta.',tip:'Un gate editoriale chiuso è un risultato corretto del test: non forzare la pubblicazione.',fields:[
   O('issue','Esito rilevato',[['','Seleziona'],['blocked','Edizione non approvata: pubblicazione bloccata'],['approved','Edizione approvata e documenti coerenti']]),
   C('pdf','Link al PDF e alla lettera verificati senza attribuire approvazioni inesistenti.')
  ]},
  {title:'Catalogo, volantino e QR',module:'catalog',focus:'Catalogo',body:'1. Verifica la pagina Catalogo Premium.\n2. Controlla il collegamento al lettore e i materiali grafici.\n3. Per la prova del QR verifica la destinazione come URL del laboratorio; non scansionare con il telefono un QR storico puntato alla produzione.',tip:'Stampare e distribuire materiali solo dopo l’approvazione editoriale, legale e tecnica.',fields:[C('catalog','Catalogo visualizzato su desktop e mobile.'),C('qr','URL di destinazione del QR identificato e controllato.'),C('print','Non è stata eseguita alcuna stampa o distribuzione reale.')]},
  {title:'Controlli Q01–Q14 di rilascio',module:'flyer',focus:'QR',body:'1. Esegui Q01–Q14.\n2. Segna PASS solo se hai una prova reale; N/A richiede una motivazione.\n3. Qualsiasi KO interrompe il rilascio: questa pagina non pubblica né approva automaticamente alcun asset.',tip:'I controlli nell’interfaccia sono una checklist interna e non certificano la conformità.',fields:[
   Q('Q01','Ingresso gestionale → Lettere & Stampa'),
   Q('Q02','Catalogo Premium coerente'),
   Q('Q03','Rivista sfogliabile e PDF corretto'),
   Q('Q04','Lettera aggiornata con QR'),
   Q('Q05','QR mobile, URL alternativo e destinazione'),
   Q('Q06','Modulo inbound e informativa'),
   Q('Q07','Newsletter e scelta separata'),
   Q('Q08','Partner e handoff identificati'),
   Q('Q09','Opposizioni e blocchi'),
   Q('Q10','OMI, fonte e semestre'),
   Q('Q11','Mobile, contrasto e accessibilità'),
   Q('Q12','Tracciamento proporzionato e UTM'),
   Q('Q13','Privacy, identità e footer'),
   Q('Q14','Asset, link e CTA senza errori')
  ]}
 ]},
 inbound:{title:'Ingresso richieste e CRM',subtitle:'Qui il lavoro effettivo usa il CRM SQLite sintetico del laboratorio Codespaces.',steps:[
  {title:'Genera una richiesta TEST',module:'funnel',focus:'Crea richiesta',probe:'lead',body:'1. Nella pagina operativa seleziona l’origine «Volantino / QR» e lo scenario «Proprietario venditore».\n2. Lascia disattivati i permessi marketing e trasferimento per verificare i blocchi.\n3. Premi «Crea richiesta sintetica». Poi premi «Verifica prova nel CRM» in questa guida.',tip:'Usa solo nominativi generati automaticamente @example.test. Non inserire recapiti o dati reali.',fields:[C('voluntary','La richiesta nasce da un’azione volontaria simulata.'),C('separate','Marketing e trasferimento sono due scelte distinte, entrambe disattivate inizialmente.')]},
  {title:'Qualifica il contatto TEST',module:'funnel',focus:'Qualifica',probe:'qualified',body:'1. Seleziona il contatto TEST creato.\n2. Nella pagina operativa premi «Qualifica».\n3. Controlla lo stato CRM QUALIFICATO e aggiorna la prova con il pulsante nella guida.',tip:'Il team può qualificare solo necessità informative: nessuna trattativa, stima o accordo negoziale.',fields:[C('limited','Ho considerato soltanto comune, tipologia e orizzonte temporale.'),C('state','La modifica di stato avviene nel database TEST, non nel CRM di produzione.')]},
  {title:'Verifica il blocco del follow-up',module:'funnel',focus:'Follow-up',probe:'blockedFollowup',body:'1. Con il contatto TEST qualificato e marketing disattivato premi «Follow-up promozionale simulato».\n2. Il CRM deve rispondere «consenso assente» e registrare un evento bloccato.\n3. Premi «Verifica prova nel CRM».',tip:'La semplice richiesta di un documento non autorizza automaticamente email, telefonate, SMS o WhatsApp promozionali.',fields:[C('notSent','Il sistema ha rifiutato il follow-up e non ha inviato comunicazioni.'),C('opposition','Ho verificato che il contatto non sia NON CONTATTARE.')]},
  {title:'Follow-up sintetico permesso',module:'funnel',focus:'Autorizzazioni',probe:'followup',body:'1. Solo per il contatto TEST, seleziona il permesso marketing sintetico e premi «Registra nuova scelta».\n2. Premi «Follow-up promozionale simulato».\n3. Verifica che il registro mostri l’evento simulato senza invii esterni.',tip:'Il permesso TEST è semplificato e NON costituisce base legale per canali commerciali reali.',fields:[C('rechecked','Permessi e finalità del test sono stati ricontrollati.'),C('zero','Le consegne esterne rimangono a zero.')]},
  {title:'Valuta la prossima azione',module:'crm',focus:'CRM',body:'1. Apri il CRM presente nel repository.\n2. Confronta i suoi campi con la pipeline documentata.\n3. Registra solo gli scostamenti, senza importare contatti reali o spostare i dati del laboratorio nella produzione.',tip:'I dati locali di questo CRM originale non sono sincronizzati con SQLite; non considerarli la stessa base dati.',fields:[C('different','Ho distinto il CRM originale dalla simulazione SQLite.'),C('next','Ho documentato il prossimo passo informativo, non una trattativa.')]},
 ]},
 handoff:{title:'Passaggio ad agente abilitato',subtitle:'Sette controlli obbligatori PRIMA di simulare il passaggio.',steps:[
  {title:'Prequalifica e sette controlli',module:'funnel',focus:'Handoff',probe:'handoffReady',body:'1. Utilizza un contatto TEST QUALIFICATO o in FOLLOW_UP / APPUNTAMENTO.\n2. Se manca il permesso sintetico per il trasferimento, registralo nella pagina operativa soltanto come simulazione volontaria.\n3. Completa TUTTI i sette controlli a destra; solo dopo passerai alla prova del pulsante Handoff.',tip:'Il trasferimento verso il partner non equivale a un consenso al marketing autonomo del partner. Nessun agente reale riceve dati da questo test.',fields:[
   C('request','1. Richiesta reale/esplicita simulata e finalità definite.'),
   C('agent','2. Agente destinatario identificato; abilitazione da verificare prima di un uso reale.'),
   C('basis','3. Base giuridica, informativa e ruoli privacy verificati nel protocollo.'),
   C('minimum','4. Soltanto dati minimi necessari: nessun allegato eccedente.'),
   C('audit','5. Registro Handoff_Audit: data, finalità, destinatario e campi previsti.'),
   C('role','6. Nessuna mediazione, visita negoziale o valutazione svolta dal team marketing.'),
   C('marketing','7. Nessun marketing autonomo del partner senza un presupposto distinto.')
  ]},
  {title:'Esegui Handoff AGENTE TEST',module:'funnel',focus:'Handoff',probe:'handedoff',body:'1. Ora premi «Handoff AGENTE TEST» nella schermata operativa.\n2. Deve comparire TRASFERITO.\n3. Premi «Verifica prova nel CRM»: il sistema legge l’evento dal database sintetico e non da una spunta manuale.',tip:'La guida può verificare soltanto la transizione sintetica. Non prova l’abilitazione o la liceità di un trasferimento reale.',fields:[C('testOnly','Nessuna comunicazione, email o dato personale reale è stato trasferito.'),C('logged','L’evento TRASFERITO è presente nel log sintetico.')]},
  {title:'Chiusura e registro audit',module:'funnel',focus:'Chiudi processo',probe:'closed',body:'1. Seleziona il contatto TEST appena trasferito.\n2. Premi «Chiudi processo» nella pagina operativa.\n3. Verifica l’esito CHIUSO e il KPI degli handoff.',tip:'L’esito del test non indica un incarico o una vendita conclusa.',fields:[C('report','Ho confrontato gli eventi con i KPI sintetici.'),C('independent','Il partner reale continua ad essere fuori dal laboratorio.')]}
 ]},
 routine:{title:'Routine 08:00–20:00',subtitle:'Esegui un controllo per fascia e registra una prova oggettiva, senza inventare risultati.',steps:[
  {title:'08:00–09:00 · Avvio',module:'dashboard',body:'Apri dashboard e richieste. Verifica opposizioni, anomalie, promemoria e KPI del giorno precedente.',fields:[C('kpi','KPI controllati.'),C('alerts','Anomalie e opposizioni verificate.')]},
  {title:'09:00–10:30 · Contenuti',module:'dashboard',body:'Prepara materiali territoriali, fonti e bozze editoriali. Le pagine non approvate rimangono in bozza.',fields:[C('asset','È presente una bozza o un asset revisionato.'),C('sources','Fonti e autorizzazioni verificabili.')]},
  {title:'10:30–12:00 · QA',module:'reader',body:'Verifica landing, catalogo, lettore, QR e visualizzazione mobile. La pubblicazione richiede approvazione separata.',fields:[C('links','Ho controllato i collegamenti pertinenti.'),C('screens','Ho raccolto almeno una evidenza tecnica.')]},
  {title:'12:00–14:00 · Pausa',module:'dashboard',body:'Pausa pranzo. Nessun outreach né chiamate promozionali.',fields:[C('rest','Pausa rispettata.') ]},
  {title:'14:00–16:30 · Inbound',module:'crm',body:'Gestisci soltanto richieste effettive e ricontatti consentiti, registrando fonte, canale ed esito.',fields:[C('request','Le comunicazioni sono limitate alle richieste autorizzate.'),C('crm','Ogni esito è stato documentato.')]},
  {title:'16:30–18:00 · Collaborazioni',module:'farming',body:'Prepara rapporti con professionisti, referral spontanei e materiali locali senza scambiare recapiti non autorizzati.',fields:[C('partners','Eventuali collaborazioni sono trasparenti.'),C('privacy','Nessun contatto di terzi acquisito senza base.')]},
  {title:'18:00–19:00 · Handoff',module:'funnel',body:'Verifica richieste da passare a professionisti abilitati. In laboratorio si usa AGENTE TEST senza consegne.',fields:[C('checks','Sette requisiti del passaggio esaminati.'),C('audit','Eventuali azioni annotate nel registro di prova.')]},
  {title:'19:00–20:00 · Chiusura',module:'dashboard',body:'Calcola KPI verificati, aggiorna le anomalie aperte e stabilisci le tre priorità del prossimo turno.',fields:[C('report','Report del giorno pronto.'),C('priorities','Tre priorità definite, senza creare urgenze fittizie.')]}
 ]},
 newsletter:{title:'Newsletter e opposizioni',subtitle:'Confronta i due binari editoriali e prova i blocchi senza spedire campagne.',steps:[
  {title:'Scegli il binario editoriale',module:'newsletter',body:'Binario A ZTD documentato: Mercato → Ristorante → Deal → Notizie locali.\nBinario B italiano alternativo: Mercato → Opportunità → Consigli → Analisi/Invito.\nScegli il calendario e verifica fonti e data.',tip:'Il calendario italiano alternativo non deve essere presentato come ufficiale di Carruth.',fields:[
   O('track','Binario',[['','Scegli'],['A','A — Rotazione ZTD documentata'],['B','B — Calendario italiano alternativo']]),
   C('legal','Fonti, contenuto e diritti immagini verificati.')
  ]},
  {title:'Controlla i destinatari e i canali',module:'newsletter',body:'Prima dell’invio: verifica base giuridica, prova e finalità per email e altre comunicazioni. Non considerare sufficiente un semplice «contatto nel CRM».',tip:'Email, SMS, WhatsApp, telefono e cessione marketing a partner richiedono verifiche specifiche. Nessuna campagna parte dal laboratorio.',fields:[
   C('noUpload','Nessun elenco di clienti reali caricato nel laboratorio.'),
   C('law','Base del trattamento e opposizioni controllate per ciascun canale.'),
   C('optout','Disiscrizione effettiva e informativa disponibili.')
  ]},
  {title:'Gestisci NON CONTATTARE',module:'funnel',focus:'NON CONTATTARE',probe:'opposition',body:'1. Per questo test crea o seleziona un nuovo contatto TEST.\n2. Premi «Opposizione / NON CONTATTARE» nel funnel.\n3. Premi «Verifica prova nel CRM»; le autorizzazioni devono risultare revocate e il record non contattabile.',tip:'NON CONTATTARE prevale su campagne, importazioni e follow-up. Non inviare neppure un messaggio di prova a persone reali.',fields:[C('stop','Opposizione registrata immediatamente.'),C('revoke','Permessi TEST revocati e invii esterni a zero.')]},
 ]}};
const SCRIPTS=[
 ['01 · Primo contatto inbound','Apertura: Buongiorno, sono un operatore di marketing immobiliare. La contatto esclusivamente per la richiesta che ha inviato sul nostro portale.\nDomanda: Cosa desidera approfondire sulla zona?\nAscolto: Lasciare parlare.\nObiezione: Volevo solo informarmi.\nRisposta: Le invio i dati territoriali documentati, senza impegni.\nProssimo passo: Preferisce ricevere la scheda informativa?'],
 ['02 · Proprietario 0–6 mesi','Apertura: Grazie per la richiesta sulla sua zona.\nDomanda: Quale aspetto le interessa maggiormente?\nAscolto: Raccogliere le esigenze essenziali.\nObiezione: Prima voglio capire il mercato.\nRisposta: La stima professionale spetta all’agente abilitato.\nProssimo passo: Se richiesto, possiamo facilitare un contatto con l’agente identificato.'],
 ['03 · Proprietario indeciso','Apertura: Capisco che si tratti di una decisione importante.\nDomanda: Qual è l’informazione che oggi le manca?\nAscolto: Evitare dati familiari eccedenti.\nObiezione: Forse aspetto.\nRisposta: È possibile informarsi con calma.\nProssimo passo: Le preparo una guida solo se la desidera.'],
 ['04 · Vendita autonoma','Apertura: Ho ricevuto la sua richiesta sulla guida per la vendita diretta.\nDomanda: Quale difficoltà di comunicazione incontra?\nAscolto: Distinguere marketing e negoziazione.\nObiezione: Non voglio intermediari.\nRisposta: Offriamo servizi autonomi di comunicazione e valorizzazione.\nProssimo passo: Le invio i consigli richiesti, senza alcun incarico.'],
 ['05 · Agenzia già incaricata','Apertura: Rispettiamo gli accordi professionali già esistenti.\nDomanda: Desidera solo informazioni territoriali?\nAscolto: Nessuna interferenza negli incarichi.\nObiezione: Abbiamo già un’agenzia.\nRisposta: Non interferiamo con l’incarico.\nProssimo passo: La newsletter è facoltativa e richiede un’adesione valida.'],
 ['06 · Richiesta report OMI','Apertura: Confermo la ricezione della sua richiesta informativa.\nDomanda: Le interessa una zona specifica?\nAscolto: Raccogliere solo le informazioni necessarie.\nObiezione: Non ho tempo.\nRisposta: Le mando il documento richiesto con fonte e semestre.\nProssimo passo: Un’eventuale valutazione individuale è di competenza dell’agente abilitato.'],
 ['07 · Follow-up consentito','Apertura: Riprendo il filo della richiesta precedente, nei termini autorizzati.\nDomanda: Il materiale è risultato utile?\nAscolto: Rispettare la risposta.\nObiezione: Per ora è fermo.\nRisposta: Nessuna fretta.\nProssimo passo: Aggiornamenti successivi solo con presupposto valido.'],
 ['08 · Segnalazione spontanea','Apertura: Grazie per aver consultato la nostra guida.\nDomanda: Le sarebbe utile condividere un link pubblico?\nAscolto: Non chiedere recapiti di terzi.\nObiezione: Non conosco nessuno.\nRisposta: Nessun problema.\nProssimo passo: Condivida liberamente il link; l’interessato deciderà autonomamente se contattarci.'],
 ['09 · Non interessato','Apertura: Capisco e ringrazio della chiarezza.\nDomanda: Desidera interrompere gli aggiornamenti?\nAscolto: Rispettare l’opposizione senza insistere.\nObiezione: Non voglio più comunicazioni.\nRisposta: Registro immediatamente NON CONTATTARE.\nProssimo passo: Nessun ulteriore marketing.'],
 ['10 · Non voglio agenzie','Apertura: Comprendo la preferenza.\nDomanda: Quale informazione neutrale potrebbe esserle utile?\nAscolto: Nessuna critica a professionisti terzi.\nObiezione: Non voglio intermediari.\nRisposta: Il nostro servizio è solo marketing e comunicazione.\nProssimo passo: Inviare contenuti richiesti, senza incarichi né trasferimenti automatici.']
];
const el=id=>document.getElementById(id);
let flowKey='materiali',index=0,moduleKey='',snapshot=null,apiMode='checking',currentLeadId='',handoffQualifiedId='';
const values={},completed=new Set();
const key=()=>flowKey+':'+index;
const step=()=>FLOW[flowKey].steps[index];
function getValue(id){return (values[key()]||{})[id]}
function store(id,value){if(!values[key()])values[key()]={};values[key()][id]=value;updateGate()}
function focusText(){
 const term=step().focus;if(!term)return;
 try{
  const d=el('workframe').contentDocument;
  if(!d)return;
  for(const node of d.querySelectorAll('[data-ztd-guided-highlight]')){
   node.style.outline='';node.removeAttribute('data-ztd-guided-highlight');
  }
  const match=[...d.querySelectorAll('a,button,[role="button"],h1,h2,h3,nav')].find(x=>(x.textContent||'').trim().toLowerCase().includes(term.toLowerCase()));
  if(match){match.style.outline='4px solid #efb845';match.style.outlineOffset='4px';
   match.setAttribute('data-ztd-guided-highlight','');match.scrollIntoView({behavior:'smooth',block:'center'});note('Comando individuato nel gestionale di prova.');}
  else note('Comando non individuato automaticamente: verifica la schermata manualmente.');
 }catch(_){note('Evidenziazione non disponibile per questa schermata.')}
}
function note(message){el('toast').textContent=message}
function setModule(k,force=false){
 const item=MODULES[k];if(!item)return;
 el('module').value=k;el('moduletitle').textContent=item.title;
 el('frame-url').textContent=item.url;el('open-new-tab').href=item.url;
 if(force||moduleKey!==k){moduleKey=k;el('workframe').src=item.url}
}
function controlNode(field){
 const box=document.createElement('label');box.className='field'+(field.type==='check'?' check':'');
 const input=document.createElement(field.type==='check'?'input':'select');
 input.dataset.field=field.id;
 if(field.type==='check'){
  input.type='checkbox';input.checked=Boolean(getValue(field.id));
  const span=document.createElement('span');span.textContent=field.label;
  box.append(input,span);input.addEventListener('change',()=>store(field.id,input.checked));
 }else{
  const span=document.createElement('span');span.textContent=field.label;box.append(span);
  const options=field.type==='qa'
   ?[['','Da verificare'],['pass','PASS · prova disponibile'],['na','N/A · motivazione obbligatoria'],['ko','KO · BLOCCA']]
   :field.options;
  for(const [v,t] of options){const o=document.createElement('option');o.value=v;o.textContent=t;input.append(o)}
  input.value=getValue(field.id)||'';box.append(input);
  const reason=document.createElement('select');reason.className='reason';reason.dataset.reason=field.id;
  if(field.type==='qa'){
   for(const [v,t] of [['','Indica motivo N/A'],['not-present','Il componente non è presente in questa prova'],['asset-scope','Questo controllo non riguarda l’asset testato'],['no-campaign','Nessuna campagna o raccolta dati attivata']]){
    const opt=document.createElement('option');opt.value=v;opt.textContent=t;reason.append(opt)}
   reason.value=getValue(field.id+':reason')||'';reason.classList.toggle('hide',input.value!=='na');box.append(reason);
   reason.addEventListener('change',()=>store(field.id+':reason',reason.value));
  }
  input.addEventListener('change',()=>{store(field.id,input.value);if(field.type==='qa')reason.classList.toggle('hide',input.value!=='na')});
 }
 return box;
}
function lead(){
 return snapshot&&Array.isArray(snapshot.leads)?snapshot.leads.find(x=>String(x.id)===String(currentLeadId)):null;
}
function eventExists(action,outcome){
 return Boolean(snapshot&&Array.isArray(snapshot.events)&&snapshot.events.some(x=>String(x.lead_id)===String(currentLeadId)&&x.action===action&&x.outcome===outcome));
}
function verifyProbe(probe){
 if(!probe)return {ok:true,message:'Questo passaggio richiede una verifica umana documentata.'};
 if(apiMode!=='dynamic')return {ok:false,message:'Database SQLite non disponibile su questa anteprima statica. Apri il Codespace privato per completare questa prova.'};
 const x=lead();
 if(!x)return {ok:false,message:'Crea o seleziona prima un contatto TEST nel CRM sintetico.'};
 switch(probe){
  case 'lead':return {ok:true,message:'Contatto '+x.name+' generato dal database TEST · '+x.status};
  case 'qualified':return {ok:['QUALIFICATO','FOLLOW_UP','APPUNTAMENTO','TRASFERITO','CHIUSO'].includes(x.status),
   message:'Stato CRM TEST: '+x.status};
  case 'blockedFollowup':return {ok:eventExists('followup','blocked'),message:eventExists('followup','blocked')?'Negazione del follow-up registrata nel database.':'Manca un evento di follow-up BLOCCATO per questo contatto.'};
  case 'followup':return {ok:eventExists('followup','simulated'),message:eventExists('followup','simulated')?'Follow-up simulato nel registro; zero consegne esterne.':'Manca un evento di follow-up simulato.'};
  case 'handoffReady':return {ok:!['NON_CONTATTARE','TRASFERITO','CHIUSO'].includes(x.status)&&x.transfer_optin===true&&['QUALIFICATO','FOLLOW_UP','APPUNTAMENTO'].includes(x.status),
   message:'Stato '+x.status+' · trasferimento TEST '+(x.transfer_optin?'SÌ':'NO')+' · il permesso sintetico non è una base giuridica reale.'};
  case 'handedoff':return {ok:x.status==='TRASFERITO'||x.status==='CHIUSO',
   message:'Stato CRM TEST: '+x.status+(eventExists('handoff','simulated')?' · handoff registrato':'')};
  case 'closed':return {ok:x.status==='CHIUSO',message:'Stato CRM TEST: '+x.status};
  case 'opposition':return {ok:x.status==='NON_CONTATTARE'&&!x.marketing_optin&&!x.transfer_optin,
   message:'Stato '+x.status+' · marketing '+(x.marketing_optin?'SÌ':'NO')+' · trasferimento '+(x.transfer_optin?'SÌ':'NO')};
  default:return {ok:false,message:'Verifica sconosciuta.'};
 }
}
function validate(){
 const st=step(),data=values[key()]||{};
 for(const field of st.fields){
  const val=data[field.id];
  if(field.type==='check'&&val!==true)return {ok:false,message:'Spunta tutte le verifiche richieste.'};
  if(field.type==='select'&&!val)return {ok:false,message:'Seleziona le opzioni obbligatorie.'};
  if(field.type==='qa'&&(!['pass','na'].includes(val)||(val==='na'&&!data[field.id+':reason'])))
    return {ok:false,message:'Q01–Q14: ogni test deve essere PASS oppure N/A motivato. KO blocca il rilascio.'};
 }
 if(st.guard==='letter'&&data.letter==='B'&&data.purpose==='generica')
  return {ok:false,message:'La Lettera B NON è destinata alla distribuzione generica.'};
 if(st.guard==='letter'&&(['A','C'].includes(data.letter))&&data.purpose==='inbound')
  return {ok:false,message:'Per la risposta individuale documentata utilizza la Lettera B.'};
 const proof=verifyProbe(st.probe);
 if(!proof.ok)return proof;
 return {ok:true,message:st.probe?'Gate confermato dal CRM TEST.':'Controlli manuali compilati. Nessuna pubblicazione o azione reale è stata eseguita.'};
}
function updateGate(){
 const state=validate();el('next').disabled=!state.ok;
 el('gate-message').textContent=state.message;el('gate-message').className=state.ok?'ok':'';
 const s=step();
 el('auto-proof').textContent=s.probe?verifyProbe(s.probe).message:'Gate manuale: le spunte non modificano la pagina operativa e non sono una certificazione tecnica o legale.';
}
function renderScripts(){
 const sel=el('script-select');sel.replaceChildren();
 for(let i=0;i<SCRIPTS.length;i++){const opt=document.createElement('option');opt.value=String(i);opt.textContent=SCRIPTS[i][0];sel.append(opt)}
 sel.value='0';el('script-body').textContent=SCRIPTS[0][1];
 el('script-box').classList.toggle('hide',!['inbound','handoff'].includes(flowKey));
}
function render(){
 const flow=FLOW[flowKey],st=step();
 el('flow').value=flowKey;el('flowtitle').textContent=flow.title;el('flowsubtitle').textContent=flow.subtitle;
 el('step-label').textContent='STEP '+(index+1)+' / '+flow.steps.length;
 el('steptitle').textContent=st.title;
 el('instructions').textContent=st.body;
 el('hint').textContent=st.tip||'Prova di completamento: esegui i passaggi nella pagina a sinistra prima di confermare la guida.';
 el('warning').textContent=sharedSafety;
 el('progress').style.width=((index+1)/flow.steps.length*100)+'%';
 el('counter').textContent=(index+1)+' / '+flow.steps.length;
 el('prev').disabled=index===0;el('next').textContent=index===flow.steps.length-1?'Completa procedura ✓':'Step successivo →';
 const parent=el('controls');parent.replaceChildren();
 for(const f of st.fields)parent.append(controlNode(f));
 el('leadbar').classList.toggle('hide',!st.probe);
 renderScripts();setModule(st.module);updateGate();note('');
}
async function sync(){
 try{
  const response=await fetch(API,{cache:'no-store',headers:{'Accept':'application/json'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!data.ok||data.mode!=='SYNTHETIC_ONLY'||data.external_deliveries!==0)throw Error('Sorgente non sintetica');
  snapshot=data;apiMode='dynamic';
  el('mode').textContent='CODESPACES · SQLITE SINTETICO';el('mode').className='status live';
  const select=el('labLead'),old=currentLeadId;
  select.replaceChildren();
  for(const x of data.leads){const opt=document.createElement('option');opt.value=String(x.id);opt.textContent=x.name+' · '+x.status;select.append(opt)}
  currentLeadId=data.leads.some(x=>String(x.id)===String(old))?old:(data.leads[0]?String(data.leads[0].id):'');
  select.value=currentLeadId;note('Database TEST aggiornato, '+data.leads.length+' contatti sintetici.');
 }catch(e){
  snapshot=null;apiMode='static';currentLeadId='';
  el('labLead').replaceChildren();
  el('mode').textContent='ANTEPRIMA STATICA · NO DATABASE';el('mode').className='status';
  note('Anteprima statica: per usare il CRM SQLite apri il Codespace sul branch.');
 }
 updateGate();
}
function next(){
 const state=validate();if(!state.ok){note(state.message);return}
 if(flowKey==='handoff'&&index===0)handoffQualifiedId=String(currentLeadId);
 completed.add(key());
 if(index<FLOW[flowKey].steps.length-1){index++;render();if(step().probe)sync()}
 else note('Procedura TEST completata. I controlli manuali non certificano il rilascio in produzione.');
}
function copyReport(){
 const rows=['ZERO TO DIAMOND — VERBALE SOLO TEST','Flusso: '+FLOW[flowKey].title,'Ambiente: '+apiMode,
  'Data: '+new Date().toLocaleString('it-IT'),'Nessun dato reale o invio generato da questa guida.'];
 for(let i=0;i<FLOW[flowKey].steps.length;i++){
  const prefix=flowKey+':'+i,stepInfo=FLOW[flowKey].steps[i],d=values[prefix]||{};
  rows.push((completed.has(prefix)?'SUPERATO':'INCOMPLETO')+' · '+stepInfo.title);
  for(const f of stepInfo.fields)rows.push('  '+f.id+' = '+(d[f.id]===true?'SI':d[f.id]||'NON VERIFICATO'));
 }
 const report=rows.join('\n');
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(report).then(()=>note('Verbale copiato negli appunti.'),()=>note('Copia non disponibile nel browser.'));
 else note('La copia negli appunti richiede un contesto HTTPS.');
}
function inspectFrame(){
 try{
  const frame=el('workframe');const doc=frame.contentDocument;
  if(!doc)return;
  doc.addEventListener('click',ev=>{
   const target=ev.target.closest&&ev.target.closest('button[data-action="handoff"]');
   if(target && (flowKey!=='handoff'||index<1||handoffQualifiedId!==String(currentLeadId))){
    ev.preventDefault();ev.stopImmediatePropagation();
    note('Handoff bloccato dalla guida: completa prima il Flusso 3, i 7 controlli e la verifica sul contatto TEST.');
   }
  },true);
 }catch(_){/* A non-same-origin frame is never allowed intentionally. */}
}
el('flow').addEventListener('change',e=>{flowKey=e.target.value;index=0;render();sync()});
el('module').addEventListener('change',e=>setModule(e.target.value,true));
el('open-module').addEventListener('click',()=>setModule(el('module').value,true));
el('focus-element').addEventListener('click',focusText);
el('prev').addEventListener('click',()=>{if(index>0){index--;render();sync()}});
el('next').addEventListener('click',next);
el('sync').addEventListener('click',sync);
el('labLead').addEventListener('change',e=>{currentLeadId=e.target.value;handoffQualifiedId='';updateGate()});
el('reset').addEventListener('click',()=>{
 if(!confirm('Azzerare solo le spunte di questa procedura? Il CRM TEST non viene cancellato.'))return;
 for(let i=0;i<FLOW[flowKey].steps.length;i++){delete values[flowKey+':'+i];completed.delete(flowKey+':'+i)}
 index=0;handoffQualifiedId='';render();sync();
});
el('script-select').addEventListener('change',e=>{el('script-body').textContent=SCRIPTS[Number(e.target.value)][1]});
el('copy-report').addEventListener('click',copyReport);
el('workframe').addEventListener('load',inspectFrame);
el('flip').addEventListener('click',()=>el('workspace').classList.toggle('reversed'));
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{
 el('workspace').dataset.mobile=btn.dataset.view;
 document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===btn));
}));
render();sync();
})();