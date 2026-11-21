/* CRM Farming di zona: due schede. Pubblico solo codice, mai dati cliente o PESA.
   Storico e Notizie vengono letti localmente dallo stesso browser.
   PESA è cifrato localmente con AES-GCM e password non salvata. */
(function(){
'use strict';
const E=window.CASE247FarmingResults, L=window.CASE247CRMLogic;
if(!E||!L){document.body.textContent='Modulo CRM non disponibile. Aggiorna la pagina.';return;}
const HISTORY_KEY='case247-farming-daily-history-v1';
const NEWS_KEY='case247-lab-avigliana-v1';
const PESA_KEY='case247-pesa-aes-gcm-v1';
const $=id=>document.getElementById(id);
const DATES=L.dates();
let rows=[],sourceSnapshot='',activeTab='acquisizione';
let pesa=null,pesaKey=null,pesaSalt=null,saveQueue=Promise.resolve();
let xlsxLoading=null;
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Rome'});
const fmt=n=>Number(n).toLocaleString('it-IT',{maximumFractionDigits:2});
function notice(id,message,isError=false){
 const el=$(id);if(!el)return;
 el.textContent=message;
 el.classList.toggle('danger',!!isError);
}
function safeJSON(raw,fallback){
 try{return JSON.parse(raw);}catch(_){return fallback;}
}
function setTab(name){
 activeTab=name;
 for(const id of ['acquisizione','pesa']){
   const selected=id===name;
   $(id).classList.toggle('active',selected);
   $(id).hidden=!selected;
   const tab=$(id==='acquisizione'?'tabAcq':'tabPesa');
   tab.setAttribute('aria-selected',String(selected));
 }
}
$('tabAcq').addEventListener('click',()=>setTab('acquisizione'));
$('tabPesa').addEventListener('click',()=>setTab('pesa'));
function createNode(tag,text,cls){
 const el=document.createElement(tag);
 el.textContent=String(text??'');
 if(cls)el.className=cls;
 return el;
}
function refreshFarming(force=false){
 let hRaw,nRaw;
 try{
   hRaw=localStorage.getItem(HISTORY_KEY)||'[]';
   nRaw=localStorage.getItem(NEWS_KEY)||'{"contacts":[]}';
 }catch(e){notice('syncStatus','Memoria browser non disponibile: controlla le impostazioni.',true);return;}
 const signature=hRaw+'\x1f'+nRaw;
 if(!force&&signature===sourceSnapshot)return;
 let h,n;
 try{
   h=JSON.parse(hRaw);n=JSON.parse(nRaw);
   if(!Array.isArray(h)||!n||typeof n!=='object')throw Error('Formato non valido');
   if(!Array.isArray(n.contacts))n.contacts=[];
 }catch(e){
   notice('syncStatus','Registri non leggibili: recupera il backup prima di procedere.',true);
   return;
 }
 try{rows=E.consolidate(h,n.contacts);}
 catch(e){notice('syncStatus','Errore nel consolidamento del Farming.',true);return;}
 sourceSnapshot=signature;
 renderAcquisition();
 notice('syncStatus','Aggiornamento automatico locale · '+new Date().toLocaleTimeString('it-IT',{timeZone:'Europe/Rome'})+' · '+rows.length+' schede');
}
function renderAcquisition(){
 const totals=[rows.length,0,0,0,0,0];
 for(const r of rows)for(let i=0;i<5;i++)totals[i+1]+=Number(r[i+5])||0;
 const labels=['Schede cliente/immobile','Volantini consegnati','Lettere consegnate','Notizie verificate','Risposte ricevute','Incontri svolti'];
 $('stats').replaceChildren(...labels.map((label,i)=>{
   const d=document.createElement('div');d.className='stat';
   d.append(createNode('strong',fmt(totals[i])),createNode('span',label));return d;
 }));
 const q=$('filter').value.trim().toLocaleLowerCase('it');
 const listed=q?rows.filter(r=>[r[1],r[2],r[3],r[4]].some(v=>String(v).toLocaleLowerCase('it').includes(q))):rows;
 const body=$('acqRows'),fragment=document.createDocumentFragment();
 for(const r of listed){
   const tr=document.createElement('tr');
   r.forEach((v,i)=>tr.appendChild(createNode('td',i===0?L.displayDate(v):v,i>=5&&i<=9?'num':'')));
   fragment.appendChild(tr);
 }
 if(!listed.length){
   const tr=document.createElement('tr'),td=createNode('td',q?'Nessuna scheda corrispondente.':'Nessun risultato concluso registrato nel Farming.');
   td.colSpan=12;tr.appendChild(td);fragment.appendChild(tr);
 }
 body.replaceChildren(fragment);
}
$('refresh').addEventListener('click',()=>refreshFarming(true));
$('filter').addEventListener('input',renderAcquisition);
window.addEventListener('storage',event=>{
 if(event.key===HISTORY_KEY||event.key===NEWS_KEY)refreshFarming(true);
 if(event.key===PESA_KEY&&pesa)notice('pesaMessage','Archivio PESA modificato in un’altra scheda. Blocca e sblocca per ricaricare.',true);
});
window.addEventListener('focus',()=>refreshFarming());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFarming();});
window.setInterval(()=>{if(!document.hidden)refreshFarming();},4000);
function containsPhone(value){return /(?:\+?\d[\s().-]*){7,}/.test(String(value||''));}
$('resultForm').elements.date.value=today();
$('resultForm').addEventListener('submit',event=>{
 event.preventDefault();
 const obj=Object.fromEntries(new FormData(event.currentTarget).entries());
 if(!L.isValidResult(obj)){notice('resultMessage','Compila data, comune, indirizzo, riferimento e quantità valida.',true);return;}
 if([obj.comune,obj.zone,obj.address,obj.immobile].some(containsPhone)){
   notice('resultMessage','Rimuovi numeri di telefono o altri recapiti dai campi prima di registrare.',true);return;
 }
 let history;
 try{
   history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
   if(!Array.isArray(history))throw Error('Formato storico');
 }catch(e){notice('resultMessage','Storico non leggibile. Non sovrascrivo i tuoi dati.',true);return;}
 const entry={
   id:'crm-live-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2)),
   date:obj.date,comune:obj.comune.trim(),zone:obj.zone.trim()||'Da verificare',
   address:obj.address.trim(),immobile:obj.immobile.trim(),
   type:obj.type,quantity:Number(obj.quantity),outcome:'Completato',
   source:'CRM Farming · risultato verificato',followDate:'',followTime:'',followStatus:'Completato',
   crmId:'',notes:''
 };
 try{history.push(entry);localStorage.setItem(HISTORY_KEY,JSON.stringify(history));}
 catch(e){notice('resultMessage','Salvataggio locale non riuscito. Nessun risultato registrato.',true);return;}
 refreshFarming(true);
 $('resultForm').elements.quantity.value='1';
 $('resultForm').elements.date.value=today();
 notice('resultMessage','Risultato salvato nel diario Farming e consolidato nella scheda cliente.');
});
function downloadText(name,contents,mime){
 const blob=new Blob([contents],{type:mime}),url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=name;
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
$('csvExport').addEventListener('click',()=>{
 refreshFarming();
 if(!rows.length){notice('syncStatus','Non ci sono risultati conclusi da esportare.',true);return;}
 downloadText('CASE247_Risultati_Farming_'+today()+'.csv',E.csv(rows),'text/csv;charset=utf-8');
 notice('syncStatus',rows.length+' schede esportate in CSV. Il file .xlsm si aggiorna tramite la macro Excel.');
});
// --------- PESA: cifratura locale AES-GCM (nessun dato sensibile in chiaro sul server) ----
function b64(bytes){let text='';for(const c of bytes)text+=String.fromCharCode(c);return btoa(text);}
function fromB64(value){return Uint8Array.from(atob(value),x=>x.charCodeAt(0));}
async function derive(password,salt){
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},
   material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function validatePesaData(data){
 if(!data||typeof data!=='object'||!data.weights||typeof data.weights!=='object'||Array.isArray(data.weights))throw Error('PESA non valido');
 let height=Number(data.height),weights={};
 for(const [d,w] of Object.entries(data.weights)){
   if(!DATES.includes(d))continue;
   const value=Number(w);
   if(Number.isFinite(value)&&value>0&&value<=500)weights[d]=value;
 }
 if(!Number.isFinite(height)||height<50||height>250)height=null;
 return {height,weights};
}
async function persistPesa(){
 if(!pesaKey||!pesa||!pesaSalt)throw Error('Archivio PESA bloccato');
 const snapshot=JSON.stringify(pesa);
 const key=pesaKey,salt=b64(pesaSalt);
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
   const iv=crypto.getRandomValues(new Uint8Array(12));
   const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(snapshot));
   const sealed=JSON.stringify({version:1,salt,iv:b64(iv),payload:b64(new Uint8Array(ciphertext))});
   localStorage.setItem(PESA_KEY,sealed);
 });
 try{await saveQueue;}catch(e){notice('pesaMessage','Salvataggio cifrato non riuscito: controlla lo spazio del browser.',true);throw e;}
}
function updateUnlockHint(){
 const exists=!!localStorage.getItem(PESA_KEY);
 $('unlockHint').textContent=exists?'Archivio presente: inserisci la password già scelta.':'Primo accesso: scegli una password di almeno 10 caratteri.';
}
$('unlockPesa').addEventListener('click',async()=>{
 const pass=$('pesaPassword').value;
 if(pass.length<10){notice('unlockMessage','Inserisci almeno 10 caratteri.',true);return;}
 if(!window.isSecureContext||!crypto.subtle){notice('unlockMessage','Cifratura non disponibile in questo browser. Usa HTTPS.',true);return;}
 $('unlockPesa').disabled=true;
 try{
   const raw=localStorage.getItem(PESA_KEY),stored=raw?JSON.parse(raw):null;
   const salt=stored?fromB64(stored.salt):crypto.getRandomValues(new Uint8Array(16));
   const key=await derive(pass,salt);
   let data;
   if(stored){
     if(stored.version!==1)throw Error('Versione archivio non supportata');
     const buf=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(stored.iv)},key,fromB64(stored.payload));
     data=validatePesaData(JSON.parse(new TextDecoder().decode(buf)));
   }else data={height:null,weights:{}};
   pesa=data;pesaKey=key;pesaSalt=salt;
   if(!stored)await persistPesa();
   $('pesaPassword').value='';
   $('unlockArea').hidden=true;
   $('pesaPrivate').hidden=false;
   $('heightCm').value=pesa.height??'';
   initMonths();renderPesa();
   notice('unlockMessage','');
   notice('pesaMessage','PESA sbloccata. I dati sono memorizzati solo in forma cifrata sul dispositivo.');
 }catch(e){pesa=null;pesaKey=null;pesaSalt=null;notice('unlockMessage','Password errata oppure archivio danneggiato; nessun dato modificato.',true);}
 finally{$('unlockPesa').disabled=false;}
});
$('lockPesa').addEventListener('click',()=>{
 pesa=null;pesaKey=null;pesaSalt=null;
 $('pesaPrivate').hidden=true;$('unlockArea').hidden=false;
 $('pesaRows').replaceChildren();$('pesaKpis').replaceChildren();$('pesaChart').replaceChildren();
 updateUnlockHint();
});
$('pesaPassword').addEventListener('keydown',e=>{if(e.key==='Enter'){$('unlockPesa').click();e.preventDefault();}});
function initMonths(){
 const month=$('month'),selected=month.value||today().slice(0,7);
 const arr=[...new Set(DATES.map(d=>d.slice(0,7)))];
 month.replaceChildren(...arr.map(value=>{
  const opt=document.createElement('option');opt.value=value;
  opt.textContent=new Date(value+'-01T12:00:00Z').toLocaleDateString('it-IT',{year:'numeric',month:'long',timeZone:'UTC'});
  return opt;
 }));
 month.value=arr.includes(selected)?selected:arr[0];
}
$('month').addEventListener('change',renderPesa);
$('heightCm').addEventListener('change',async()=>{
 if(!pesa)return;
 const raw=$('heightCm').value.trim(),value=Number(raw);
 if(raw!==''&&(!Number.isFinite(value)||value<50||value>250)){
   notice('pesaMessage','Altezza valida: 50–250 cm.',true);return;
 }
 pesa.height=raw===''?null:value;
 await persistPesa();renderPesa();
});
$('pesaRows').addEventListener('change',async event=>{
 const input=event.target.closest('input[data-date]');
 if(!input||!pesa)return;
 const d=input.dataset.date,raw=input.value.trim(),value=Number(raw);
 if(raw!==''&&(!Number.isFinite(value)||value<=0||value>500)){
   notice('pesaMessage','Il peso deve essere un numero positivo fino a 500 kg.',true);renderPesa();return;
 }
 if(raw==='')delete pesa.weights[d];else pesa.weights[d]=value;
 await persistPesa();renderPesa();
 notice('pesaMessage','Pesata aggiornata e cifrata localmente.');
});
function renderPesa(){
 if(!pesa)return;
 const values=DATES.filter(d=>Object.hasOwn(pesa.weights,d)).map(d=>({date:d,weight:pesa.weights[d]}));
 const last=values[values.length-1],first=values[0],raw=last?L.bmi(last.weight,pesa.height):null;
 const bmiLabel=raw===null?'—':raw.toFixed(1).replace('.',',');
 const categories=[
 ['Ultimo peso',last?fmt(last.weight)+' kg':'—'],
 ['IMC',bmiLabel],
 ['Classificazione',raw===null?'—':L.classify(raw)],
 ['Variazione',last&&first?fmt(last.weight-first.weight)+' kg':'—']
 ];
 $('pesaKpis').replaceChildren(...categories.map(([label,val])=>{
  const d=document.createElement('div');d.append(createNode('span',label),createNode('strong',val));return d;
 }));
 const month=$('month').value;
 const fragment=document.createDocumentFragment();
 for(const d of DATES.filter(d=>d.slice(0,7)===month)){
  const tr=document.createElement('tr');
  tr.appendChild(createNode('td',L.displayDate(d)));
  const input=document.createElement('input');
  input.type='number';input.step='0.01';input.min='1';input.max='500';input.dataset.date=d;
  input.setAttribute('aria-label','Peso in kg del '+L.displayDate(d));
  if(Object.hasOwn(pesa.weights,d))input.value=String(pesa.weights[d]);
  const cell=document.createElement('td');cell.appendChild(input);tr.appendChild(cell);
  const kg=Object.hasOwn(pesa.weights,d)?pesa.weights[d]:null;
  const current=kg?L.bmi(kg,pesa.height):null;
  tr.appendChild(createNode('td',current===null?'—':fmt(Math.round(current*10)/10)));
  tr.appendChild(createNode('td',current===null?'—':L.classify(current)));
  fragment.appendChild(tr);
 }
 $('pesaRows').replaceChildren(fragment);
 paintChart(values);
}
function paintChart(values){
 const svg=$('pesaChart'),ns='http://www.w3.org/2000/svg';
 svg.replaceChildren();
 function el(name,props={},label){
   const v=document.createElementNS(ns,name);
   for(const [key,value] of Object.entries(props))v.setAttribute(key,String(value));
   if(label!==undefined)v.textContent=label;
   svg.appendChild(v);return v;
 }
 if(!values.length){el('text',{x:450,y:135,'text-anchor':'middle',fill:'#66717e','font-size':18},'Inserisci una pesata per visualizzare il grafico');return;}
 const margin={l:60,r:32,t:24,b:38},w=900-margin.l-margin.r,h=280-margin.t-margin.b;
 const all=values.map(x=>x.weight),min=Math.min(...all),max=Math.max(...all);
 const bottom=Math.max(0,min-Math.max(2,(max-min)*0.2)),top=max+Math.max(2,(max-min)*0.2);
 const start=Date.parse(L.START+'T12:00:00Z'),end=Date.parse(L.END+'T12:00:00Z');
 const x=d=>margin.l+(Date.parse(d+'T12:00:00Z')-start)/(end-start)*w;
 const y=v=>margin.t+(top-v)/(top-bottom)*h;
 for(let i=0;i<=4;i++){
   const yy=margin.t+i*h/4;
   el('line',{x1:margin.l,y1:yy,x2:margin.l+w,y2:yy,stroke:'#e6e3da','stroke-width':1});
   el('text',{x:margin.l-8,y:yy+4,'text-anchor':'end',fill:'#626b77','font-size':12},fmt(top-i*(top-bottom)/4));
 }
 const points=values.map(r=>x(r.date)+','+y(r.weight)).join(' ');
 if(values.length>1)el('polyline',{points,fill:'none',stroke:'#a67d2d','stroke-width':3,'stroke-linejoin':'round'});
 for(const r of values.length<=30?values:[values[0],values[values.length-1]]){
   el('circle',{cx:x(r.date),cy:y(r.weight),r:4,fill:'#a67d2d'});
 }
 el('text',{x:margin.l,y:270,fill:'#626b77','font-size':13},'21/11/2026');
 el('text',{x:margin.l+w,y:270,'text-anchor':'end',fill:'#626b77','font-size':13},'21/11/2027');
}
async function ensureXLSX(){
 if(window.XLSX)return window.XLSX;
 if(xlsxLoading)return xlsxLoading;
 xlsxLoading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  script.async=true;
  script.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Libreria XLSX non disponibile'));
  script.onerror=()=>reject(new Error('Impossibile caricare il modulo XLSX'));
  document.head.appendChild(script);
  setTimeout(()=>reject(new Error('Caricamento XLSX non disponibile')),20000);
 }).catch(e=>{xlsxLoading=null;throw e;});
 return xlsxLoading;
}
$('xlsxExport').addEventListener('click',async()=>{
 if(!pesa){setTab('pesa');notice('unlockMessage','Sblocca PESA per esportare entrambe le schede. Il CSV Farming è sempre disponibile.',true);return;}
 refreshFarming();
 $('xlsxExport').disabled=true;
 try{
   const X=await ensureXLSX();
   const acq=Array.from({length:7},()=>[]);
   acq[0]=['JOSEPH MALAFRONTE · FARMING DI ZONA | RISULTATI VERIFICATI'];
   acq[2]=['Solo lavori conclusi. Dati locali; nessun telefono.'];
   acq[6]=E.headers.slice();
   for(const r of rows)acq.push(r.slice());
   const wsA=X.utils.aoa_to_sheet(acq);
   wsA['!cols']=[17,22,25,28,30,19,19,19,18,18,40,36].map(w=>({wch:w}));
   const table=Array.from({length:7},()=>[]);
   table[0]=['PESA · REGISTRO ANNUALE'];
   table[5]=['Altezza (cm)',pesa.height??''];
   table[6]=['Data','Peso (kg)'];
   for(const date of DATES){
     const weight=Object.hasOwn(pesa.weights,date)?pesa.weights[date]:'';
     table.push([new Date(date+'T12:00:00'),weight]);
   }
   const wsP=X.utils.aoa_to_sheet(table,{cellDates:true});
   wsP['!cols']=[{wch:18},{wch:16},{wch:8},{wch:18}];
   for(let row=8;row<=7+DATES.length;row++){
     const cell=wsP['A'+row];
     if(cell)cell.z='dd/mm/yyyy';
   }
   const wb=X.utils.book_new();
   X.utils.book_append_sheet(wb,wsA,'Acquisizione');
   X.utils.book_append_sheet(wb,wsP,'PESA');
   X.writeFile(wb,'CASE247_Acquisizione_PESA_2_schede_'+today()+'.xlsx');
   notice('syncStatus','Workbook esportato con 2 soli fogli. Le macro del file .xlsm non sono incluse.');
 }catch(e){notice('syncStatus','Impossibile esportare Excel: '+e.message+'. Puoi sempre esportare il CSV.',true);}
 finally{$('xlsxExport').disabled=false;}
});
function toIso(cell,X){
 if(cell===null||cell===undefined||cell==='')return '';
 if(cell instanceof Date&&!Number.isNaN(cell.getTime())){
   return [cell.getFullYear(),String(cell.getMonth()+1).padStart(2,'0'),String(cell.getDate()).padStart(2,'0')].join('-');
 }
 if(typeof cell==='number'){
   const d=X.SSF.parse_date_code(cell);
   if(d)return [d.y,String(d.m).padStart(2,'0'),String(d.d).padStart(2,'0')].join('-');
 }
 const s=String(cell).trim();
 if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
 const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 return m?m[3]+'-'+m[2]+'-'+m[1]:'';
}
$('xlsxImport').addEventListener('change',async event=>{
 const file=event.target.files?.[0];
 if(!file||!pesa)return;
 try{
   const X=await ensureXLSX();
   const wb=X.read(await file.arrayBuffer(),{type:'array',cellDates:true});
   const sheet=wb.Sheets.PESA;
   if(!sheet||sheet.A7?.v!=='Data'||String(sheet.B7?.v)!=='Peso (kg)')throw Error('Foglio PESA non riconosciuto');
   const h=Number(sheet.B6?.v);
   if(Number.isFinite(h)&&h>=50&&h<=250)pesa.height=h;
   let count=0;
   for(let r=8;r<=550;r++){
     const date=toIso(sheet['A'+r]?.v,X);
     if(!DATES.includes(date))continue;
     const v=sheet['B'+r]?.v;
     if(v===''||v===null||v===undefined)continue;
     const value=Number(v);
     if(!Number.isFinite(value)||value<=0||value>500)continue;
     pesa.weights[date]=value;count++;
   }
   $('heightCm').value=pesa.height??'';
   await persistPesa();renderPesa();
   notice('pesaMessage','Importate '+count+' pesate dal foglio PESA. Dati salvati cifrati in questo browser.');
 }catch(e){notice('pesaMessage','Importazione Excel fallita: '+e.message,true);}
 finally{event.target.value='';}
});
updateUnlockHint();
setTab('acquisizione');
refreshFarming(true);
})();
