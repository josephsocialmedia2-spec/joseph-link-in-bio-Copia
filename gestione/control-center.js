/* CASE247 Control Center — non-destructive enhancement of /gestione/.
   PUBLIC GitHub Pages: never place CRM records, tokens, private URLs or consents here. */
(function(){
'use strict';
const root=document.getElementById('case247-control-center');if(!root)return;
const OWNER='josephsocialmedia2-spec',REPO='joseph-link-in-bio-Copia',FULL=OWNER+'/'+REPO;
const BASE='https://'+OWNER+'.github.io/'+REPO+'/',GITHUB='https://github.com/'+FULL,API='https://api.github.com/repos/'+FULL;
const TASKKEY='case247-cc-tasks-v1',FAVKEY='case247-cc-favorites-v1',BRANCHKEY='case247-cc-branches-v1',CRMKEY='case247-cc-private-excel-url-v1';
const PROJECTS=[
 ['Catalogo immobili','Immobiliare La Sacra','immobili/','Annunci e schede immobiliari'],
 ['Mappa dei comuni','Immobiliare La Sacra','paesi/','Esplorazione territoriale'],
 ['Richieste immobiliari','Acquisizione','campagne/case247/richieste-immobili/','Pagina pubblica richieste'],
 ['Registro consensi - interfaccia','Acquisizione','gestione/case247-conformita/','Strumento tecnico; dati riservati non pubblici'],
 ['Regia territoriale','Social e automazioni','gestione/regia-territoriale/','Gestione editoriale per territorio'],
 ['Canali CASE247','Social e automazioni','gestione/canali-case247/','Controllo delle destinazioni social'],
 ['Rete 41 comuni','Social e automazioni','gestione/territori/','Gestione rete territoriale'],
 ['Pilota Avigliana','Social e automazioni','gestione/territori/avigliana/','Collegamenti e controllo pilota'],
 ['Piano editoriale','Social e automazioni','gestione/piano-editoriale/','Programmazione editoriale'],
 ['Grafiche programmate','Social e automazioni','gestione/grafiche-programmate/','Anteprime contenuti'],
 ['Review auto-feed','Social e automazioni','campagne/case247/auto-feed/review/','Controllo dei contenuti prima della pubblicazione'],
 ['Studio volantini','Volantini','gestione/volantini-premium/','Produzione materiali'],
 ['Invio volantini','Volantini','gestione/email-volantini/','Strumenti per invii controllati'],
 ['Comunicazioni','Volantini','gestione/case247-comunicazioni/','Strumenti di comunicazione'],
 ['Panoramica pagine','Infrastruttura','gestione/tutte-le-pagine/','Inventario delle applicazioni pubblicate'],
 ['Operazioni','Infrastruttura','gestione/case247-operazioni/','Controlli delle operazioni'],
 ['Mattino','Organizzazione','gestione/mattino/','Strumenti per il briefing'],
 ['WhatsApp volantini','Volantini','gestione/whatsapp-volantini/','Comunicazioni materiale commerciale']
];
const EXTERNAL=[
 ['Repository GitHub','GitHub',GITHUB,'Codice sorgente'],
 ['Tutti i branch GitHub','GitHub',GITHUB+'/branches','Elenco sorgente'],
 ['Pull request','GitHub',GITHUB+'/pulls','Proposte di integrazione'],
 ['Workflow GitHub Actions','GitHub',GITHUB+'/actions','Esecuzioni e log'],
 ['Meta Business Suite','Social e automazioni','https://business.facebook.com/latest/home','Accesso esterno richiesto'],
 ['Metricool','Social e automazioni','https://app.metricool.com/','Accesso esterno richiesto'],
 ['Google Calendar','Organizzazione','https://calendar.google.com/calendar/u/0/r/week','Calendario Google autenticato'],
 ['Google Drive','Infrastruttura','https://drive.google.com/drive/u/0/my-drive','Documenti autenticati'],
 ['OneDrive','Acquisizione','https://onedrive.live.com/','Aprire il CRM soltanto da area autorizzata'],
 ['Supabase','Infrastruttura','https://supabase.com/dashboard/projects','Console autenticata']
];
const weekdays=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const priorities={P1:'Bloccante',P2:'Commerciale',P3:'Produzione',P4:'Miglioramento'};
const proposals=[
 ['14:00','15:30','Sviluppo prioritario'],['15:30','16:30','Contenuti e materiali'],
 ['16:30','17:30','Test e verifiche'],['17:30','18:00','Follow-up commerciale'],
 ['18:00','18:15','Chiusura operativa']];
const saturday=[['09:00','10:30','Revisione lavori aperti'],['10:30','12:00','Test e completamenti'],['12:00','12:30','KPI e scadenze'],['14:00','16:00','Pianificazione settimana']];
const $=s=>root.querySelector(s);
const el=(tag,cls,txt)=>{const a=document.createElement(tag);if(cls)a.className=cls;if(txt!==undefined)a.textContent=String(txt);return a;};
const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){notify('Memoria locale non disponibile');return false}};
const load=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key));return x===null?fallback:x}catch(_){return fallback}};
const escHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function romeToday(){const pts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const m={};pts.forEach(p=>m[p.type]=p.value);return m.year+'-'+m.month+'-'+m.day;}
function fromISO(iso){return new Date(iso+'T12:00:00Z')}
function isoDate(d){return d.toISOString().slice(0,10)}
function plusDays(iso,n){const d=fromISO(iso);d.setUTCDate(d.getUTCDate()+n);return isoDate(d)}
function monday(iso){const d=fromISO(iso);const day=d.getUTCDay();return plusDays(iso,-((day+6)%7))}
function isSunday(iso){return fromISO(iso).getUTCDay()===0}
function dateLabel(iso){return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',timeZone:'UTC'}).format(fromISO(iso))}
function weekLabel(iso){return dateLabel(iso)+' – '+dateLabel(plusDays(iso,5))}
function urlBranch(name){return GITHUB+'/tree/'+name.split('/').map(encodeURIComponent).join('/')}
function notify(t){const n=$('#cc-toast');if(n)n.textContent=t}
function link(label,url,cls){const a=el('a','cc-btn '+(cls||''),label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a}
function btn(label,fn,cls){const a=el('button','cc-btn '+(cls||''),label);a.type='button';a.addEventListener('click',fn);return a}
async function copy(text){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text)}else{const input=document.createElement('textarea');input.value=text;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();if(!document.execCommand('copy'))throw Error();input.remove()}notify('Collegamento copiato')}catch(_){notify('Copia non disponibile: apri il link e copialo dal browser')}}
let tasks=load(TASKKEY,[]);if(!Array.isArray(tasks))tasks=[];
tasks=tasks.filter(t=>t&&typeof t.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date));
let favorites=load(FAVKEY,[]);if(!Array.isArray(favorites))favorites=[];favorites=new Set(favorites);
let branches=[],prs=[],branchChecked='',weekStart=monday(romeToday()),filter='',cached=false;
root.innerHTML='<div class="cc-top"><div><div class="cc-eyebrow">Immobiliare La Sacra · CASE247</div><h1>Control Center</h1><div class="cc-sub" id="cc-now">Centro operativo · Europe/Rome</div></div><div class="cc-actions"><button type="button" id="cc-menu-toggle" aria-controls="cc-nav" aria-expanded="false">Menu</button><input type="search" id="cc-search" class="cc-search" aria-label="Cerca progetti e branch" placeholder="Cerca progetto o ramo…"><a class="cc-btn" href="'+GITHUB+'/branches" target="_blank" rel="noopener noreferrer">GitHub</a></div></div>'+
'<div class="cc-grid"><nav class="cc-sidebar" id="cc-nav" aria-label="Navigazione centro operativo"></nav><div class="cc-main">'+
'<div class="cc-stats" id="cc-stats"></div>'+
'<section id="cc-overview" class="cc-card cc-section"><div class="cc-head"><div><h2>Panoramica operativa</h2><p id="cc-current">Blocco in corso</p></div><div class="cc-actions"><button id="cc-new" type="button" class="cc-primary">Nuova attività</button><button id="cc-refresh" type="button">Aggiorna GitHub</button></div></div><div id="cc-priorities"></div><div class="cc-notice">Questa è una pagina pubblica su GitHub Pages. Non inserire nomi di clienti, numeri, consensi, credenziali o link privati. Le attività si salvano solo su questo dispositivo finché non è collegato un backend autenticato.</div><div class="cc-toast" id="cc-toast" role="status" aria-live="polite"></div></section>'+
'<section id="cc-calendar" class="cc-card cc-section"><div class="cc-head"><div><h2>Agenda settimanale · lunedì–sabato</h2><p id="cc-week-label"></p></div><div class="cc-actions"><button id="cc-prev" type="button" aria-label="Settimana precedente">←</button><button id="cc-this" type="button">Oggi</button><button id="cc-next" type="button" aria-label="Settimana seguente">→</button></div></div><div id="cc-week" class="cc-week"></div><div class="cc-filters"><button id="cc-export" type="button">Esporta attività JSON</button><button id="cc-ics" type="button">Esporta calendario ICS</button><button id="cc-import" type="button">Importa JSON</button><input id="cc-import-file" class="cc-hidden" type="file" accept="application/json,.json"></div><div class="cc-sub">Acquisizione riservata: lun–ven 09:30–12:30. Le fasce del pomeriggio sono suggerimenti modificabili; la domenica non è pianificata.</div></section>'+
'<section id="cc-projects" class="cc-card cc-section"><div class="cc-head"><div><h2>Siti e strumenti esistenti</h2><p>Apri, copia il link o visualizza una pagina interna. Gli accessi esterni richiedono autenticazione.</p></div></div><div class="cc-list" id="cc-project-list"></div><div id="cc-preview" class="cc-viewer cc-hidden"><div class="cc-head"><b id="cc-preview-name"></b><button type="button" id="cc-preview-close">Chiudi anteprima</button></div><iframe title="Anteprima sito interno" id="cc-frame" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div></section>'+
'<section id="cc-branches" class="cc-card cc-section"><div class="cc-head"><div><h2>Indice dinamico branch GitHub</h2><p id="cc-branch-status">Caricamento branch…</p></div><button type="button" id="cc-branch-refresh">Ricarica</button></div><div id="cc-branch-list" class="cc-list"></div><div id="cc-branch-detail" class="cc-notice cc-hidden" role="status"></div></section>'+
'<section id="cc-crm" class="cc-card cc-section"><div class="cc-head"><div><h2>CRM immobiliare Excel</h2><p>Collega il file Excel autorizzato una sola volta per questo dispositivo: poi il blocco Acquisizione aprirà direttamente il CRM.</p></div></div><div class="cc-notice" id="cc-crm-status" role="status">CRM Excel non collegato su questo dispositivo.</div><div class="cc-actions"><a class="cc-btn cc-primary" id="cc-crm-open" data-cc-crm-link href="#cc-crm">Apri CRM Excel</a><button type="button" id="cc-crm-config">Collega / modifica CRM</button><button type="button" id="cc-crm-clear" class="cc-hidden">Dissocia CRM</button><a class="cc-btn" href="https://onedrive.live.com/" target="_blank" rel="noopener noreferrer">OneDrive</a></div><p class="cc-sub">Il collegamento viene conservato solo nel browser locale, non pubblicato su GitHub o incluso nei backup attività. Su altri dispositivi va collegato separatamente. Il VBA funziona solo con Excel desktop Windows.</p></section>'+
'<div class="cc-footer">CASE247 · Collegamenti pubblici verificati nel repository; l’accesso a servizi privati dipende dai relativi permessi. Il vecchio pannello /gestione/ rimane disponibile più in basso.</div>'+
'</div></div>'+
'<dialog class="cc-dialog" id="cc-dialog" aria-label="Crea o modifica attività"><form id="cc-form"><h2 id="cc-dialog-title">Nuova attività</h2><p>Inserisci solo riferimenti operativi non riservati.</p><div class="cc-formgrid"><label class="cc-wide">Attività<input name="title" type="text" maxlength="160" required></label><label>Data (lun–sab)<input name="date" type="date" required></label><label>Ora<input name="time" type="time" value="14:00" required></label><label>Durata prevista (min)<input name="duration" type="number" min="5" max="720" step="5" value="60" required></label><label>Durata effettiva (min)<input name="actual" type="number" min="0" max="1440" step="5" value="0"></label><label>Priorità<select name="priority"><option value="P1">P1 · Bloccante</option><option value="P2">P2 · Commerciale</option><option value="P3" selected>P3 · Produzione</option><option value="P4">P4 · Miglioramento</option></select></label><label>Stato<select name="status"><option value="open">Da fare</option><option value="working">In corso</option><option value="postponed">Rinviato</option><option value="done">Completato</option></select></label><label class="cc-wide">Progetto<select name="project" id="cc-project-select"></select></label><label class="cc-wide">Risultato atteso / note<textarea name="notes" rows="2" maxlength="600"></textarea></label></div><div class="cc-actions" style="margin-top:15px"><button class="cc-primary" type="submit">Salva attività</button><button type="button" id="cc-task-delete" class="cc-hidden">Elimina</button><button type="button" id="cc-dialog-close">Annulla</button></div></form></dialog>'+ 
'<dialog class="cc-dialog" id="cc-crm-dialog" aria-label="Collega CRM Excel"><form id="cc-crm-form"><h2>Collega CRM Excel</h2><p>Incolla il collegamento HTTPS al file Excel su OneDrive o Google Drive. Il collegamento rimane solo in questo browser e non viene inserito nel repository pubblico.</p><label class="cc-crm-label">Collegamento diretto al file Excel<input id="cc-crm-url" type="url" placeholder="Incolla qui il collegamento al file Excel" maxlength="2500" autocomplete="off" required></label><div class="cc-notice cc-warning" id="cc-crm-error" role="alert" hidden></div><div class="cc-actions" style="margin-top:14px"><button type="submit" class="cc-primary">Salva e apri CRM</button><button type="button" id="cc-crm-cancel">Annulla</button></div></form></dialog>';
function nav(){const groups=[
 ['PANORAMICA',[['Panoramica','#cc-overview'],['Agenda settimanale','#cc-calendar'],['Attività e priorità','#cc-priorities']]],
 ['GITHUB',[['Tutti i branch','#cc-branches'],['Repository',GITHUB],['Pull request',GITHUB+'/pulls'],['Workflow falliti',GITHUB+'/actions?query=conclusion%3Afailure'],['GitHub Actions',GITHUB+'/actions']]],
 ['ACQUISIZIONE',[['CRM Excel','#cc-crm'],['Richieste immobiliari',BASE+'campagne/case247/richieste-immobili/'],['Consensi',BASE+'gestione/case247-conformita/']]],
 ['IMMOBILIARE LA SACRA',[['Catalogo immobili',BASE+'immobili/'],['Mappa comuni',BASE+'paesi/'],['Pilota Avigliana',BASE+'gestione/territori/avigliana/']]],
 ['SOCIAL E AUTOMAZIONI',[['Regia territoriale',BASE+'gestione/regia-territoriale/'],['Canali',BASE+'gestione/canali-case247/'],['Metricool','https://app.metricool.com/'],['Meta Business Suite','https://business.facebook.com/latest/home']]],
 ['VOLANTINI',[['Studio volantini',BASE+'gestione/volantini-premium/'],['Archivio e invii',BASE+'gestione/email-volantini/']]],
 ['INFRASTRUTTURA',[['Google Drive','https://drive.google.com/drive/u/0/my-drive'],['Supabase','https://supabase.com/dashboard/projects'],['Tutte le pagine',BASE+'gestione/tutte-le-pagine/'],['GitHub',GITHUB]]]
 ];const n=$('#cc-nav');groups.forEach((g,i)=>{const d=el('details','cc-navgroup');d.open=i<3;const s=el('summary','',g[0]);d.append(s);g[1].forEach(a=>{const l=el('a','',a[0]);l.href=a[1];if(!a[1].startsWith('#')){l.target='_blank';l.rel='noopener noreferrer'}else l.addEventListener('click',()=>{$('#cc-nav').classList.remove('cc-open');$('#cc-menu-toggle').setAttribute('aria-expanded','false')});d.append(l)});n.append(d)});}
