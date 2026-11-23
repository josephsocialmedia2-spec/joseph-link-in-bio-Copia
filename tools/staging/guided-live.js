/* ZERO TO DIAMOND · REAL SCREEN MIRROR COACH
 * Both panes render identical current staging page. Right is read-only visual
 * and highlights the EXACT clickable DOM element. Progress is observed from
 * the real left-pane click + verified UI/API outcome, never from self-checked claims.
 * No production API, outbound delivery or real customer data.
 */
(()=>{'use strict';
const HOME='/joseph-link-in-bio-Copia/';
const PATH={
 farming:HOME+'gestione/acquisizione-farming/#lettere',
 letters:HOME+'gestione/lettere-stampa/',
 reader:HOME+'gestione/rivista/sfoglia/',
 catalog:HOME+'catalogo-premium/',
 dashboard:HOME+'gestione/',
 crm:HOME+'gestione/acquisizione-farming/crm/',
 funnel:'/__staging__/funnel.html',
 models:'/__staging__/letter-models.html',
 handoff:'/__staging__/workflow-training.html?mode=handoff',
 routine:'/__staging__/workflow-training.html?mode=routine',
 newsletter:'/__staging__/workflow-training.html?mode=newsletter'
};
const $=id=>document.getElementById(id);
const stage=(module,target,event,proof,title,instruction,result)=>({module,target,event,proof,title,instruction,result});
const FLOWS={
 materiali:{title:'Lettere, rivista e QR',steps:[
  stage('farming','#rew-open-flipbook','click','navigation','Apri la rivista dal Farming',
   'Nella pagina OPERATIVA cerca il tasto «Sfoglia la rivista». La copia a destra indica con un cerchio il pulsante esatto. Cliccalo A SINISTRA: vedrai aprirsi il lettore originale.',
   'La pagina Lettere & Stampa deve essere realmente caricata.'),
  stage('letters','#letter','click','pdf','Verifica la Lettera aggiornata',
   'Premi davvero «Lettera aggiornata». In simulazione il PDF viene verificato e aperto nella pagina operativa, senza inviare o stampare nulla.',
   'Il documento PDF del gestionale deve esistere e rispondere senza errori.'),
  stage('models','#model-A','click','model:A','Scegli il modello A',
   'Questa è la schermata di esercitazione introdotta nel branch: premi «Seleziona Lettera A» e osserva comparire l’anteprima. La lettera A è NON nominativa.',
   'Verrà mostrato il testo della lettera A per il territorio.'),
  stage('models','#model-B','click','model:B','Scegli il modello B',
   'Clicca «Seleziona Lettera B» e leggi l’anteprima. È riservata a una risposta individuale su richiesta: non distribuirla genericamente.',
   'Il documento deve dichiarare che è una risposta a richiesta ricevuta.'),
  stage('models','#model-C','click','model:C','Scegli il modello C',
   'Clicca «Seleziona Lettera C». Il modello è NON nominativo e rimanda alla rivista digitale approvata.',
   'Il testo della lettera C apparirà nell’anteprima.'),
  stage('models','#qr-test','click','qr','Verifica il QR di collaudo',
   'Premi «Verifica destinazione QR del laboratorio». Leggi il percorso riportato: non scansionare con il telefono i QR storici che potrebbero aprire la produzione.',
   'Il QR di collaudo deve puntare al lettore interno, non a una pagina esterna.'),
  stage('models','#review-status','click','approval','Controlla il blocco editoriale',
   'Premi «Verifica approvazione rivista» e leggi l’esito. Se l’edizione non è approvata, NON devi pubblicarla. Il test è concluso quando il blocco viene rilevato correttamente.',
   'Stato approvazione controllato senza rendere pubblico alcun PDF.')
 ]},
 inbound:{title:'Inbound → CRM → follow-up',steps:[
  stage('funnel','#create','click','created','Crea richiesta sintetica',
   'Nel modulo operativo lascia DISATTIVATI i permessi marketing e trasferimento. Premi «Crea richiesta sintetica nel CRM di prova». Nessun nominativo reale.',
   'Deve comparire una nuova scheda TEST nel database SQLite.'),
  stage('funnel','button[data-action="qualify"]','click','qualified','Qualifica il TEST',
   'Premi «Qualifica» sul contatto inventato. Controlla che lo stato diventi QUALIFICATO.',
   'Lo stato reale del record TEST deve passare a QUALIFICATO.'),
  stage('funnel','button[data-action="followup"]','click','blocked-followup','Prova il divieto di follow-up',
   'Premi «Follow-up promozionale simulato» senza consenso. La richiesta deve essere BLOCCATA: il messaggio rosso è il risultato corretto.',
   'L’audit deve registrare il blocco senza invio.'),
  stage('funnel','#selectedMarketing','change','marketing-checked','Attiva il permesso TEST',
   'Clicca davvero la casella «Permesso marketing sintetico». Hai cambiato soltanto una scelta nell’interfaccia: devi ancora registrarla.',
   'La casella deve essere selezionata nella schermata operativa.'),
  stage('funnel','#updatePermissions','click','marketing-saved','Registra la scelta TEST',
   'Premi «Registra nuova scelta del contatto TEST». Solo dopo la risposta del CRM il permesso risulterà salvato.',
   'Il database deve confermare marketing_optin=true.'),
  stage('funnel','button[data-action="followup"]','click','followup','Esegui follow-up TEST',
   'Premi di nuovo il tasto del follow-up: ora il CRM deve registrare un evento simulato. Non parte nessuna comunicazione vera.',
   'L’audit deve mostrare followup simulated e zero consegne esterne.')
 ]},
 handoff:{title:'Handoff · sette verifiche reali',steps:[
  stage('funnel','#create','click','created','Crea richiesta TEST per l’agente',
   'Crea una nuova richiesta TEST, con permesso trasferimento inizialmente disattivato. Serve un record nuovo per osservare il blocco.',
   'Il CRM deve generare una nuova identità sintetica.'),
  stage('funnel','button[data-action="qualify"]','click','qualified','Qualifica la richiesta',
   'Clicca «Qualifica». Non effettuare stime o trattative: questo è un evento del CRM sintetico.',
   'Stato TEST: QUALIFICATO.'),
  stage('funnel','button[data-action="handoff"]','click','blocked-handoff','Verifica che il sistema blocchi l’agente',
   'Premi «Handoff AGENTE TEST» prima di avere il permesso. Deve comparire un blocco e nessun trasferimento.',
   'L’audit deve registrare un handoff bloccato.')
 ]},
 routine:{title:'Routine operativa 08:00–20:00',steps:[
  ...['08:00–09:00 · Dashboard e KPI','09:00–10:30 · Contenuti','10:30–12:00 · Landing e QR','12:00–14:00 · Pausa','14:00–16:30 · Inbound','16:30–18:00 · Collaborazioni','18:00–19:00 · Handoff','19:00–20:00 · Report e priorità'].map((title,i)=>
   stage('routine','#slot-'+i,'click','slot:'+i,title,
    'Clicca nella pagina operativa il tasto «Registra step '+(i+1)+'». Osserva il cambio di stato del pulsante. Questa è una simulazione della sequenza, non una dichiarazione che il lavoro reale sia stato fatto.',
    'Il pulsante cambia realmente in Fatto nel laboratorio.'))
 ]},
 newsletter:{title:'Newsletter, consenso e opposizioni',steps:[
  stage('newsletter','#track-A','click','track:A','Apri la rotazione ZTD documentata',
   'Clicca «Apri binario A». Verrà mostrato il calendario: mercato, ristorante, immobile, notizie.',
   'Il calendario A deve risultare selezionato nella pagina operativa.'),
  stage('newsletter','#track-B','click','track:B','Confronta il calendario italiano',
   'Clicca «Apri binario B». È un calendario italiano alternativo, non la rotazione ufficiale attribuibile al metodo ZTD.',
   'Il calendario B deve risultare selezionato.'),
  stage('newsletter','#verify-channel','click','channels','Prova il blocco degli invii',
   'Clicca «Esegui test BLOCCO invii». La simulazione conferma che non si possono inviare email, SMS o WhatsApp reali da questo laboratorio.',
   'Deve comparire il risultato BLOCCO invii.'),
  stage('funnel','#create','click','created','Genera il contatto TEST per opposizione',
   'Crea un nuovo contatto TEST e verifica che sia un record inventato @example.test.',
   'Il CRM crea una richiesta fittizia.'),
  stage('funnel','button[data-action="stop"]','click','stopped','Imposta NON CONTATTARE',
   'Premi «Opposizione / NON CONTATTARE». Il record deve perdere tutti i permessi e ogni ulteriore azione promozionale rimane bloccata.',
   'Il database deve mostrare NON_CONTATTARE con entrambi i permessi a false.')
 ]}};
const S=FLOWS.handoff.steps;
for(let i=1;i<=7;i++){S.push(stage('handoff','#gate-'+i,'change','gate:'+i,
 'Gate '+i+' di 7','Nella schermata operativa clicca la casella evidenziata ('+i+'/7). La guida passerà alla successiva soltanto quando la casella sarà davvero selezionata. Nessun dato reale viene trasferito.',
 'La casella '+i+' è stata selezionata sulla pagina operativa.'))}
S.push(stage('handoff','#gate-submit','click','gates-complete','Convalida i 7 controlli',
 'Premi «Convalida i sette controlli TEST». Il pulsante dà esito positivo soltanto se le sette verifiche sono tutte selezionate.',
 'I sette controlli devono risultare convalidati nell’interfaccia.'));
S.push(stage('funnel','#selectedTransfer','change','transfer-checked','Seleziona il permesso trasferimento TEST',
 'Nel CRM torna al contatto fittizio e clicca «Permesso handoff sintetico». Non è una base giuridica per trasferimenti reali.',
 'Casella di trasferimento selezionata.'));
S.push(stage('funnel','#updatePermissions','click','transfer-saved','Salva il permesso TEST',
 'Premi «Registra nuova scelta del contatto TEST». Attendi la risposta del database.',
 'Il contatto TEST deve avere transfer_optin=true.'));
S.push(stage('funnel','button[data-action="handoff"]','click','handedoff','Handoff a AGENTE TEST',
 'Ora premi il vero pulsante Handoff nel CRM simulato. Il sistema registrerà la transizione TRASFERITO senza inviare dati.',
 'Lo stato del database deve diventare TRASFERITO.'));
S.push(stage('funnel','button[data-action="close"]','click','closed','Chiudi il processo TEST',
 'Premi «Chiudi processo». Lo stato deve diventare CHIUSO e i KPI devono aggiornarsi.',
 'Il database deve mostrare CHIUSO, senza comunicazioni inviate.'));
const W=$('workframe'),M=$('mirrorframe');
let flow='materiali',index=0,selectedLeadId=null,beforeCount=0,processToken=0,frameModule=null,
  pdfSuccess=false,gateSuccess=false,working=false,dbAvailable=false,lastSnapshot=null,stageTimer=null,closed=false;
let stageNow=()=>FLOWS[flow].steps[index];
let stageUrl=st=>PATH[st.module]||PATH.farming;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function notice(message,good=false){$('gate-message').textContent=message;$('gate-message').className=good?'ok':''}
function status(message){$('toast').textContent=message}
function currentDocument(){try{return W.contentDocument&&W.contentDocument.documentElement?W.contentDocument:null}catch(_){return null}}
function currentUrl(){try{return W.contentWindow.location.href}catch(_){return W.src}}
function cleanHighlight(doc){
 if(!doc)return;
 for(const x of doc.querySelectorAll('[data-ztd-live-target]')){
  x.style.removeProperty('outline');x.style.removeProperty('outline-offset');x.style.removeProperty('box-shadow');
  x.removeAttribute('data-ztd-live-target');
 }
 doc.getElementById('ztd-live-pointer')?.remove();
}
function showHighlight(doc,selector,mirror){
 if(!doc)return false;
 const node=doc.querySelector(selector);if(!node)return false;
 cleanHighlight(doc);
 node.setAttribute('data-ztd-live-target','yes');
 node.style.setProperty('outline','5px solid #eca51b','important');
 node.style.setProperty('outline-offset','5px','important');
 node.style.setProperty('box-shadow','0 0 0 9px rgba(242,188,56,.27)','important');
 try{node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'})}catch(_){}
 const label=doc.createElement('div');label.id='ztd-live-pointer';
 label.textContent=mirror?'⇨ CLICCA QUESTO TASTO A SINISTRA':'⇦ CLICCA QUI';
 label.style.cssText='position:fixed;z-index:2147483620;pointer-events:none;background:#b87500;color:#fff;box-shadow:0 5px 14px #15233344;border:2px solid white;border-radius:5px;padding:6px 8px;font:bold 12px system-ui;max-width:230px';
 let rect=node.getBoundingClientRect();
 label.style.left=Math.max(4,Math.min((doc.defaultView?.innerWidth||450)-225,rect.left))+'px';
 label.style.top=Math.max(4,rect.top>37?rect.top-39:rect.bottom+8)+'px';
 doc.body.append(label);
 return true;
}
function syncMirrorState(){
 const a=currentDocument(),b=M.contentDocument;
 if(!a||!b)return;
 const module=stageNow().module;
 if(module==='models'){
  for(const id of ['doc-title','doc-copy','doc-note','result']){
   const from=a.getElementById(id),to=b.getElementById(id);
   if(from&&to){to.textContent=from.textContent;if(id==='result'){to.dataset.error=from.dataset.error||'';to.dataset.test=from.dataset.test||''}}
  }
  const aDoc=a.getElementById('document'),bDoc=b.getElementById('document');
  if(aDoc&&bDoc)bDoc.dataset.currentModel=aDoc.dataset.currentModel||'';
  for(const x of a.querySelectorAll('[data-model]')){
   const to=b.getElementById(x.id);if(to)to.setAttribute('aria-pressed',x.getAttribute('aria-pressed')||'false');
  }
 }
 if(['handoff','routine','newsletter'].includes(module)){
  for(const x of a.querySelectorAll('input[type="checkbox"][id]')){
   const to=b.getElementById(x.id);if(to)to.checked=x.checked;
  }
  for(const x of a.querySelectorAll('button[id]')){
   const to=b.getElementById(x.id);if(!to)continue;
   to.textContent=x.textContent;
   to.dataset.done=x.dataset.done||'';
   to.classList.toggle('done',x.classList.contains('done'));
  }
  const aBoard=a.getElementById('board'),bBoard=b.getElementById('board');
  if(aBoard&&bBoard){
   bBoard.dataset.gatesPassed=aBoard.dataset.gatesPassed||'';
   bBoard.dataset.track=aBoard.dataset.track||'';
   bBoard.dataset.sending=aBoard.dataset.sending||'';
  }
  const aFeedback=a.getElementById('feedback'),bFeedback=b.getElementById('feedback');
  if(aFeedback&&bFeedback)bFeedback.textContent=aFeedback.textContent;
 }
 if(module==='funnel'){
  for(const id of ['source','scenario','marketing','transfer','selectedMarketing','selectedTransfer']){
   const from=a.getElementById(id),to=b.getElementById(id);
   if(!from||!to)continue;
   if(from.type==='checkbox')to.checked=from.checked;
   else to.value=from.value;
  }
 }
}
function focus(){
 const st=stageNow(),doc=currentDocument(),mirror=M.contentDocument;
 const ok=showHighlight(doc,st.target,false);
 showHighlight(mirror,st.target,true);
 $('mirrorlabel').textContent=ok?'L’ANELLO DORATO MOSTRA IL PULSANTE ESATTO DA CLICCARE A SINISTRA':'Comando in caricamento o non disponibile: nessun avanzamento fittizio.';
 $('mirrorstatus').textContent=ok?'Schermata reale, evidenziata':'In attesa del comando';
 if(!ok)notice('Comando non trovato in questa pagina. Verifica il modulo e non avanzare con una spunta.',false);
 return ok;
}
function refreshMirror(){
 const url=currentUrl();
 if(!url.startsWith(location.origin))return;
 $('frame-url').textContent=new URL(url).pathname;
 $('open-new-tab').href=url;
 if(M.src!==url){M.src=url}
 else try{showHighlight(M.contentDocument,stageNow().target,true)}catch(_){}
}
async function snapshot(){
 try{
  const r=await fetch('/__staging__/api/state',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const x=await r.json();
  if(!x.ok||x.mode!=='SYNTHETIC_ONLY'||x.external_deliveries!==0)throw Error('Origine non sintetica');
  dbAvailable=true;lastSnapshot=x;
  $('mode').textContent='CODESPACES · SQLITE TEST';$('mode').className='status live';
  return x;
 }catch(_){
  dbAvailable=false;$('mode').textContent='ANTEPRIMA STATICA · NESSUN CRM';$('mode').className='status';
  return null;
 }
}
function chosenLead(snap){return snap?.leads?.find(x=>String(x.id)===String(selectedLeadId))}
function hasEvent(snap,action,outcome){return Boolean(snap?.events?.some(x=>String(x.lead_id)===String(selectedLeadId)&&x.action===action&&x.outcome===outcome))}
function chooseLeadInFrame(){
 if(!selectedLeadId)return;
 const doc=currentDocument();if(!doc)return;
 let selected=doc.querySelector('#selected')?.textContent||'';
 const lead=chosenLead(lastSnapshot);
 if(lead && selected.includes(lead.name))return;
 const button=doc.querySelector('button[data-lead-id="'+selectedLeadId+'"]');
 if(button && !button.disabled)button.click();
}
async function verify(st){
 const doc=currentDocument();
 if(st.proof==='navigation'){
  try{return new URL(currentUrl()).pathname.endsWith('/gestione/lettere-stampa/')}catch(_){return false}
 }
 if(st.proof==='pdf')return pdfSuccess;
 if(st.proof.startsWith('model:'))return doc?.getElementById('document')?.dataset.currentModel===st.proof.split(':')[1];
 if(st.proof==='qr')return doc?.getElementById('result')?.dataset.test==='qr';
 if(st.proof==='approval')return doc?.getElementById('result')?.dataset.test==='approval';
 if(st.proof.startsWith('slot:'))return doc?.getElementById('slot-'+st.proof.split(':')[1])?.dataset.done==='yes';
 if(st.proof.startsWith('track:'))return doc?.getElementById('board')?.dataset.track===st.proof.split(':')[1];
 if(st.proof==='channels')return doc?.getElementById('board')?.dataset.sending==='blocked';
 if(st.proof.startsWith('gate:'))return doc?.getElementById('gate-'+st.proof.split(':')[1])?.checked===true;
 if(st.proof==='gates-complete')return doc?.getElementById('board')?.dataset.gatesPassed==='yes';
 if(st.proof==='marketing-checked')return doc?.getElementById('selectedMarketing')?.checked===true;
 if(st.proof==='transfer-checked')return doc?.getElementById('selectedTransfer')?.checked===true;
 const state=await snapshot();
 if(!state)return false;
 if(st.proof==='created'){
  const lead=state.leads?.find(x=>x.id>beforeCount);
  if(lead){selectedLeadId=String(lead.id);return true}return false;
 }
 const l=chosenLead(state);if(!l)return false;
 if(st.proof==='qualified')return ['QUALIFICATO','FOLLOW_UP','APPUNTAMENTO','TRASFERITO','CHIUSO'].includes(l.status);
 if(st.proof==='blocked-followup')return hasEvent(state,'followup','blocked');
 if(st.proof==='marketing-saved')return l.marketing_optin===true;
 if(st.proof==='followup')return hasEvent(state,'followup','simulated');
 if(st.proof==='blocked-handoff')return hasEvent(state,'handoff','blocked');
 if(st.proof==='transfer-saved')return l.transfer_optin===true;
 if(st.proof==='handedoff')return ['TRASFERITO','CHIUSO'].includes(l.status)&&hasEvent(state,'handoff','simulated')&&gateSuccess;
 if(st.proof==='closed')return l.status==='CHIUSO';
 if(st.proof==='stopped')return l.status==='NON_CONTATTARE'&&!l.marketing_optin&&!l.transfer_optin;
 return false;
}
async function stageReady(st){
 if(st.proof==='created'){const s=await snapshot();beforeCount=s?.leads?.reduce((n,x)=>Math.max(n,x.id),0)||0}
 if(st.module==='funnel'){await snapshot();chooseLeadInFrame()}
}
function renderStep(){
 if(closed)return;
 const group=FLOWS[flow],st=stageNow();
 $('flowtitle').textContent=group.title;
 $('flowsubtitle').textContent='Stessa schermata nei due pannelli. Esegui il clic soltanto a sinistra; il risultato viene verificato.';
 $('steptitle').textContent=st.title;
 $('step-label').textContent='AZIONE '+(index+1)+' DI '+group.steps.length;
 $('instructions').textContent=st.instruction;
 $('hint').textContent='COSA DEVE SUCCEDERE: '+st.result;
 $('warning').textContent='SIMULAZIONE: nessun dato reale, nessuna trattativa o valutazione professionale, nessun invio. I gate legali per uso reale richiedono verifica umana.';
 $('progress').style.width=((index+1)/group.steps.length*100)+'%';
 $('counter').textContent=(index+1)+' / '+group.steps.length+' · Avanzamento dopo clic verificato';
 $('mirrorlabel').textContent='Comando in preparazione...';
 notice('ATTESA: premi il comando evidenziato nella pagina OPERATIVA.');
 $('module').innerHTML='';
 const option=document.createElement('option');option.value=st.module;option.textContent=st.module.toUpperCase();$('module').append(option);
 $('moduletitle').textContent='GESTIONALE · '+st.module.toUpperCase();
 const href=stageUrl(st);
 const present=new URL(currentUrl(),location.href);
 const target=new URL(href,location.origin);
 const same=present.pathname===target.pathname && present.search===target.search;
 if(!same){W.src=href;M.src=href;frameModule=st.module}
 else{
  frameModule=st.module;refreshMirror();
  Promise.resolve(stageReady(st)).then(()=>{focus();setTimeout(focus,240)});
 }
}
async function progress(){
 if(working)return;
 working=true;const st=stageNow(),token=++processToken;
 notice('Verifico il risultato dell’operazione nel gestionale...',false);
 let success=false;
 for(let count=0;count<32;count++){
  if(token!==processToken)break;
  await wait(180);
  if(await verify(st)){success=true;break}
 }
 working=false;
 if(token!==processToken)return;
 if(success)syncMirrorState();
 if(!success){notice('Operazione non confermata. Il passaggio resta BLOCCATO: ripeti il clic corretto.',false);focus();return}
 notice('OPERAZIONE VERIFICATA: '+st.result,true);
 status('Confermato: '+st.title);
 await wait(st.proof==='pdf'?850:450);
 if(token!==processToken)return;
 if(index+1>=FLOWS[flow].steps.length){
  closed=true;
  $('mirrorlabel').textContent='PROCEDURA COMPLETATA · Nessun invio reale';
  status('Percorso terminato. Scegli un altro flusso oppure «Ricomincia procedura».');
  return;
 }
 index++;renderStep();
}
function handleAction(ev){
 if(closed||working||!currentDocument())return;
 const st=stageNow(),node=ev.target.closest?.(st.target);
 const action=ev.target.closest?.('button[data-action="handoff"]');
 if(action){
  const allowed=flow==='handoff'&&(st.proof==='blocked-handoff'||(st.proof==='handedoff'&&gateSuccess));
  if(!allowed){ev.preventDefault();ev.stopImmediatePropagation();status('Handoff TEST vietato in questo step. Completa i sette gate e il permesso di prova.');return}
 }
 if(!node)return;
 if(ev.type!==st.event)return;
 if(node.disabled){notice('Il pulsante è disabilitato dallo stato corrente del gestionale.',false);return}
 if(st.proof==='navigation'){
  ev.preventDefault();ev.stopImmediatePropagation();
  const href=node.getAttribute('href');
  const url=href?new URL(href,currentUrl()):null;
  if(!url||url.origin!==location.origin){notice('Il link non è interno al laboratorio.',false);return}
  W.src=url.href;
  progress();return;
 }
 if(st.proof==='pdf'){
  ev.preventDefault();ev.stopImmediatePropagation();
  const href=node.getAttribute('href');
  const url=href?new URL(href,currentUrl()):null;
  if(!url||url.origin!==location.origin){notice('PDF esterno non ammesso in test.',false);return}
  (async()=>{
   try{
    const res=await fetch(url.href,{method:'HEAD',cache:'no-store'});
    if(!res.ok||!/pdf/i.test(res.headers.get('content-type')||''))throw Error('PDF non accessibile');
    pdfSuccess=true;W.src=url.href;progress()
   }catch(_){notice('PDF assente o non verificabile: il flusso resta bloccato.',false)}
  })();return;
 }
 if(st.proof==='gates-complete' && ev.type==='click'){
  // Actual checkbox state is checked by the training page after this click.
  setTimeout(()=>{if(currentDocument()?.getElementById('board')?.dataset.gatesPassed==='yes')gateSuccess=true},60);
 }
 progress();
}
function onMainLoad(){
 if(closed)return;
 const doc=currentDocument(),st=stageNow();
 if(!doc)return;
 // Never let internal target=_blank launch an unrelated window during training.
 doc.addEventListener('click',handleAction,true);
 doc.addEventListener('change',handleAction,true);
 refreshMirror();
 Promise.resolve(stageReady(st)).then(()=>{
  setTimeout(()=>{chooseLeadInFrame();focus()},350);
  setTimeout(focus,1050);
 });
}
function onMirrorLoad(){
 if(closed)return;
 const doc=M.contentDocument;if(!doc)return;
 // The duplicate is a visual copy and must NEVER mutate the synthetic CRM.
 M.style.pointerEvents='none';
 try{doc.documentElement.style.setProperty('user-select','none')}catch(_){}
 showHighlight(doc,stageNow().target,true);
 if(stageNow().module==='funnel'){
  doc.getElementById('reload')?.click(); // GET-only refresh: no synthetic write.
  if(selectedLeadId){
   setTimeout(()=>{
    const button=doc.querySelector('button[data-lead-id="'+selectedLeadId+'"]');
    if(button)button.click();
    syncMirrorState();focus();
   },520);
  }
 }
 setTimeout(syncMirrorState,320);
 $('mirrorstatus').textContent='Copia visuale sincronizzata';
}
function startFlow(key){
 if(!FLOWS[key])return;
 processToken++;working=false;closed=false;pdfSuccess=false;gateSuccess=false;selectedLeadId=null;lastSnapshot=null;beforeCount=0;
 flow=key;index=0;$('flow').value=flow;
 renderStep();
}
$('flow').addEventListener('change',e=>startFlow(e.target.value));
$('reset').addEventListener('click',()=>startFlow(flow));
$('focus-element').addEventListener('click',focus);
$('open-module').addEventListener('click',()=>{W.src=stageUrl(stageNow());M.src=stageUrl(stageNow());});
$('workframe').addEventListener('load',onMainLoad);
$('mirrorframe').addEventListener('load',onMirrorLoad);
$('flip').addEventListener('click',()=>$('workspace').classList.toggle('reversed'));
$('copy-report').addEventListener('click',()=>{
 const report=['ZERO TO DIAMOND · SIMULAZIONE SPECCHIO','Flusso: '+FLOWS[flow].title,
   'Ultimo step: '+stageNow().title,'Stato: '+(closed?'COMPLETATO':'IN LAVORAZIONE'),
   'Canale: '+(dbAvailable?'SQLite TEST':'Anteprima statica'),'Nessun invio reale.'].join('\n');
 navigator.clipboard?.writeText(report).then(()=>status('Rapporto copiato.'),()=>status('Copia non disponibile.'));
});
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{
 $('workspace').dataset.mobile=btn.dataset.view;
 document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===btn));
}));
$('module').disabled=true;
$('prev').disabled=true;$('next').disabled=true;
startFlow('materiali');
snapshot();
})();