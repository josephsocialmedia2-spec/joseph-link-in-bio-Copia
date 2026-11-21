/* Foglio contatti e schede clienti nella scheda ESISTENTE Notizie & Contatti.
   Nessun dato personale viene inviato a GitHub, nessun layout esterno modificato.
*/
(function(root){
 'use strict';
 const N=root.CASE247ContactNormalizer;
 if(!N)return;
 const $=id=>document.getElementById(id);
 let ctx=null,selectedId='',photoDrafts=[],lastRendered=[],photoBusy=false;
 const HIST_KEY='case247-farming-daily-history-v1';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 function message(id,txt,error=false){
   const element=$(id);if(!element)return;
   element.textContent=txt||'';
   element.classList.toggle('warn',!!error);
 }
 function getHistory(){
   try{const raw=JSON.parse(localStorage.getItem(HIST_KEY)||'[]');return Array.isArray(raw)?raw:[];}
   catch(_){return [];}
 }
 function rowAddress(x){return N.clean(x.address||'',140).toLocaleLowerCase('it');}
 function rowRef(x){return N.clean(x.name||x.immobile||'',120).toLocaleLowerCase('it');}
 function allRows(){
   const contacts=ctx.getContacts().map((record,i)=>({
     ...record,kind:'contact',id:String(record.id??'legacy-'+i),
     comune:record.comune||'Avigliana'
   }));
   const used=new Set(contacts.map(x=>rowAddress(x)+'|'+rowRef(x)));
   const seen=new Set();
   const diary=getHistory().filter(x=>x&&x.address&&x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
   const other=[];
   for(const x of diary){
     const normal=N.normalizeContact({
       date:x.date,comune:x.comune||'Avigliana',zone:x.zone,address:x.address,
       name:x.immobile||'',source:'Storico Farming',status:'Nuovo',
       action:'Nessuna',notes:(x.type||'')+' · '+(x.outcome||'')+' · '+(x.notes||'')
     });
     const key=rowAddress(normal)+'|'+rowRef(normal);
     if(used.has(key)||seen.has(key))continue;
     seen.add(key);
     other.push({...normal,kind:'diary',id:'diary:'+key,diaryRef:key});
   }
   return contacts.concat(other).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.address||'').localeCompare(String(b.address||''),'it'));
 }
 function cell(text){
  const d=document.createElement('td');d.textContent=N.stripRecapiti(text||'');return d;
 }
 function render(){
   if(!ctx)return;
   const all=allRows();
   lastRendered=all;
   const q=($('contactsSearch')?.value||'').trim().toLocaleLowerCase('it');
   const rows=q?all.filter(x=>[x.date,x.comune,x.zone,x.address,x.name,x.source,x.status,x.action].some(v=>String(v||'').toLocaleLowerCase('it').includes(q))):all;
   const container=$('contactsRows');
   if(!container)return;
   const frag=document.createDocumentFragment();
   for(const rec of rows){
     const tr=document.createElement('tr');
     for(const v of [rec.date||'',rec.comune||'Avigliana',rec.zone||'',rec.address||'',rec.name||rec.immobile||'Immobile senza riferimento',rec.source||'',rec.status||'',rec.action||'',rec.followDate||'']){
       tr.appendChild(cell(v));
     }
     const td=document.createElement('td'),btn=document.createElement('button');
     btn.type='button';btn.className='btn secondary';
     btn.textContent='Apri scheda';btn.dataset.contactId=rec.id;td.appendChild(btn);tr.appendChild(td);frag.appendChild(tr);
   }
   if(!rows.length){
     const tr=document.createElement('tr'),td=document.createElement('td');
     td.colSpan=10;td.textContent=all.length?'Nessuna scheda corrisponde alla ricerca.':'Nessun contatto disponibile in questo browser. Importa una foto oppure un CSV esistente.';
     tr.appendChild(td);frag.appendChild(tr);
   }
   container.replaceChildren(frag);
   $('contactsCount').textContent=String(all.length)+' schede visualizzabili ('+ctx.getContacts().length+' contatti, '+(all.length-ctx.getContacts().length)+' indirizzi dal diario)';
   if(selectedId&&$('clientDetail')?.hidden===false){
     const r=all.find(x=>x.id===selectedId);
     if(!r){$('clientDetail').hidden=true;selectedId='';}
   }
 }
 function fillForm(form,rec){
   const fields=['date','comune','zone','address','name','source','status','action','followDate','followTime','notes'];
   for(const name of fields){
     const el=form.elements[name];if(!el)continue;
     const value=rec[name]||'';
     if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>o.value===value)){
       const option=document.createElement('option');option.value=value;option.textContent=value;el.appendChild(option);
     }
     el.value=value;
   }
 }
 function openSheet(id){
   const row=lastRendered.find(x=>x.id===id);
   if(!row)return;
   selectedId=id;
   const detail=$('clientDetail');
   detail.hidden=false;
   $('clientDetailTitle').textContent='Scheda cliente / immobile · '+N.stripRecapiti(row.address||'');
   fillForm($('clientDetailForm'),row);
   const editable=row.kind==='contact';
   $('clientDetailForm').hidden=!editable;
   $('diaryOnly').hidden=editable;
   if(!editable){
     $('diaryOnly').textContent='Indirizzo presente soltanto nello Storico giornaliero. Nessun contatto è stato inventato né trasferito automaticamente. Puoi creare una scheda compilando il modulo di inserimento manuale.';
   }
   const related=getHistory().filter(x=>rowAddress(x)===rowAddress(row));
   const ul=$('clientEvents');ul.replaceChildren();
   if(!related.length){const li=document.createElement('li');li.textContent='Nessuna attività collegata nello Storico giornaliero.';ul.appendChild(li);}
   else for(const ev of related.slice(0,30)){
     const li=document.createElement('li');
     li.textContent=[ev.date,ev.type,ev.outcome,ev.quantity?('Quantità '+ev.quantity):''].filter(Boolean).map(N.stripRecapiti).join(' · ');
     ul.appendChild(li);
   }
   message('clientCardMessage','');
   detail.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 function saveCard(e){
   e.preventDefault();
   const index=ctx.getContacts().findIndex(x=>String(x.id)===selectedId);
   if(index<0){message('clientCardMessage','Scheda non trovata nel registro. Non ho modificato i dati.',true);return;}
   const existing=ctx.getContacts()[index];
   const data=N.normalizeContact(Object.fromEntries(new FormData(e.currentTarget).entries()));
   if(!data.date||!data.address){
     message('clientCardMessage','Indirizzo e data sono obbligatori.',true);return;
   }
   const repeated=ctx.getContacts().some((x,j)=>j!==index&&N.fingerprint(x)===N.fingerprint(data));
   if(repeated&&!confirm('Esiste un’altra scheda con stessi data, via, riferimento e fonte. Salvare comunque?'))return;
   if(data.followDate&&(!ctx.isWorkingDay(data.followDate)||data.followTime<'14:30'||data.followTime>'16:15')){
     message('clientCardMessage','Richiamo: lunedì–venerdì tra le 14:30 e le 16:15.',true);return;
   }
   ctx.getContacts()[index]={...existing,...data};
   ctx.persist();
   openSheet(selectedId);
   message('clientCardMessage','Scheda cliente aggiornata nel registro esistente.');
 }
 function download(name,text){
   const u=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=u;a.download=name;
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);
 }
 function exportExcel(){
   const list=lastRendered;
   if(!list.length){message('contactsCount','Nessuna scheda presente da esportare.',true);return;}
   // CSV UTF-8 compatibile con Excel. Include tutte le schede visibili, anche quelle del diario.
   download('CASE247_Foglio_Acquisizione_Contatti_'+ctx.today()+'.csv',N.csv(list));
   message('contactsCount','Esportate '+list.length+' schede in CSV Excel. Il file .xlsm originale non viene sovrascritto.');
 }
 function createField(name,value,type='text',options){
   const label=document.createElement('label');
   label.textContent=({date:'Data',comune:'Comune',zone:'Zona',address:'Via / civico',name:'Cliente / immobile',source:'Fonte',status:'Stato',action:'Azione',notes:'Note verificate'})[name]||name;
   let field;
   if(options){
     field=document.createElement('select');
     for(const item of options){
       const o=document.createElement('option');o.value=item;o.textContent=item;field.appendChild(o);
     }
     if(value&&!options.includes(value)){const o=document.createElement('option');o.value=value;o.textContent=value;field.appendChild(o);}
   }else if(name==='notes'){field=document.createElement('textarea');field.rows=2;}
   else{field=document.createElement('input');field.type=type;}
   field.dataset.field=name;field.value=String(value||'');
   if(name==='address'||name==='date')field.required=true;
   if(name==='address')field.placeholder='Indirizzo da confermare';
   label.appendChild(field);
   return label;
 }
 function showDrafts(drafts){
   const parent=$('photoDrafts');parent.replaceChildren();
   photoDrafts=drafts;
   for(let i=0;i<drafts.length;i++){
     const d=drafts[i],box=document.createElement('fieldset');
     box.className='photoDraft';box.dataset.index=String(i);
     const legend=document.createElement('legend');legend.textContent='Bozza '+(i+1)+' · DA VERIFICARE';box.appendChild(legend);
     const grid=document.createElement('div');grid.className='form';
     for(const [name,type,options] of [
       ['date','date'],['comune','text'],['zone','text'],['address','text'],['name','text'],
       ['source','text'],['status','text',N.STATUSES],['action','text',N.ACTIONS],['notes','text']
     ])grid.appendChild(createField(name,d[name],type,options));
     box.appendChild(grid);parent.appendChild(box);
   }
   $('photoConfirm').checked=false;
   $('photoSave').disabled=!drafts.length;
 }
 function parseRaw(){
   const txt=$('photoText').value.trim();
   if(!txt){message('photoStatus','Carica una foto oppure incolla gli appunti trascritti.',true);return;}
   const drafts=N.fromText(txt,ctx.today());
   showDrafts(drafts);
   const missing=drafts.filter(x=>!x.address).length;
   message('photoStatus','Riconosciute '+drafts.length+' bozze. '+(missing?'Indirizzo mancante in '+missing+' bozze: correggilo prima di salvare. ':'')+'Verifica tutti i campi e conferma prima del salvataggio.');
 }
 function collectDrafts(){
   return [...$('photoDrafts').querySelectorAll('fieldset.photoDraft')].map(box=>{
     const draft={};
     for(const el of box.querySelectorAll('[data-field]'))draft[el.dataset.field]=el.value;
     return N.normalizeContact(draft);
   });
 }
 function saveDrafts(){
   if(!$('photoConfirm').checked){message('photoStatus','Conferma di aver verificato manualmente i dati.',true);return;}
   const list=collectDrafts();
   if(!list.length){message('photoStatus','Nessuna bozza da salvare.',true);return;}
   const invalid=list.find(x=>!x.date||!x.address);
   if(invalid){message('photoStatus','Mancano data o indirizzo in una o più bozze. Nessuna riga salvata.',true);return;}
   const existing=new Set(ctx.getContacts().map(N.fingerprint));
   let added=0,skipped=0;
   for(const d of list){
     const fp=N.fingerprint(d);
     if(existing.has(fp)){skipped++;continue;}
     existing.add(fp);
     ctx.getContacts().push({...d,id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+added)});
     added++;
   }
   if(added)ctx.persist();
   showDrafts([]);
   $('photoText').value='';
   message('photoStatus','Salvate '+added+' schede cliente. Duplicati già presenti ignorati: '+skipped+'. Il foglio Excel visualizzato si aggiorna automaticamente.');
 }
 let ocrLibrary=null;
 function ensureOCR(){
   if(root.Tesseract)return Promise.resolve(root.Tesseract);
   if(ocrLibrary)return ocrLibrary;
   ocrLibrary=new Promise((resolve,reject)=>{
     const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
     s.async=true;s.onload=()=>root.Tesseract?resolve(root.Tesseract):reject(new Error('Libreria OCR non disponibile'));
     s.onerror=()=>reject(new Error('Impossibile scaricare il motore OCR'));document.head.appendChild(s);
   }).catch(err=>{ocrLibrary=null;throw err;});
   return ocrLibrary;
 }
 async function readPhotos(){
   const files=[...$('photoFiles').files||[]];
   if(!files.length){message('photoStatus','Seleziona almeno una foto.',true);return;}
   if(photoBusy)return;
   photoBusy=true;$('photoRead').disabled=true;
   try{
     const OCR=await ensureOCR();let parts=[];
     for(let i=0;i<files.length;i++){
       if(!/^image\//.test(files[i].type))throw Error('È consentito caricare soltanto immagini.');
       message('photoStatus','Lettura foto '+(i+1)+' di '+files.length+' nel browser…');
       const result=await OCR.recognize(files[i],'ita+eng');
       const text=result?.data?.text||'';
       if(text.trim())parts.push(text);
     }
     $('photoText').value=parts.join('\n');
     if(!parts.length){message('photoStatus','Non ho riconosciuto testo. Inserisci gli appunti manualmente prima di procedere.',true);return;}
     parseRaw();
   }catch(err){
     message('photoStatus','Lettura automatica non disponibile: '+err.message+'. Puoi incollare il testo degli appunti e normalizzarlo.',true);
   }finally{photoBusy=false;$('photoRead').disabled=false;$('photoFiles').value='';}
 }
 function init(options){
   ctx=options;
   const body=$('contactsRows');
   if(!body)throw Error('Foglio contatti non presente');
   body.addEventListener('click',e=>{
     const button=e.target.closest('[data-contact-id]');
     if(button)openSheet(button.dataset.contactId);
   });
   $('contactsSearch').addEventListener('input',render);
   $('contactsExcelExport').addEventListener('click',exportExcel);
   $('clientDetailForm').addEventListener('submit',saveCard);
   $('clientCardClose').addEventListener('click',()=>{$('clientDetail').hidden=true;selectedId='';});
   $('photoRead').addEventListener('click',readPhotos);
   $('photoParse').addEventListener('click',parseRaw);
   $('photoSave').addEventListener('click',saveDrafts);
   root.addEventListener('storage',event=>{
     if(event.key===HIST_KEY)render();
   });
   render();
 }
 root.CASE247ContactSheet={init,render,fromText:N.fromText};
})(typeof window==='undefined'?globalThis:window);