function saveTasks(){store(TASKKEY,tasks);renderAll()}
function timeM(t){const m=/^(\d{2}):(\d{2})$/.exec(t||'');return m?Number(m[1])*60+Number(m[2]):0}
function conflict(t){return !isSunday(t.date)&&fromISO(t.date).getUTCDay()!==6&&timeM(t.time)<750&&timeM(t.time)+Number(t.duration)>570}
function currentBlock(){const now=new Date();const p=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Rome'}).format(now);const day=fromISO(romeToday()).getUTCDay(),m=timeM(p);if(day===0)return'Domenica · nessuna attività manuale';if(day>=1&&day<=5&&m>=570&&m<750)return'09:30–12:30 · Acquisizione immobiliare';const blocks=day===6?saturday:proposals;const b=blocks.find(x=>m>=timeM(x[0])&&m<timeM(x[1]));return b?b[0]+'–'+b[1]+' · '+b[2]:'Nessun blocco proposto in corso';}
function stats(){const open=tasks.filter(t=>t.status!=='done'),urgent=open.filter(t=>t.priority==='P1');$('#cc-now').textContent=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'full',timeStyle:'short'}).format(new Date())+' · Europe/Rome';$('#cc-current').textContent='Adesso: '+currentBlock();$('#cc-stats').replaceChildren();[['Branch GitHub',branches.length||'—'],['PR aperte',prs.length||'—'],['Attività aperte',open.length],['Bloccanti P1',urgent.length]].forEach(a=>{const c=el('div','cc-stat');c.append(el('span','',a[0]),el('b','',a[1]));$('#cc-stats').append(c)});
 const target=$('#cc-priorities');target.replaceChildren();const list=open.slice().sort((a,b)=>a.priority.localeCompare(b.priority)||a.date.localeCompare(b.date)).slice(0,6);if(!list.length){target.append(el('p','cc-empty','Non ci sono attività salvate in questa sessione. Crea un’attività per iniziare.'))}else list.forEach(t=>{const c=el('div','cc-item');const b=el('b','',t.priority+' · '+t.title);const info=el('small','',t.date+' · '+t.time+' · '+t.status+(conflict(t)?' · CONFLITTO ACQUISIZIONE':''));c.append(b,info,btn('Modifica',()=>editTask(t.id)));target.append(c)});}
