'use strict';
/* Antica Cappella: local editorial studio. This file never calls Meta or Supabase. */
const DB_NAME='antica-cappella-editor-v1',STORE='photos',TZ='Europe/Rome',PHONE='011 931 1155';
const $=id=>document.getElementById(id);
let db=null,photos=[],drafts=[],previews=[];
const say=(text)=>{$('message').textContent=text;};
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined&&text!==null)el.textContent=text;if(cls)el.className=cls;return el;}
function err(e){say('Operazione non riuscita: '+(e&&e.message?e.message:String(e)));}
function openDatabase(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(new Error('Archiviazione locale non disponibile.'));return;}const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Database locale non disponibile.'));});}
function transaction(mode,operation){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE),request=operation(store);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Errore archivio.'));});}
const getAll=()=>transaction('readonly',store=>store.getAll());
const savePhoto=photo=>transaction('readwrite',store=>store.put(photo));
const deletePhoto=id=>transaction('readwrite',store=>store.delete(id));
function clearPreviews(){for(const url of previews)URL.revokeObjectURL(url);previews=[];}
function hasMetadata(photo){return Boolean(photo.title&&photo.title.trim()&&photo.description&&photo.description.trim()&&photo.category&&photo.category!=='altro');}
function updateCounters(){$('photoCount').textContent=String(photos.length);$('draftCount').textContent=String(drafts.length);}
function invalidatePlan(){drafts=[];$('draftRows').replaceChildren();$('exportCsv').disabled=true;$('exportJson').disabled=true;$('planStatus').textContent='L’archivio è cambiato. Rigenera il piano prima di esportarlo.';updateCounters();}
function renderPhotos(){
 clearPreviews();const gallery=$('gallery');gallery.replaceChildren();updateCounters();
 if(!photos.length){gallery.append(node('p','Non hai ancora caricato fotografie.'));return;}
 for(const photo of photos){
  const card=node('article',null,'photo-card');
  const thumb=node('img');thumb.alt=photo.title||'Fotografia importata';thumb.loading='lazy';const url=URL.createObjectURL(photo.blob);previews.push(url);thumb.src=url;card.append(thumb);
  const body=node('div',null,'photo-info');body.append(node('small',photo.fileName));
  const title=node('label','Titolo riconoscibile');const ti=node('input');ti.value=photo.title||'';ti.maxLength=130;title.append(ti);body.append(title);
  const kind=node('label','Categoria');const sel=node('select');
  [['altro','Da classificare'],['cucina','Piatto / cucina'],['sala','Sala / ambiente'],['evento','Evento'],['tradizione','Tradizione'],['team','Persone / servizio'],['esterno','Esterno / territorio']].forEach(([value,label])=>{const opt=node('option',label);opt.value=value;sel.append(opt);});sel.value=photo.category||'altro';kind.append(sel);body.append(kind);
  const note=node('label','Descrivi ciò che mostra la foto (dati verificati)');const textarea=node('textarea');textarea.value=photo.description||'';textarea.rows=3;textarea.maxLength=450;textarea.placeholder='Es. Tavola allestita per un ricevimento; non inventare ingredienti o prezzi.';note.append(textarea);body.append(note);
  const save=node('button','Salva descrizione','secondary');save.type='button';save.onclick=async()=>{const updated={...photo,title:ti.value.trim(),category:sel.value,description:textarea.value.trim()};try{await savePhoto(updated);Object.assign(photo,updated);invalidatePlan();say('Descrizione salvata per '+(photo.title||photo.fileName)+'.');renderPhotos();}catch(e){err(e);}};
  const remove=node('button','Elimina','danger');remove.type='button';remove.onclick=async()=>{if(!confirm('Eliminare questa fotografia dall’archivio locale?'))return;try{await deletePhoto(photo.id);photos=photos.filter(p=>p.id!==photo.id);invalidatePlan();renderPhotos();say('Foto eliminata dal browser.');}catch(e){err(e);}};
  const row=node('div',null,'actions');row.append(save,remove);
  body.append(node('p',hasMetadata(photo)?'Pronta per le bozze':'Da completare: titolo, categoria e descrizione.',hasMetadata(photo)?'valid-note':'needs-note'),row);card.append(body);gallery.append(card);
 }
}
async function importFiles(input){
 if(!db){say('Archivio locale non disponibile: non è possibile salvare fotografie.');return;}
 const files=[...input].filter(f=>f.type==='image/jpeg'||f.type==='image/png'||f.type==='image/webp');
 if(!files.length){say('Seleziona file JPG, PNG o WEBP.');return;}
 let count=0,skipped=0;
 for(const file of files){
  if(file.size>25*1024*1024){skipped++;continue;}
  const exists=photos.some(p=>p.fileName===file.name&&p.size===file.size&&p.lastModified===file.lastModified);
  if(exists){skipped++;continue;}
  const title=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim();
  const id=(crypto.randomUUID?crypto.randomUUID():'foto-'+Date.now()+'-'+Math.random().toString(36).slice(2));
  const photo={id,fileName:file.name,blob:file,size:file.size,lastModified:file.lastModified,title,category:'altro',description:'',createdAt:Date.now()};
  try{await savePhoto(photo);photos.push(photo);count++;}catch(e){err(e);break;}
 }
 invalidatePlan();renderPhotos();say(count+' fotografia/e importate nel browser. '+(skipped?skipped+' ignorate (duplicate, non supportate o oltre 25 MB). ':'')+'Aggiungi descrizioni reali prima di generare le bozze.');
}
const introductions={
 cucina:['Dalla nostra cucina, un dettaglio da scoprire:','La cucina si racconta anche attraverso questa immagine:','Un momento dedicato ai sapori e alla tavola:','Dietro ogni fotografia c’è una scelta di cucina:'],
 sala:['Gli spazi raccontano come ci piace accogliere:','Ci sono luoghi che fanno parte di un incontro:','Prima ancora del menù, c’è l’atmosfera:','Un dettaglio degli ambienti di Antica Cappella:'],
 evento:['La cornice di un momento da condividere:','Le occasioni speciali meritano attenzione:','Uno sguardo agli eventi in Antica Cappella:','Quando un evento diventa un ricordo:'],
 tradizione:['La tradizione prende forma nei piccoli dettagli:','Ad Avigliana, una storia di convivialità:','C’è una storia dietro a questo scatto:','La nostra identità passa anche da qui:'],
 team:['L’accoglienza è fatta di persone e gesti:','Dietro il servizio, la cura dei dettagli:','Il lavoro di squadra si vede anche nei momenti semplici:','Uno sguardo a chi rende viva Antica Cappella:'],
 esterno:['Un angolo di Avigliana da riconoscere:','Il contesto fa parte dell’esperienza:','Antica Cappella, vista da un’altra prospettiva:','Un luogo da ritrovare nel territorio:']
};
const endingsFB=[
 'Ti piacerebbe vivere un momento così? Chiamaci per informazioni e prenotazioni.',
 'Per organizzare una visita o un’occasione speciale, contattaci direttamente.',
 'Quale dettaglio ti colpisce di più? Scrivilo nei commenti e chiamaci per prenotare.',
 'La tua prossima occasione può iniziare da una telefonata: chiedici disponibilità.',
 'Un tavolo, una ricorrenza, un incontro: raccontaci cosa hai in mente.',
 'Con chi condivideresti questa esperienza? Per prenotare, chiamaci.',
 'Vuoi conoscere la proposta del momento? Chiamaci, così possiamo darti informazioni aggiornate.'
];
const endingsIG=[
 'Salva questo scatto e chiamaci per prenotare.',
 'Con chi verresti? Scrivilo nei commenti e chiamaci per le disponibilità.',
 'Un momento da segnare. Per prenotazioni, chiamaci direttamente.',
 'Scopri Antica Cappella ad Avigliana: informazioni e tavoli per telefono.',
 'I dettagli contano. Per organizzare il tuo momento, chiamaci.',
 'Condividi questo scatto con chi inviteresti a tavola.',
 'Ti aspettiamo ad Avigliana: per verificare disponibilità, chiamaci.'
];
function caption(photo,platform,day,slot,index){
 const intro=introductions[photo.category]||introductions.tradizione;
 const variant=(day*3+slot+index)%intro.length;
 const focus=photo.description.trim().replace(/[.!?\s]+$/,'');
 const credit=((day+slot)%7===3)?'\n\nStrategia e comunicazione digitale: Joseph Malafronte · Digital Strategist.':'';
 if(platform==='facebook'){
  return intro[variant]+' '+focus+'.\n\n'+endingsFB[(day*3+slot+index)%endingsFB.length]+'\nPrenotazioni Antica Cappella · '+PHONE+' · Via Lino Maritano 10, Avigliana.'+credit;
 }
 const start=['Dettagli che raccontano Antica Cappella.','La nostra storia in uno scatto.','Un momento da condividere ad Avigliana.','Un’immagine, tante sensazioni.'][(day+slot+index)%4];
 return start+'\n\n'+focus+'.\n\n'+endingsIG[(day*3+slot+index)%endingsIG.length]+'\nPrenotazioni: '+PHONE+'.\n\n#AnticaCappella #Avigliana #RistoranteAvigliana #ValleDiSusa'+credit;
}
function italianDate(value){const [y,m,d]=value.split('-');return d+'/'+m+'/'+y;}
function nextDate(base,offset){const [y,m,d]=base.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+offset)).toISOString().slice(0,10);}
function generateDrafts(){
 const ready=photos.filter(hasMetadata).sort((a,b)=>a.createdAt-b.createdAt);
 if(ready.length<3){say('Servono almeno 3 fotografie con titolo, categoria e descrizione verificata per 3 post diversi al giorno.');return;}
 const start=$('startDate').value,days=Number($('days').value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||![1,7,14,30].includes(days)){say('Seleziona una data e una durata valida.');return;}
 drafts=[];const times=['10:00','16:00','20:00'];
 for(let day=0;day<days;day++)for(let slot=0;slot<3;slot++){
  const index=(day*3+slot)%ready.length,photo=ready[index];
  for(const platform of ['facebook','instagram'])drafts.push({date:nextDate(start,day),time:times[slot],timezone:TZ,platform,imageId:photo.id,imageFilename:photo.fileName,imageTitle:photo.title,description:photo.description,caption:caption(photo,platform,day,slot,index),status:'BOZZA_NON_PUBBLICATA'});
 }
 renderDrafts();const warning=ready.length<days*3?' Alcune foto verranno riutilizzate; ampliare l’archivio riduce le ripetizioni.':'';
 $('planStatus').textContent=days+' giorni · '+drafts.length+' bozze (3 Facebook + 3 Instagram al giorno). Nessuna pubblicazione inviata a Meta.'+warning;
 say('Bozze create. Rivedi ogni caption e usa Esporta CSV o JSON per salvarle.');
}
function renderDrafts(){
 const tbody=$('draftRows');tbody.replaceChildren();updateCounters();
 $('exportCsv').disabled=!drafts.length;$('exportJson').disabled=!drafts.length;
 for(const d of drafts){
  const tr=node('tr');tr.append(node('td',italianDate(d.date)+' · '+d.time),node('td',d.platform==='facebook'?'Facebook':'Instagram'),node('td',d.imageTitle+'\n'+d.imageFilename,'filename'));
  const td=node('td');const t=node('textarea');t.rows=4;t.value=d.caption;t.setAttribute('aria-label','Caption '+d.platform+' '+d.date+' '+d.time);t.oninput=()=>{d.caption=t.value;};td.append(t);
  const actions=node('div',null,'actions');const copy=node('button','Copia testo','secondary');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(t.value);say('Caption copiata negli appunti.');}catch(e){err(e);}};actions.append(copy);td.append(actions);
  tr.append(td,node('td','Bozza\nnon inviata','draft-state'));tbody.append(tr);
 }
}
function csvCell(value){let v=String(value??'');if(/^[\s]*[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function exportCsv(){if(!drafts.length)return;const cols=['date','time','timezone','platform','imageFilename','imageTitle','description','caption','status'];const lines=[cols.join(';'),...drafts.map(d=>cols.map(c=>csvCell(d[c])).join(';'))];download('antica-cappella-piano-social.csv','\uFEFF'+lines.join('\r\n'),'text/csv;charset=utf-8');say('CSV esportato. Le immagini non sono incluse nel CSV.');}
function exportJson(){if(!drafts.length)return;download('antica-cappella-piano-social.json',JSON.stringify({version:1,client:'antica-cappella',generatedAt:new Date().toISOString(),publicationStatus:'DRAFT_ONLY',note:'Nessun post inviato a Meta; immagini conservate solo nel browser.',drafts},null,2),'application/json');say('JSON esportato. Le immagini non sono incluse nel file.');}
function setup(){
 $('startDate').value=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 $('photoInput').addEventListener('change',async e=>{await importFiles(e.target.files);e.target.value='';});
 const drop=$('dropzone');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',async e=>{e.preventDefault();drop.classList.remove('dragover');await importFiles(e.dataTransfer.files);});
 $('generate').onclick=generateDrafts;$('exportCsv').onclick=exportCsv;$('exportJson').onclick=exportJson;
}
(async function init(){setup();try{db=await openDatabase();photos=await getAll();photos.sort((a,b)=>a.createdAt-b.createdAt);renderPhotos();say('Studio pronto senza accesso tramite codice. Le fotografie restano su questo dispositivo.');}catch(e){err(e);$('photoInput').disabled=true;}})();
