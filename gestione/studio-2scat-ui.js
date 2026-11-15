/* CASE247 — Studio 2S CAT: client-side extension. PDFs never leave this browser. */
(function(){
'use strict';
const S=window.CASE247Studio;if(!S)return;
const KEY='case247-cc-school-2scat-v1',TIMEKEY='case247-cc-school-reminder-time-v1';
let root,ctx,state,week,pending=null,source='',toggleForm;
const $=s=>root.querySelector(s);
const read=(key,def)=>{try{const v=JSON.parse(localStorage.getItem(key));return v===null?def:v}catch(_){return def}};
const save=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));return true}catch(_){ctx.notify('Memoria locale non disponibile; esporta un backup');return false}};
const node=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);if(cls)n.className=cls;return n};
const button=(label,callback)=>{const n=node('button',label);n.type='button';n.addEventListener('click',callback);return n};
const fmt=date=>new Intl.DateTimeFormat('it-IT',{timeZone:'UTC',day:'2-digit',month:'short'}).format(S.fromISO(date));
const getLessons=key=>state.weeks[S.monday(key)]?.rows||[];
const subjects=()=>[...new Set(Object.values(state.weeks).flatMap(a=>a.rows||[]).map(x=>x.subject))].sort((a,b)=>a.localeCompare(b,'it'));
function setup(){
const html=`<section id="cc-studio" class="cc-card cc-section" aria-label="STUDIO CLASSE 2S CAT">
 <div class="cc-head"><div><h2>STUDIO — CLASSE 2S CAT</h2><p>Orario, verifiche, interrogazioni e ripasso in un'unica agenda.</p></div></div>
 <div id="cc-school-reminder" class="cc-school-reminder cc-hidden" role="status"><b>È domenica. Carica il PDF dell'orario scolastico 2S CAT della prossima settimana per aggiornare la tua agenda.</b><div class="cc-actions"><button type="button" id="cc-reminder-upload">CARICA ORARIO PDF</button><button type="button" id="cc-reminder-view">VISUALIZZA ORARIO ATTUALE</button></div></div>
 <div class="cc-school-controls">
 <label>Settimana dal lunedì<input type="date" id="cc-school-week"></label>
 <label>Promemoria domenicale<input type="time" id="cc-school-time" value="09:00"></label>
 <button type="button" id="cc-school-upload">CARICA ORARIO PDF</button>
 <button type="button" id="cc-school-reference">Anteprima 16–20 novembre</button>
 <button type="button" id="cc-school-manual">Inserisci righe manualmente</button>
 <input type="file" id="cc-school-file" class="cc-hidden" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg">
 </div>
 <div class="cc-notice" id="cc-school-status" role="status" aria-live="polite"></div>
 <div id="cc-school-lessons"></div>
 <div id="cc-school-preview" class="cc-hidden"><h3>Anteprima — verifica e correggi prima di confermare</h3><p id="cc-school-source"></p>
 <div class="cc-school-table-wrap"><table class="cc-school-table"><thead><tr><th>Data</th><th>Dalle</th><th>Alle</th><th>Materia</th><th>Annotazioni</th><th>Stato riconoscimento</th><th></th></tr></thead><tbody id="cc-school-draft"></tbody></table></div>
 <div class="cc-actions"><button type="button" id="cc-school-addrow">+ Riga</button><button class="cc-primary" type="button" id="cc-school-confirm">CONFERMA E INSERISCI NELL'AGENDA</button><button type="button" id="cc-school-cancel">Annulla</button></div></div>
 <div class="cc-school-panel"><h3>Prossime verifiche e interrogazioni</h3><div id="cc-school-exams"></div></div>
 <div class="cc-school-panel"><h3>Conflitti con il lavoro</h3><div id="cc-school-overlap"></div></div>
 <div class="cc-actions"><button type="button" id="cc-school-export">Esporta orario scuola JSON</button><button type="button" id="cc-school-import">Importa orario scuola JSON</button><input id="cc-school-json" type="file" class="cc-hidden" accept=".json,application/json"></div>
 <p class="cc-sub">I file PDF vengono analizzati nel browser; per i PDF scansionati è disponibile OCR. La settimana seguente va caricata separatamente. Nessun documento viene pubblicato su GitHub.</p>
 </section>`;
root.querySelector('#cc-calendar').insertAdjacentHTML('afterend',html);
$('#cc-school-week').value=week;
$('#cc-school-time').value=read(TIMEKEY,'09:00');
$('#cc-school-week').onchange=e=>{if(e.target.value){week=S.monday(e.target.value);e.target.value=week;pending=null;render()}};
$('#cc-school-time').onchange=e=>{save(TIMEKEY,e.target.value||'09:00');render()};
$('#cc-school-upload').onclick=()=>$('#cc-school-file').click();
$('#cc-reminder-upload').onclick=()=>{week=S.monday(S.plusDays(S.localParts().date,1));$('#cc-school-week').value=week;$('#cc-school-file').click()};
$('#cc-reminder-view').onclick=()=>{week=S.monday(S.localParts().date);render();$('#cc-school-lessons').scrollIntoView({block:'nearest'})};
$('#cc-school-file').onchange=upload;
$('#cc-school-reference').onclick=()=>{week='2026-11-16';pending=S.reference(week);source='Riferimento testuale fornito dall’utente, da verificare con il PDF';renderDraft();render()};
$('#cc-school-manual').onclick=()=>{pending=getLessons(week).map(r=>({...r}));source='Inserimento manuale';pending.push(empty());renderDraft()};
$('#cc-school-addrow').onclick=()=>{pending.push(empty());renderDraft()};
$('#cc-school-cancel').onclick=()=>{pending=null;renderDraft()};
$('#cc-school-confirm').onclick=confirmDraft;
$('#cc-school-export').onclick=exportJSON;
$('#cc-school-import').onclick=()=>$('#cc-school-json').click();
$('#cc-school-json').onchange=importJSON;
}
function empty(){return {date:week,start:'17:00',end:'17:50',subject:'',notes:'',confidence:'da verificare'}}
function renderDraft(){
$('#cc-school-preview').classList.toggle('cc-hidden',!pending);
if(!pending)return;
$('#cc-school-source').textContent=source+' · L’orario non viene modificato prima della conferma.';
const tbody=$('#cc-school-draft');tbody.replaceChildren();
pending.forEach((r,i)=>{
 const tr=node('tr');
 [['date','date'],['start','time'],['end','time'],['subject','text'],['notes','text']].forEach(([key,type])=>{
  const td=node('td'),input=node('input');input.type=type;input.value=r[key]||'';input.maxLength=key==='notes'?260:85;input.setAttribute('aria-label',key+' riga '+(i+1));input.oninput=()=>pending[i][key]=input.value;td.append(input);tr.append(td);
 });
 const td=node('td'),sel=node('select');[['confermato','Confermato'],['da verificare','Da verificare']].forEach(([val,label])=>{const o=node('option',label);o.value=val;sel.append(o)});sel.value=r.confidence||'da verificare';sel.onchange=()=>pending[i].confidence=sel.value;td.append(sel);tr.append(td);
 const del=node('td');del.append(button('Rimuovi',()=>{pending.splice(i,1);renderDraft()}));tr.append(del);tbody.append(tr);
});
}
async function upload(e){
 const file=e.target.files?.[0];if(!file)return;
 const st=$('#cc-school-status');
 try{
  const read=await S.readFile(file,msg=>st.textContent=msg);
  const parsed=S.parseScheduleText(read.text,week);
  source=file.name+' · '+read.method;pending=parsed.rows;
  state.lastUpload=new Date().toISOString();state.lastSource=file.name.slice(0,110);
  st.textContent=parsed.found&&parsed.rows.length?parsed.rows.length+' lezioni estratte: controllale prima di confermare. '+parsed.warnings.join(' '):'La tabella ORARIO 2S CAT non è stata estratta in modo affidabile. '+parsed.warnings.join(' ')+' Usa + Riga per correggere.';
  renderDraft();
 }catch(err){st.textContent='PDF/immagine non leggibile: '+err.message+'. Puoi inserire le lezioni manualmente.'}
 finally{e.target.value=''}
}
function confirmDraft(){
 const rows=(pending||[]).map(r=>S.makeLesson(r,week));
 if(!rows.length||rows.some(r=>!r)){window.alert('Completa data, ore e materia di ogni riga. Le date devono appartenere alla settimana selezionata.');return}
 if(new Set(rows.map(S.lessonKey)).size!==rows.length){window.alert('Sono presenti lezioni duplicate. Correggi l’anteprima.');return}
 const diff=S.compareLessons(getLessons(week),rows);
 if(!window.confirm('Confermi le lezioni per la settimana del '+fmt(week)+'?\nAggiunte: '+diff.added.length+' · rimosse: '+diff.removed.length+' · invariate: '+diff.unchanged+'\nVerifiche, interrogazioni e attività manuali non saranno eliminate.'))return;
 state.weeks[week]={rows,updatedAt:new Date().toISOString(),status:'confermato',source:source.slice(0,140)};
 if(!save(KEY,state))return;
 pending=null;renderDraft();ctx.renderAll();
 ctx.notify('Orario 2S CAT confermato per la settimana del '+fmt(week));
}
function render(){
 if(!$('#cc-studio'))return;
 $('#cc-school-week').value=week;
 const item=state.weeks[week],rows=getLessons(week),status=$('#cc-school-status');
 status.textContent='Settimana '+fmt(week)+' · '+(item?'CONFERMATO · '+rows.length+' lezioni · ultimo aggiornamento '+new Date(item.updatedAt).toLocaleString('it-IT'):'DA CARICARE · nessun orario confermato')+(state.lastUpload?' · ultimo file selezionato '+new Date(state.lastUpload).toLocaleDateString('it-IT'):'');
 const target=$('#cc-school-lessons');target.replaceChildren();
 if(rows.length){
  const scroller=node('div',undefined,'cc-school-table-wrap'),table=node('table',undefined,'cc-school-table'),thead=node('thead'),h=node('tr');
  ['Data','Orario','Materia','Note','Stato'].forEach(t=>h.append(node('th',t)));thead.append(h);table.append(thead);
  const tbody=node('tbody');rows.forEach(r=>{const tr=node('tr');[fmt(r.date),r.start+'–'+r.end,r.subject,r.notes,r.confidence].forEach(value=>tr.append(node('td',value)));tbody.append(tr)});
  table.append(tbody);scroller.append(table);target.append(scroller);
  target.append(node('p','Materie: '+[...new Set(rows.map(x=>x.subject))].join(', '),'cc-sub'));
 }else target.append(node('p','Nessuna lezione confermata: l’orario non viene ripetuto automaticamente nelle altre settimane.','cc-sub'));
 const now=S.localParts(),isSunday=S.fromISO(now.date).getUTCDay()===0,next=S.monday(S.plusDays(now.date,1));
 $('#cc-school-reminder').classList.toggle('cc-hidden',!(isSunday&&now.time>=($('#cc-school-time').value||'09:00')&&!getLessons(next).length));
 renderExams();renderConflicts();
}
function renderExams(){
 const target=$('#cc-school-exams');target.replaceChildren();
 const today=S.localParts().date,exams=ctx.getTasks().filter(t=>t.project==='STUDIO'&&['SCUOLA VERIFICA','INTERROGAZIONE'].includes(t.schoolType)&&t.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,12);
 if(!exams.length){target.append(node('p','Nessuna verifica o interrogazione futura. Aggiungi attività → progetto STUDIO.','cc-sub'));return}
 const all=Object.values(state.weeks).flatMap(s=>s.rows||[]);
 exams.forEach(t=>{
  const box=node('div',undefined,'cc-school-exam');
  box.append(node('b',t.schoolType+' · '+(t.subject||t.title)),node('p',fmt(t.date)+' · '+t.time+' · '+(t.prepStatus||'da preparare')+(t.topics?' · '+t.topics:'')));
  const previous=all.filter(r=>S.normalize(r.subject)===S.normalize(t.subject||'')&&r.date<t.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(previous)box.append(node('small','Ultima lezione precedente: '+fmt(previous.date)+' '+previous.start));
  box.append(button('Modifica',()=>ctx.editTask(t.id)),button('Proponi ripasso',()=>suggest(t,all)));
  target.append(box);
 });
}
function suggest(t,all){
 const slots=S.suggestStudySlots(t.date,all,ctx.getTasks(),3);
 if(!slots.length){window.alert('Nessuna fascia libera proposta: inserisci manualmente una sessione di ripasso.');return}
 if(!window.confirm('Inserire le seguenti sessioni di STUDIO / RIPASSO?\n'+slots.map(x=>fmt(x.date)+' '+x.start+'–'+x.end).join('\n')))return;
 const existing=new Set(ctx.getTasks().map(x=>[x.date,x.time,x.schoolType,x.subject].join('|')));
 let added=0;
 slots.forEach(s=>{
  const key=[s.date,s.start,'STUDIO / RIPASSO',t.subject||''].join('|');if(existing.has(key))return;
  ctx.getTasks().push({id:'studio-'+Date.now()+'-'+added,date:s.date,time:s.start,duration:45,actual:0,priority:'P2',status:'open',project:'STUDIO',schoolType:'STUDIO / RIPASSO',subject:t.subject||'',title:'Ripasso '+(t.subject||'scuola'),topics:t.topics||'',prepStatus:'da preparare',notes:'Ripasso confermato per '+t.id});added++;
 });
 if(added){ctx.saveTasks();ctx.notify(added+' ripassi aggiunti')}
}
function renderConflicts(){
 const dest=$('#cc-school-overlap');dest.replaceChildren();
 const hits=S.conflicts(getLessons(week),ctx.getTasks().filter(t=>t.date>=week&&t.date<=S.plusDays(week,5)));
 if(!hits.length){dest.append(node('p','Nessuna sovrapposizione reale rilevata tra lezioni confermate e impegni registrati.','cc-sub'));return}
 hits.forEach(([a,b])=>dest.append(node('p',fmt(a.date)+' · '+a.start+'–'+a.end+' '+a.title+' / '+b.start+'–'+b.end+' '+b.title,'cc-school-alert')));
}
function exportJSON(){
 const blob=new Blob([JSON.stringify({source:'CASE247-2SCAT',version:1,weeks:state.weeks},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');
 a.href=url;a.download='case247-studio-2scat.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),750);
}
async function importJSON(e){
 const f=e.target.files?.[0];if(!f)return;
 try{
  if(f.size>1024*1024)throw Error('File troppo grande');
  const data=JSON.parse(await f.text());if(data.source!=='CASE247-2SCAT'||data.version!==1||!data.weeks||typeof data.weeks!=='object')throw Error('Formato non valido');
  const imports={};Object.entries(data.weeks).forEach(([key,val])=>{
   if(S.monday(key)!==key||!Array.isArray(val.rows)||val.rows.length>100)throw Error('Settimana non valida');
   const rows=val.rows.map(r=>S.makeLesson(r,key));if(rows.some(x=>!x))throw Error('Lezioni non valide');
   imports[key]={rows,updatedAt:new Date().toISOString(),status:'confermato',source:'Backup importato'};
  });
  if(!window.confirm('Importare '+Object.keys(imports).length+' settimane? Le settimane già presenti saranno aggiornate, senza cancellare attività manuali.'))return;
  state.weeks={...state.weeks,...imports};save(KEY,state);ctx.renderAll();
 }catch(err){window.alert('Importazione fallita: '+err.message)}
 finally{e.target.value=''}
}
function bindForm(){
 const f=$('#cc-form'),grid=f.querySelector('.cc-formgrid'),div=node('div',undefined,'cc-school-fields cc-wide cc-hidden');
 div.id='cc-school-fields';
 div.innerHTML=`<label>TIPOLOGIA ATTIVITÀ<select name="schoolType"><option>SCUOLA VERIFICA</option><option>INTERROGAZIONE</option><option>STUDIO / RIPASSO</option></select></label>
 <label>Materia<input type="text" name="schoolSubject" list="cc-school-subjects" maxlength="85"><datalist id="cc-school-subjects"></datalist></label>
 <label>Argomenti<input type="text" name="topics" maxlength="250"></label>
 <label>Stato preparazione<select name="prepStatus"><option value="da preparare">Da preparare</option><option value="in preparazione">In preparazione</option><option value="pronto">Pronto</option></select></label>`;
 grid.append(div);
 toggleForm=()=>div.classList.toggle('cc-hidden',f.elements.project.value!=='STUDIO');
 f.elements.project.addEventListener('change',toggleForm);
 const updateSubjects=()=>{const dest=$('#cc-school-subjects');dest.replaceChildren();subjects().forEach(s=>{const opt=node('option');opt.value=s;dest.append(opt)})};
 updateSubjects();f.elements.project.addEventListener('change',updateSubjects);
}
function populateTaskForm(t){
 const f=$('#cc-form');toggleForm();
 f.elements.schoolType.value=t?.schoolType||'SCUOLA VERIFICA';
 f.elements.schoolSubject.value=t?.subject||'';
 f.elements.topics.value=t?.topics||'';
 f.elements.prepStatus.value=t?.prepStatus||'da preparare';
}
function enrichTask(t,f){
 if(t.project!=='STUDIO')return t;
 t.schoolType=f.elements.schoolType.value;
 t.subject=f.elements.schoolSubject.value.trim().slice(0,85);
 t.topics=f.elements.topics.value.trim().slice(0,250);
 t.prepStatus=f.elements.prepStatus.value;
 if(!t.subject){window.alert('Inserisci la materia per l’attività STUDIO.');return null}
 return t;
}
function importedTask(t,original){
 if(t.project!=='STUDIO')return t;
 t.schoolType=['SCUOLA VERIFICA','INTERROGAZIONE','STUDIO / RIPASSO'].includes(original.schoolType)?original.schoolType:'STUDIO / RIPASSO';
 t.subject=String(original.subject||'').slice(0,85);t.topics=String(original.topics||'').slice(0,250);
 t.prepStatus=['da preparare','in preparazione','pronto'].includes(original.prepStatus)?original.prepStatus:'da preparare';
 return t;
}
function taskConflict(t){
 if(!t||!t.date||!t.time)return false;
 const start=t.time,n=S.minutes(start)+Number(t.duration),end=String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 return getLessons(t.date).some(x=>S.overlaps(x,{date:t.date,start,end}));
}
function mount(context){
 root=context.root;ctx=context;state=read(KEY,{weeks:{}});if(!state||!state.weeks||typeof state.weeks!=='object')state={weeks:{}};
 week=S.monday(ctx.getWeek());setup();bindForm();render();
 return {render,lessonsForWeek:getLessons,scheduleWeekChanged:w=>{if(!pending){week=S.monday(w);render()}},populateTaskForm,enrichTask,importedTask,taskConflict};
}
window.CASE247StudioUI={mount};
})();