function slot(a,kind,t){const s=el(kind==='cc-fixed'?'a':'div','cc-slot '+kind);s.append(el('b','',a[0]+'–'+a[1]),document.createTextNode(a[2]));if(kind==='cc-fixed'){s.dataset.ccCrmLink='1';s.href='#cc-crm';s.title='Apri CRM Excel';s.setAttribute('aria-label','Acquisizione 09:30–12:30, apri CRM Excel');s.addEventListener('click',onCrmClick)}if(t){s.classList.add('cc-task');if(t.status==='done')s.classList.add('cc-complete');if(conflict(t))s.classList.add('cc-conflict');s.title='Modifica attività';s.setAttribute('role','button');s.tabIndex=0;s.addEventListener('click',()=>editTask(t.id));s.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editTask(t.id)}})}return s}
function agenda(){const start=weekStart;$('#cc-week-label').textContent=weekLabel(start)+' · fuso Europe/Rome';$('#cc-week').replaceChildren();for(let i=0;i<6;i++){const date=plusDays(start,i),day=el('div','cc-day'),head=el('div','cc-dayhead');head.append(el('b','',weekdays[i]),document.createTextNode(dateLabel(date)));day.append(head);const body=el('div','cc-timeline');if(i<5)body.append(slot(['09:30','12:30','ACQUISIZIONE · Apri CRM Excel ↗'],'cc-fixed'));(i===5?saturday:proposals).forEach(a=>body.append(slot(a,'cc-proposal')));tasks.filter(t=>t.date===date).sort((a,b)=>a.time.localeCompare(b.time)).forEach(t=>{const startMin=timeM(t.time)+Number(t.duration);const hh=String(Math.floor(startMin/60)%24).padStart(2,'0'),mm=String(startMin%60).padStart(2,'0');body.append(slot([t.time,hh+':'+mm,t.priority+' · '+t.title],'',t))});body.append(btn('+ Attività',()=>editTask(null,date)));day.append(body);$('#cc-week').append(day)}refreshCrmLinks()}
function toggleFavorite(id){favorites.has(id)?favorites.delete(id):favorites.add(id);store(FAVKEY,[...favorites]);renderProjects();renderBranches();}
function rowActions(node,url,id,isInternal,onInfo){const actions=el('div','cc-actions');actions.append(link('Apri',url),btn('Copia link',()=>copy(url)));if(isInternal)actions.append(btn('Anteprima',()=>preview(id,url)));actions.append(btn(favorites.has(id)?'★ Preferito':'☆ Preferito',()=>toggleFavorite(id)));if(onInfo)actions.append(btn('Dettagli',onInfo));node.append(actions)}
function preview(title,url){if(!url.startsWith(BASE))return;$('#cc-preview').classList.remove('cc-hidden');$('#cc-preview-name').textContent=title;$('#cc-frame').src=url;$('#cc-preview').scrollIntoView({behavior:'smooth',block:'nearest'})}
function renderProjects(){const target=$('#cc-project-list');target.replaceChildren();const list=PROJECTS.map(a=>({title:a[0],category:a[1],url:BASE+a[2],description:a[3],internal:true})).concat(EXTERNAL.map(a=>({title:a[0],category:a[1],url:a[2],description:a[3],internal:false}))).filter(p=>(p.title+' '+p.category+' '+p.description).toLocaleLowerCase('it').includes(filter));
if(!list.length)target.append(el('p','cc-empty','Nessun progetto corrispondente'));list.sort((a,b)=>Number(favorites.has(b.url))-Number(favorites.has(a.url))).forEach(p=>{const c=el('article','cc-item');c.append(el('b','',p.title),el('span','cc-pill',p.category),el('p','',p.description));rowActions(c,p.url,p.url,p.internal);target.append(c)})}
function branchCategory(name){if(name==='main')return'Produzione';if(name.startsWith('backup/'))return'Backup';if(name.startsWith('fix/'))return'Correzione';if(name.startsWith('audit/'))return'Audit';if(name.startsWith('test/'))return'Test';if(/^(feat|feature)\//.test(name))return'Sviluppo';return'Altro'}
function renderBranches(){const target=$('#cc-branch-list');target.replaceChildren();const list=branches.filter(b=>(b.name+' '+branchCategory(b.name)).toLocaleLowerCase('it').includes(filter)).sort((a,b)=>Number(favorites.has(urlBranch(b.name)))-Number(favorites.has(urlBranch(a.name)))||a.name.localeCompare(b.name));if(!list.length){target.append(el('p','cc-empty','Nessun ramo disponibile per il filtro o rete non disponibile'));return}list.forEach(b=>{const id=urlBranch(b.name),c=el('article','cc-item');c.append(el('b','',b.name),el('span','cc-pill',branchCategory(b.name)),el('p','',b.name==='main'?'Ramo di produzione. Il sito Pages dipende dalla configurazione di pubblicazione.':'Sorgente GitHub · anteprima web NON verificata'));c.append(el('small','',b.sha?'Commit: '+b.sha.slice(0,10):'Commit non disponibile'));rowActions(c,id,id,false,()=>detailBranch(b));target.append(c)})}
async function fetchJson(url){const res=await fetch(url,{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});if(!res.ok)throw Error('GitHub HTTP '+res.status);return res.json()}
async function refreshBranches(){const b=$('#cc-branch-refresh');b.disabled=true;$('#cc-branch-status').textContent='Lettura API GitHub…';try{let all=[];for(let page=1;page<=20;page++){const data=await fetchJson(API+'/branches?per_page=100&page='+page);if(!Array.isArray(data))throw Error('Formato inatteso');all=all.concat(data.map(x=>({name:x.name,sha:x.commit&&x.commit.sha})));if(data.length<100)break;if(page===20)throw Error('Risposta paginata incompleta')}if(!all.length)throw Error('Nessun ramo');branches=all;branchChecked=new Date().toISOString();cached=false;store(BRANCHKEY,{branches,checked:branchChecked});$('#cc-branch-status').textContent=branches.length+' branch · dati GitHub aggiornati '+new Date(branchChecked).toLocaleString('it-IT',{timeZone:'Europe/Rome'});notify('Branch GitHub aggiornati')}catch(e){let snap=load(BRANCHKEY,null);if(!snap){try{const r=await fetch('cc-branches-snapshot.json',{cache:'no-cache'});if(r.ok)snap=await r.json()}catch(_){}}if(snap&&Array.isArray(snap.branches)){branches=snap.branches;branchChecked=snap.checked;cached=true;$('#cc-branch-status').textContent=branches.length+' branch · archivio del '+new Date(branchChecked).toLocaleString('it-IT',{timeZone:'Europe/Rome'})+' (NON in tempo reale): '+e.message;}else $('#cc-branch-status').textContent='GitHub temporaneamente non disponibile: '+e.message;}finally{b.disabled=false;renderAll()}}
async function refreshPRs(){try{const data=await fetchJson(API+'/pulls?state=open&per_page=100');prs=Array.isArray(data)?data:[];stats()}catch(_){prs=[];stats()}}
async function detailBranch(b){const d=$('#cc-branch-detail');d.classList.remove('cc-hidden');d.replaceChildren(el('b','',b.name),el('p','','Caricamento dettagli…'));d.scrollIntoView({behavior:'smooth',block:'nearest'});try{const results=await Promise.all([fetchJson(API+'/commits/'+encodeURIComponent(b.sha)),fetchJson(API+'/compare/main...'+b.name.split('/').map(encodeURIComponent).join('%2F'))]);const commit=results[0],cmp=results[1];const p=el('p','', 'Ultimo commit: '+(commit.commit&&commit.commit.message?commit.commit.message.split('\n')[0]:'non disponibile')+' · '+(commit.commit&&commit.commit.author?commit.commit.author.date:'data non disponibile'));const diff=el('p','','Differenza da main: '+cmp.ahead_by+' avanti, '+cmp.behind_by+' indietro; stato '+cmp.status+'.');d.replaceChildren(el('b','',b.name),p,diff,el('p','','Anteprima web del ramo non verificata: apri il sorgente GitHub.'));d.append(link('Sorgente',urlBranch(b.name)),btn('Copia SHA',()=>copy(b.sha||'')))}catch(e){d.replaceChildren(el('b','',b.name),el('p','','Dettagli non disponibili: '+e.message+'. Il sorgente rimane accessibile dal pulsante Apri.'))}}
function allowedCrmUrl(value){
 try{
  const url=new URL(String(value||'').trim());
  if(url.protocol!=='https:'||url.username||url.password)return '';
  const host=url.hostname.toLowerCase();
  if(host==='1drv.ms'||host==='onedrive.live.com'||host==='drive.google.com'||host==='docs.google.com'||host==='excel.officeapps.live.com'||host.endsWith('.sharepoint.com'))return url.href;
 }catch(_){}
 return '';
}
let crmUrl=allowedCrmUrl(load(CRMKEY,'')); 
function onCrmClick(e){if(!crmUrl){e.preventDefault();showCrmSetup()}}
function showCrmSetup(){
 const d=$('#cc-crm-dialog');$('#cc-crm-url').value=crmUrl||'';$('#cc-crm-error').hidden=true;
 if(!d.open)d.showModal();
}
function refreshCrmLinks(){
 root.querySelectorAll('[data-cc-crm-link]').forEach(a=>{
  a.href=crmUrl||'#cc-crm';
  if(crmUrl){a.target='_blank';a.rel='noopener noreferrer'}else{a.removeAttribute('target');a.removeAttribute('rel')}
 });
 const status=$('#cc-crm-status');
 if(status){status.textContent=crmUrl?'CRM Excel collegato in questo browser. Premi Acquisizione 09:30–12:30 per aprire il file.':'CRM Excel non collegato su questo dispositivo. Premi Acquisizione e incolla il link Excel una sola volta.'}
 const clear=$('#cc-crm-clear');if(clear)clear.classList.toggle('cc-hidden',!crmUrl);
}
function saveCrmLink(e){
 e.preventDefault();
 const newUrl=allowedCrmUrl($('#cc-crm-url').value);
 if(!newUrl){const msg=$('#cc-crm-error');msg.textContent='Inserisci un link HTTPS OneDrive o Google Drive valido, direttamente al file Excel.';msg.hidden=false;return}
 crmUrl=newUrl;
 if(!store(CRMKEY,crmUrl))notify('Link temporaneo: memoria del browser non disponibile');
 $('#cc-crm-dialog').close();refreshCrmLinks();
 notify('CRM Excel collegato. Apertura del file…');
 // Navigation in this tab is reliable also when mobile browsers block popups.
 window.location.assign(crmUrl);
}
let editId=null;
function editTask(id,date){editId=id;const t=id?tasks.find(x=>x.id===id):null;const f=$('#cc-form');f.reset();f.elements.title.value=t?t.title:'';f.elements.date.value=t?t.date:(date||romeToday());f.elements.time.value=t?t.time:'14:00';f.elements.duration.value=t?t.duration:60;f.elements.actual.value=t?t.actual||0:0;f.elements.priority.value=t?t.priority:'P3';f.elements.status.value=t?t.status:'open';f.elements.project.value=t?t.project:'Catalogo immobili';f.elements.notes.value=t?t.notes||'':'';$('#cc-dialog-title').textContent=t?'Modifica attività':'Nuova attività';$('#cc-task-delete').classList.toggle('cc-hidden',!t);$('#cc-dialog').showModal();}
function formSubmit(e){e.preventDefault();const f=e.currentTarget;const date=f.elements.date.value,title=f.elements.title.value.trim();if(!date||isSunday(date)){notify('Non puoi pianificare attività manuali di domenica');window.alert('La domenica è esclusa dalla pianificazione.');return}if(!title)return;const t={id:editId||String(Date.now())+'-'+Math.random().toString(36).slice(2,8),title:title.slice(0,160),date,time:f.elements.time.value,duration:Number(f.elements.duration.value),actual:Number(f.elements.actual.value||0),priority:f.elements.priority.value,status:f.elements.status.value,project:f.elements.project.value,notes:f.elements.notes.value.slice(0,600)};if(t.duration<5||t.duration>720)return;if(editId){tasks=tasks.map(x=>x.id===editId?t:x)}else tasks.push(t);$('#cc-dialog').close();saveTasks();if(conflict(t))notify('Attività salvata · attenzione: conflitto con la fascia acquisizione');else notify('Attività salvata su questo dispositivo')}
function download(name,type,content){const a=document.createElement('a'),blob=new Blob([content],{type});a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function exportTasks(){download('case247-agenda.json','application/json',JSON.stringify({version:1,source:'CASE247',exported_at:new Date().toISOString(),tasks},null,2));notify('Backup JSON esportato')}
function ics(){const fmt=d=>d.replace(/[-:]/g,'');const clean=s=>String(s||'').replace(/[\\;,\n]/g,' ').slice(0,150);let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CASE247//Control Center//IT','CALSCALE:GREGORIAN'];tasks.forEach(t=>{let dt=fmt(t.date)+'T'+fmt(t.time)+'00',mins=timeM(t.time)+Number(t.duration),day=t.date;if(mins>=1440){day=plusDays(day,1);mins-=1440}let end=fmt(day)+'T'+String(Math.floor(mins/60)).padStart(2,'0')+String(mins%60).padStart(2,'0')+'00';lines.push('BEGIN:VEVENT','UID:'+t.id+'@case247.local','DTSTART;TZID=Europe/Rome:'+dt,'DTEND;TZID=Europe/Rome:'+end,'SUMMARY:'+clean(t.title),'DESCRIPTION:'+clean(t.priority+' · '+t.project),'END:VEVENT')});lines.push('END:VCALENDAR');download('case247-agenda.ics','text/calendar;charset=utf-8',lines.join('\r\n'));notify('Calendario ICS esportato: importazione manuale in Google Calendar')}
async function importTasks(e){const f=e.target.files&&e.target.files[0];if(!f)return;try{if(f.size>1000000)throw Error('File troppo grande');const data=JSON.parse(await f.text());if(data.source!=='CASE247'||data.version!==1||!Array.isArray(data.tasks))throw Error('File non compatibile');const valid=data.tasks.filter(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&!isSunday(t.date)&&/^\d{2}:\d{2}$/.test(t.time)&&Number(t.duration)>0).map(t=>({id:t.id,title:t.title.slice(0,160),date:t.date,time:t.time,duration:Number(t.duration),actual:Number(t.actual)||0,priority:priorities[t.priority]?t.priority:'P3',status:['open','working','postponed','done'].includes(t.status)?t.status:'open',project:String(t.project||'').slice(0,100),notes:String(t.notes||'').slice(0,600)}));if(!window.confirm('Importare '+valid.length+' attività? Le attività con lo stesso ID saranno aggiornate.'))return;const byId=new Map(tasks.map(t=>[t.id,t]));valid.forEach(t=>byId.set(t.id,t));tasks=[...byId.values()];saveTasks();notify(valid.length+' attività importate')}catch(err){notify('Importazione non riuscita: '+err.message)}finally{e.target.value=''}}
function renderAll(){stats();agenda();renderProjects();renderBranches()}
nav();
const sel=$('#cc-project-select');PROJECTS.forEach(p=>{const opt=el('option','',p[0]);opt.value=p[0];sel.append(opt)});
$('#cc-menu-toggle').onclick=()=>{const open=$('#cc-nav').classList.toggle('cc-open');$('#cc-menu-toggle').setAttribute('aria-expanded',String(open))};
$('#cc-search').oninput=e=>{filter=e.target.value.trim().toLocaleLowerCase('it');renderProjects();renderBranches()};
$('#cc-prev').onclick=()=>{weekStart=plusDays(weekStart,-7);agenda()};
$('#cc-next').onclick=()=>{weekStart=plusDays(weekStart,7);agenda()};
$('#cc-this').onclick=()=>{weekStart=monday(romeToday());agenda()};
$('#cc-new').onclick=()=>editTask(null);
$('#cc-crm-open').addEventListener('click',onCrmClick);
$('#cc-crm-config').onclick=showCrmSetup;
$('#cc-crm-form').onsubmit=saveCrmLink;
$('#cc-crm-cancel').onclick=()=>$('#cc-crm-dialog').close();
$('#cc-crm-clear').onclick=()=>{if(!window.confirm('Dissociare il CRM Excel da questo browser?'))return;try{localStorage.removeItem(CRMKEY)}catch(_){}crmUrl='';refreshCrmLinks();notify('Collegamento CRM rimosso da questo browser')};
$('#cc-form').onsubmit=formSubmit;
$('#cc-dialog-close').onclick=()=>$('#cc-dialog').close();
$('#cc-task-delete').onclick=()=>{if(!editId||!window.confirm('Eliminare questa attività?'))return;tasks=tasks.filter(t=>t.id!==editId);$('#cc-dialog').close();saveTasks();notify('Attività eliminata')};
$('#cc-export').onclick=exportTasks;$('#cc-ics').onclick=ics;
$('#cc-import').onclick=()=>$('#cc-import-file').click();$('#cc-import-file').onchange=importTasks;
$('#cc-refresh').onclick=()=>{refreshBranches();refreshPRs()};
$('#cc-branch-refresh').onclick=refreshBranches;
$('#cc-preview-close').onclick=()=>{$('#cc-frame').src='about:blank';$('#cc-preview').classList.add('cc-hidden')};
renderAll();refreshCrmLinks();refreshBranches();refreshPRs();
})();