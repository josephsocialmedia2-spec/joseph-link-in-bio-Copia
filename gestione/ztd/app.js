'use strict';

const get = id => document.getElementById(id);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const data = JSON.parse(get('source-data').textContent);
const storagePrefix = 'case247-ztd-unificata-v1-';
const dateTime = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const localized = new Intl.DateTimeFormat('it-IT', {dateStyle:'full',timeZone:'Europe/Rome'});
const today = () => dateTime.format(new Date()).slice(0,10);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const format = value => new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(value);
const mapLink = street => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(street + ', Avigliana TO');
const safeURL = value => {try {const url = new URL(value);return url.protocol === 'https:' ? url.href : '';} catch {return '';}};
const status = message => {get('status').textContent = message;};
const dateValid = date => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const value = new Date(date+'T12:00:00Z');
  return Number.isFinite(+value) && value.toISOString().slice(0,10) === date;
};
function addDays(date, days) {
  const value = new Date(date+'T12:00:00Z');
  value.setUTCDate(value.getUTCDate()+days);
  return value.toISOString().slice(0,10);
}
const displayDate = date => localized.format(new Date(date+'T12:00:00Z'));
const mode = () => get('mode').value;
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const strings = (value, keys) => isRecord(value) && keys.every(key => typeof value[key] === 'string');
const integerField = (value,min) => value === '' || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value)>=min);
const blankDay = () => ({done:[],social:false,yesterday:'',tomorrow:'',stage:'',review:''});
const blank = () => ({version:1,days:{},setup:{},start:'',checks:{},trips:[],drafts:{},news:[],qual:[],imports:[]});

const initialDrafts = Object.fromEntries([
  ...data.drafts.map(([title,text],i) => ['original-'+i,{title,text,format:['Post Facebook / Instagram','Reel / TikTok / Shorts','Email','Lettera / Volantino'][i]}]),
  ['falcone-post',{title:'Avigliana | Via Falcone 41 · post',format:'Post Facebook / Instagram',text:'Avigliana | Via Falcone 41\n\nÈ in vendita un alloggio in Via Falcone 41, ad Avigliana. Per la spesa e le commissioni quotidiane, in zona trovi il Conad Superstore, la Parafarmacia Conad e il PENNY. La Sacra Immobiliare gestisce visite e trattativa.\n\nVuoi informazioni o vuoi fissare una visita? Scrivi a Joseph Malafronte su WhatsApp al 371 370 8294.'}],
  ['falcone-video',{title:'Avigliana | Via Falcone 41 · video',format:'Reel / TikTok / Shorts',text:'Oggi ti porto ad Avigliana, in Via Falcone 41, dove c’è un alloggio in vendita. Tra Via Falcone e Via Carlo Alberto Dalla Chiesa trovi Conad, parafarmacia e PENNY. Per informazioni, scrivimi su WhatsApp al 371 370 8294. Sono Joseph Malafronte. Le visite e la trattativa sono gestite da La Sacra Immobiliare.'}],
  ...[
    ['Prezzi medi della zona','Confrontiamo le fasce OMI di Avigliana per zona, tipologia e stato. [Inserire semestre e fonte verificati.]'],
    ['Attività locale','Presentiamo un’attività del territorio. [Inserire nome, fonte e autorizzazione alla citazione.]'],
    ['Casa in vendita autorizzata','Presentiamo un immobile con il consenso del partner. [Inserire link alla scheda e caratteristiche confermate.]'],
    ['Notizie locali','Questa settimana ad Avigliana. [Inserire notizia, data, fonte originale e stato della verifica.]']
  ].map(([title,text],i)=>['email-'+(i+1),{title:'Email '+(i+1)+' · '+title,format:'Email',text:'Oggetto: '+title+'\n\nBuongiorno,\n'+text+'\n\nJoseph Malafronte · Marketing e visibilità immobiliare\n[Dati legali del mittente e link di disiscrizione da verificare.]'}])
]);
const reportedTrip = {id:'giro-falcone-2026-11-24',date:'2026-11-24',streets:'Via Francesca e Giovanni Falcone · Via Carlo Alberto Dalla Chiesa',civics:'',minutes:'60',prepared:'',delivered:'',restrictions:'Da controllare',notes:'Giro segnalato da Joseph. Durata complessiva sulle due vie. Conteggio volantini da registrare.'};

function validate(value) {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.days) || !isRecord(value.setup) || !isRecord(value.checks) ||
      !isRecord(value.drafts) || (value.start !== '' && !dateValid(value.start))) return false;
  const idsValid = list => Array.isArray(list) && new Set(list.map(item=>item?.id)).size === list.length;
  const tripValid = t => strings(t,['id','date','streets','civics','minutes','prepared','delivered','restrictions','notes']) &&
    dateValid(t.date) && !!t.streets.trim() && integerField(t.minutes,1) && integerField(t.prepared,0) && integerField(t.delivered,0) &&
    (t.prepared === '' || t.delivered === '' || +t.delivered <= +t.prepared);
  return Object.entries(value.days).every(([date,d]) => dateValid(date) && strings(d,['yesterday','tomorrow','stage','review']) &&
      typeof d.social === 'boolean' && Array.isArray(d.done) && d.done.every(i => Number.isInteger(i) && i>=0 && i<9) && new Set(d.done).size===d.done.length) &&
    Object.entries(value.setup).every(([i,flag]) => /^(?:[0-9]|1[0-3])$/.test(i) && typeof flag === 'boolean') &&
    Object.entries(value.checks).every(([i,c]) => ['30','60','90'].includes(i) && strings(c,['note']) && typeof c.done === 'boolean') &&
    Object.entries(value.drafts).every(([id,d]) => /^[a-zA-Z0-9_-]+$/.test(id) && strings(d,['title','format','text']) && typeof d.archived === 'boolean') &&
    idsValid(value.trips) && value.trips.every(tripValid) &&
    idsValid(value.news) && value.news.every(n=>strings(n,['id','title','zone','date','source','status','draft']) && dateValid(n.date) && (!n.source || safeURL(n.source))) &&
    idsValid(value.qual) && value.qual.every(q=>strings(q,['id','ref','town','type','reason','timing','proof']) && typeof q.allowed === 'boolean' && (!q.allowed || q.proof.trim())) &&
    Array.isArray(value.imports) && value.imports.every(i=>typeof i==='string');
}
function read(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
const blocked = new Set();
const states = {};
for(const environment of ['live','demo']){
  try {
    const existing = read(storagePrefix + environment);
    if(existing !== null && !validate(existing)) throw new Error('Formato archivio non valido');
    states[environment] = existing || blank();
    if(environment==='live' && !existing) states.live.trips.push({...reportedTrip});
  } catch {
    states[environment] = blank();
    blocked.add(environment);
  }
}
const state = () => states[mode()];
function write(next,message) {
  const environment = mode();
  try {
    if(blocked.has(environment)) throw new Error('Archivio esistente illeggibile. Esportalo prima di ripristinare.');
    if(!validate(next)) throw new Error('Controlla il formato e i campi inseriti.');
    localStorage.setItem(storagePrefix+environment,JSON.stringify(next));
    states[environment]=next;
    status(message);
    return true;
  } catch(error) {
    status('Salvataggio non riuscito. '+error.message);
    return false;
  }
}
function change(update,message='Salvato.') {
  const next=JSON.parse(JSON.stringify(state()));
  update(next);
  return write(next,message);
}
const day = () => state().days[today()] || blankDay();
function updateDay(update,message) {
  return change(next => update(next.days[today()] ??= blankDay()),message);
}
const entries = form => Object.fromEntries(new FormData(form));
const idFor = () => crypto.randomUUID();
function populate(form,item) {
  for(const [key,value] of Object.entries(item)){
    const field=form.elements.namedItem(key);
    if(!field)continue;
    if(field.type==='checkbox')field.checked=Boolean(value);
    else field.value=value;
  }
}
function upsert(list,item) {
  const index=list.findIndex(row=>row.id===item.id);
  if(index>=0)list[index]=item;
  else list.push(item);
}
function download(name,contents,type) {
  const url=URL.createObjectURL(new Blob([contents],{type}));
  const a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

const tabs=all('[role=tab]');
const tabIDs=tabs.map(button=>button.dataset.tab);
const publicHashes={"daily":"daily","roads":"omi-presidio","startup":"primi-14-giorni","rules":"attivita-divieti","drafts":"notizie-qualifica","tools":"strumenti-report"};
const internalHashes=Object.fromEntries(Object.entries(publicHashes).map(([k,v])=>[v,k]));
function tab(id,focus=false) {
  if(!tabIDs.includes(id))id='daily';
  for(const group of document.querySelectorAll('[data-submenu]'))group.hidden=group.dataset.submenu!==id;
  for(const button of tabs){
    const active=button.dataset.tab===id;
    button.setAttribute('aria-selected',String(active));
    button.tabIndex=active?0:-1;
    get(button.dataset.tab).hidden=!active;
    if(active&&focus)button.focus();
  }
}
for(const [i,button] of tabs.entries()){
  button.id='tab-'+button.dataset.tab;
  button.setAttribute('aria-controls',button.dataset.tab);
  get(button.dataset.tab).setAttribute('aria-labelledby',button.id);
  button.onclick=()=>{location.hash=publicHashes[button.dataset.tab];tab(button.dataset.tab);};
  button.onkeydown=event=>{
    const index={ArrowLeft:(i+tabs.length-1)%tabs.length,ArrowRight:(i+1)%tabs.length,ArrowUp:(i+tabs.length-1)%tabs.length,ArrowDown:(i+1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
    if(index===undefined)return;
    event.preventDefault();location.hash=publicHashes[tabIDs[index]];tab(tabIDs[index],true);
  };
}
function followHash() {
  const hash=location.hash.slice(1);
  const rule=hash==='regole-telefonata'?'regola-10':hash;
  if(/^regola-(?:[1-9]|10)$/.test(rule)){
    tab('rules');const target=get(rule);target.open=true;target.scrollIntoView({block:'center'});target.querySelector('summary').focus();return;
  }
  const aliases={'qualifica':'qualifica-domande','allenamento-obiezioni':'obiezioni-timer','obiezioni':'obiezioni-timer'};
  const target=get(aliases[hash]||hash);
  if(target&&!tabIDs.includes(hash)){
    const panel=target.closest('[role="tabpanel"]');
    if(panel){tab(panel.id);target.scrollIntoView({block:'start'});return;}
  }
  tab(internalHashes[hash]||hash);
}
window.addEventListener('hashchange',followHash);
get('security').textContent=data.security;
get('manual-day').innerHTML=data.daily.map(([label,task,result])=>
  `<article class="entry"><h3>${esc(label)}</h3><p>${esc(task)}</p><p><strong>Controllo finale</strong> · ${esc(result)}</p></article>`).join('');
get('rules-list').innerHTML=data.rules.map(([title,action,avoid],i)=>
  `<details class="entry" id="regola-${i+1}"><summary>${esc(title)}</summary><p><strong>Cosa fare</strong> · ${esc(action)}</p><p class="gold"><strong>Cosa NON fare (per evitare multe o guai)</strong> · ${esc(avoid)}</p></details>`).join('');

const method = [
  ['Verifica richieste e consensi',[0]],['Crea contenuti e video',[1,2]],['Programma post e testa QR',[3,4]],
  ['Gestisci solo richieste consentite',[6,7]],['Chiudi e annota priorità',[8]]
];
const results = ['Registro Excel aggiornato.','Almeno un contenuto informativo pronto.','Post e script pronti.','Programmazione manuale verificata.','Pagine e QR verificati da telefono.','—','Esiti dei richiami annotati.','Passaggi autorizzati registrati.','Report e tre priorità per domani salvati.'];
const minute = time => {const [h,m]=time.split(':').map(Number);return h*60+m;};
const limits=data.slots.map(([range])=>range.split('–').map(minute));
let displayedDay='';
let currentSlot=-1;
function renderDayForm(){
  const form=get('day-form');
  form.reset();
  const date=today();
  const saved=day();
  populate(form,{...saved,yesterday:saved.yesterday||state().days[addDays(date,-1)]?.tomorrow||''});
}
get('day-stage').innerHTML='<option value="">Seleziona</option><option value="regime">A regime</option>'+Array.from({length:14},(_,i)=>`<option value="${i+1}">Giorno ${i+1}</option>`).join('');
get('day-form').onsubmit=event=>{
  event.preventDefault();
  updateDay(d=>Object.assign(d,entries(event.currentTarget)));
  renderReport();
};
const slotLinks=[[["Apri richieste e consensi","../case247-comunicazioni/"],["Apri CRM operativo","../acquisizione-farming/crm/"],["Scarica installer Excel","../acquisizione-farming/excel/CASE247_Acquisizione_Installer.bas","download"]],[["Apri registro notizie","#registro-notizie"],["Apri bozze email","#bozze-email"],["APRI LA RIVISTA PDF SFOGLIABILE","../rivista/sfoglia/"],["APRI LE LETTERE A, B E C","../acquisizione-farming/#lettere"],["APRI LA LETTERA C IMPAGINATA PER LA STAMPA","../lettere-stampa/lettera-c-23-11-aggiornata.html"],["Apri rivista","../rivista/"],["Consulta quotazioni OMI","#quotazioni-omi"]],[["Crea post e script","#draft-form"],["Apri piano editoriale","../piano-editoriale/"]],[["Apri canali social","../canali-case247/"],["Apri piano editoriale","../piano-editoriale/"],["Apri quadro social","../quadro-social/"]],[["Verifica landing","../quadro-social/"],["Apri modulo pubblico da testare","../../campagne/case247/richieste-immobili/"],["Apri qualifica","#qualifica-domande"],["Allenamento obiezioni","#obiezioni-timer"]],[],[["Apri richieste e consensi","../case247-comunicazioni/"],["Apri CRM operativo","../acquisizione-farming/crm/"],["Regole telefonata","#regole-telefonata"]],[["Registra qualifica e consenso","#qualifica-domande"],["Apri richieste e consensi","../case247-comunicazioni/"],["Regola passaggio agenzia","#regola-9"]],[["Apri report","#report-stampa"],["Scrivi priorità per domani","#day-form"],["Backup e ripristino","#backup-ripristino"]]];
function actionLink(item, label=item[0], cls='button'){
  const href=item[1], local=href.startsWith('#');
  return '<a class="'+cls+'" href="'+esc(href)+'"'+(item[2]==='download'?' download':local?'':' target="_blank" rel="noopener"')+'>'+esc(label)+'</a>';
}
function slotCard(index) {
  const [time,title,task]=data.slots[index], links=slotLinks[index];
  const heading=esc(time)+' · '+esc(title);
  return `<div class="entry" data-slot="${index}" id="fascia-${index}"><h3>${links.length?actionLink(links[0],time+' · '+title,'slot-title'):heading}</h3><p>${esc(task)}</p>${links.length?'<div class="row">'+links.map(item=>actionLink(item)).join('')+'</div>':'<p class="gold">Pausa protetta: nessun contatto o invio.</p>'}<p class="muted">${esc(results[index])}</p><label><input type="checkbox" data-today="${index}"> Completato</label>${index===3?'<label><input type="checkbox" data-today="social"> Programmare i post su tutte le piattaforme social <strong class="gold">· OBBLIGATORIO OGNI GIORNO</strong></label>':''}</div>`;
}
get('steps').innerHTML=method.map(([title,indexes],i)=>
  (i===3?slotCard(5):'')+`<section><h3>${i+1}. ${title}</h3>${indexes.map(slotCard).join('')}</section>`).join('');
function updateChecklist() {
  const d=day();
  for(const box of all('[data-today]')){
    const key=box.dataset.today;
    box.checked=key==='social'?d.social:d.done.includes(+key);
  }
  const count=d.done.length+(d.social?1:0);
  get('progress').value=count;
  get('progress-label').textContent=count+' / 10 attività spuntate';
  const next=[...data.slots.keys()].find(i=>!d.done.includes(i)||(i===3&&!d.social));
  get('next').dataset.slot=next??'';
  const activeDate=dateTime.format(new Date());
  get('next').disabled=next===undefined || minute(activeDate.slice(11,16))<480 ||
    minute(activeDate.slice(11,16))>=960 || currentSlot===5 || next>currentSlot;
}
function tick(){
  const timestamp=dateTime.format(new Date()), date=timestamp.slice(0,10), time=timestamp.slice(11), m=minute(time);
  get('clock').textContent=time;get('clock').dateTime=timestamp.replace(' ','T');
  if(displayedDay!==date){
    displayedDay=date;get('date-label').textContent=displayDate(date);
    renderDayForm();
    if(!get('trip-form').elements.id.value)get('trip-form').elements.date.value=date;
    if(!get('news-form').elements.id.value)get('news-form').elements.date.value=date;
    if(!get('report-date').value)get('report-date').value=date;
    renderChecks();renderReport();
  }
  currentSlot=limits.findIndex(([from,to])=>m>=from && m<to);
  get('countdown').textContent=m>=960?'STOP 16:00 · Giornata conclusa':'Stop 16:00 · '+Math.floor((960-m)/60)+' h '+(960-m)%60+' min';
  get('now').textContent=m>=960?'Giornata conclusa. Consulta lo storico o il manuale.':m<480?'Alle 08:00 · Richieste e CRM Excel':data.slots[currentSlot][0]+' · '+data.slots[currentSlot][1]+' — '+data.slots[currentSlot][2];
  get('control').textContent=currentSlot>=0?results[currentSlot]:'—';
  get('social-now').hidden=m<630||m>=720;
  const quick=get('now-actions');
  const key=String(currentSlot);
  if(quick.dataset.slot!==key){quick.dataset.slot=key;quick.innerHTML=currentSlot>=0&&slotLinks[currentSlot]?.length?slotLinks[currentSlot].map(item=>actionLink(item)).join(''):'';}
  for(const card of all('[data-slot].entry'))card.classList.toggle('active',+card.dataset.slot===currentSlot);
  updateChecklist();
}
document.addEventListener('change',event=>{
  const box=event.target;
  if(!box.matches('[data-today]'))return;
  const key=box.dataset.today;
  updateDay(d=>{
    if(key==='social')d.social=box.checked;
    else d.done=box.checked?[...new Set([...d.done,+key])]:d.done.filter(i=>i!==+key);
  });
  updateChecklist();renderReport();
});
get('next').onclick=()=>{
  const slot=Number(get('next').dataset.slot);
  if(slot===3 && !day().social){status('Spunta separatamente la programmazione social quando è completata.');return;}
  updateDay(d=>{if(!d.done.includes(slot))d.done.push(slot);});
  updateChecklist();renderReport();
};
get('reset-day').onclick=()=>{
  if(confirm('Azzerare soltanto le spunte della giornata in questo ambiente?')){
    updateDay(d=>{d.done=[];d.social=false;},'Spunte di oggi azzerate.');updateChecklist();renderReport();
  }
};

const stageGroups=[[0],[1],[2],[3],[4],[5],[6],[7,8,9,10],[11,12,13]];
function renderSetup(){
  get('start').value=state().start;
  const completed=Object.values(state().setup).filter(Boolean).length;
  get('setup-progress').textContent=completed+' / 14 giorni spuntati';
  get('resume').disabled=completed===14;
  get('setup').innerHTML=data.setup.map(([label,task,result],i)=>`<article class="entry"><h3>${esc(label)}</h3><p>${esc(task)}</p><p><strong>Risultato da ottenere</strong> · ${esc(result)}</p>${i===3?'<p class="gold">Collaudo database superato · test automatici GitHub superati. Raccolta pubblica disabilitata.</p><div class="row"><a class="button" href="./collaudo-giorno4/">Apri simulazione Giorno 4</a><a class="button" href="https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/runs/45606172629" target="_blank" rel="noopener">Esito test automatici</a></div>':''}${stageGroups[i].map(day=>`<label><input type="checkbox" data-setup="${day}" ${state().setup[day]?'checked':''}> Giorno ${day+1} completato</label>`).join('')}</article>`).join('');
}
get('setup').onchange=event=>{
  const box=event.target;
  if(box.matches('[data-setup]')){
    change(next=>{next.setup[box.dataset.setup]=box.checked;});
    const key=box.dataset.setup;renderSetup();get('setup').querySelector('[data-setup="'+key+'"]').focus();
  }
};
get('resume').onclick=()=>{
  const box=all('[data-setup]').find(input=>!input.checked);
  if(box){box.scrollIntoView({block:'center'});box.focus();}
};
get('start').onchange=()=>{
  const date=get('start').value;
  change(next=>{next.start=date;});renderSetup();renderChecks();
};

const {omi,falcone}=data;
const zoneNames=Object.fromEntries(omi.zones.map(r=>[r.code,r.name]));
const streets=[...data.streets,{code:falcone.zone,street:'Via Francesca e Giovanni Falcone 41',note:'Civico verificato con il punto idealista (45.08529, 7.40705) incrociato con il perimetro OMI A518. Esito riferito al solo civico 41.',verified:true}];
get('semester').textContent='OMI · Avigliana A518 · semestre '+omi.meta.semester+' · '+omi.meta.source;
get('zone').innerHTML='<option value="">Tutte le zone</option>'+omi.zones.map(r=>`<option value="${r.code}">${r.code} · ${esc(r.name)}</option>`).join('')+'<option value="pending">Zona da verificare</option>';
const allPoints=Object.values(omi.polygons).flat();
const extent=[Math.min(...allPoints.map(p=>p[0])),Math.max(...allPoints.map(p=>p[1])),Math.max(...allPoints.map(p=>p[0])),Math.min(...allPoints.map(p=>p[1]))];
const project=([x,y])=>[7+166*(x-extent[0])/(extent[2]-extent[0]),7+118*(extent[1]-y)/(extent[1]-extent[3])];
function renderRoads(){
  const zone=get('zone').value, filter=get('verified').value;
  const selected=streets.filter(r=>(!zone||zone===(r.code||'pending'))&&(!filter||Boolean(r.verified)===(filter==='verified')));
  get('street-list').innerHTML=selected.map(r=>`<article class="entry"><h3>${esc(r.street)}</h3><p>${esc(r.code||'Zona da verificare')} · ${esc(r.note)}</p><a href="${mapLink(r.street)}" target="_blank" rel="noopener">Apri su Google Maps</a>${r.verified?' · <a href="'+esc(falcone.source)+'">Fonte del civico</a>':''}</article>`).join('')||'<p>Nessuna via per i filtri selezionati.</p>';
  const [cx,cy]=project(falcone.coords);
  get('map').innerHTML='<svg viewBox="0 0 180 132" role="img" aria-label="Perimetri OMI di Avigliana con punto del civico Falcone 41">'+Object.entries(omi.polygons).map(([name,ring])=>{
    const code=name.split(' - ').at(-1);
    return `<polygon class="${code===zone?'selected':''}" points="${ring.map(point=>project(point).map(v=>v.toFixed(2)).join(',')).join(' ')}"><title>${esc(code+' · '+zoneNames[code])}</title></polygon>`;
  }).join('')+`<circle cx="${cx}" cy="${cy}" r="1.8"><title>Via Falcone 41 · D1</title></circle></svg>`;
  get('quotes').innerHTML=omi.quotes.filter(row=>!zone||row.zone===zone).map(r=>`<tr><td>${r.zone}</td><td>${esc(r.type)}</td><td>${esc(r.condition)}</td><td>${format(r.min)}–${format(r.max)}</td><td>${format(r.rentMin)}–${format(r.rentMax)}</td><td>${r.surface==='L'?'Lorda':esc(r.surface)}</td></tr>`).join('')||'<tr><td colspan="6">Seleziona una zona OMI per vedere le quotazioni.</td></tr>';
}
get('zone').onchange=renderRoads;
get('verified').onchange=renderRoads;
function rates(t) {
  if(!(+t.minutes>0)||t.delivered==='')return 'Indicatori non calcolati · serve il conteggio consegnato e la durata';
  const count=+t.delivered;
  return format(count*60/+t.minutes)+' volantini/ora · '+(count?format(+t.minutes/count)+' min per volantino':'minuti per volantino non applicabili');
}
const actionButton=(id,label,action)=>`<button type="button" data-action="${action}" data-id="${esc(id)}">${label}</button>`;
function renderTrips(){
  get('trips').innerHTML=[...state().trips].sort((a,b)=>b.date.localeCompare(a.date)).map(t=>
    `<article class="entry"><h3>${esc(t.date)} · ${esc(t.streets)}</h3><p>Civici: ${esc(t.civics||'—')} · Durata: ${esc(t.minutes||'—')} min · Preparati: ${esc(t.prepared||'—')} · Consegnati: ${esc(t.delivered||'—')}</p><p>${esc(t.restrictions)} · ${esc(t.notes)}</p><p>${rates(t)}</p>${actionButton(t.id,'Modifica','trip')}</article>`).join('')||'<p>Nessun giro registrato.</p>';
}
function resetForm(form) {
  form.reset();form.elements.id.value='';
  if(form.elements.date)form.elements.date.value=today();
}
get('trip-form').onsubmit=event=>{
  event.preventDefault();const form=event.currentTarget,item=entries(form);
  item.id||=idFor();
  if(change(next=>upsert(next.trips,item))){resetForm(form);renderTrips();renderReport();}
};
const csvCell=value=>{
  let text=String(value??'');
  if(/^\s*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
};
get('csv').onclick=()=>{
  const keys=['date','streets','civics','minutes','prepared','delivered','restrictions','notes'];
  const rows=[['Ambiente','Data','Vie','Civici','Minuti','Preparati','Consegnati','Divieti','Note'],...state().trips.map(t=>[mode()==='demo'?'Prova':'Operativo',...keys.map(key=>t[key])])];
  download('CASE247-diario-'+mode()+'.csv','\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
};

const drafts=()=>Object.fromEntries(Object.entries({...initialDrafts,...state().drafts}).map(([id,d])=>[id,{archived:false,...d}]));
function renderDrafts(){
  const records=Object.entries(drafts()), current=get('news-draft').value;
  get('draft-list').innerHTML=records.filter(([,d])=>get('archived').checked||!d.archived).map(([id,d])=>
    `<details class="entry"><summary>${esc(d.title)}${d.archived?' · Archiviata':''}</summary><p>${esc(d.format)}</p><pre>${esc(d.text)}</pre><div class="row">${actionButton(id,'Copia testo','copy')}${actionButton(id,'Modifica','draft')}${actionButton(id,d.archived?'Riattiva':'Archivia','archive')}</div></details>`).join('');
  get('news-draft').innerHTML='<option value="">Nessuna</option>'+records.map(([id,d])=>`<option value="${esc(id)}">${esc(d.title)}</option>`).join('');
  get('news-draft').value=current;
}
get('archived').onchange=renderDrafts;
get('draft-form').onsubmit=event=>{
  event.preventDefault();const form=event.currentTarget,{id,...item}=entries(form);const key=id||idFor();
  if(change(next=>{next.drafts[key]={...item,archived:drafts()[key]?.archived||false};})){resetForm(form);renderDrafts();renderNews();}
};
get('news-form').onsubmit=event=>{
  event.preventDefault();const form=event.currentTarget,item=entries(form);
  item.id||=idFor();
  if(item.status==='Verificata' && !safeURL(item.source)){status('Per una notizia verificata indica la fonte HTTPS.');return;}
  if(change(next=>upsert(next.news,item))){resetForm(form);renderNews();}
};
function renderNews(){
  const records=mode()==='live'?[{id:'n-falcone',date:'2026-11-24',title:'Giro e servizi locali · Via Falcone 41',zone:'Avigliana',source:falcone.source,status:'Segnalazione di Joseph',draft:'falcone-post'},...state().news]:state().news;
  get('news-list').innerHTML=records.map(n=>{
    const href=safeURL(n.source), draft=drafts()[n.draft];
    return `<article class="entry"><h3>${esc(n.title)}</h3><p>${esc(n.date)} · ${esc(n.zone)} · ${esc(n.status)}</p>${href?'<a href="'+esc(href)+'" target="_blank" rel="noopener">Apri fonte</a> ':''}${draft?'· Bozza: '+esc(draft.title):''} ${n.id==='n-falcone'?'':actionButton(n.id,'Modifica','news')}</article>`;
  }).join('')||'<p>Nessuna notizia registrata.</p>';
}
get('qual-form').onsubmit=event=>{
  event.preventDefault();const form=event.currentTarget,item=entries(form);
  item.id||=idFor();item.allowed=item.allowed==='on';
  if(item.allowed&&!item.proof.trim()){status('Indica il riferimento alla prova del permesso.');return;}
  if(change(next=>upsert(next.qual,item))){resetForm(form);renderQual();}
};
function renderQual(){
  get('qual-list').innerHTML=state().qual.map(q=>
    `<article class="entry"><h3>${esc(q.ref)} · ${esc(q.town)}</h3><p>${esc(q.type)} · ${esc(q.reason)} · ${esc(q.timing)}</p><p>${q.allowed?'Permesso registrato · '+esc(q.proof):'Permesso per il passaggio non registrato'}</p>${actionButton(q.id,'Modifica','qual')}</article>`).join('');
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');
  if(!button)return;
  const {action,id}=button.dataset;
  if(action==='copy'){
    try {await navigator.clipboard.writeText(drafts()[id].text);button.textContent='Copiato';}
    catch {status('Copia il testo selezionandolo nella scheda.');}
    return;
  }
  if(action==='archive'){
    const current=drafts()[id];
    change(next=>{next.drafts[id]={...current,archived:!current.archived};});
    renderDrafts();return;
  }
  const source={trip:state().trips,news:state().news,qual:state().qual};
  const item=action==='draft'?{id,...drafts()[id]}:source[action]?.find(row=>row.id===id);
  if(item){
    const form=get(action+'-form');
    form.reset();populate(form,item);form.scrollIntoView({block:'center'});form.querySelector('input:not([type=hidden])')?.focus();
  }
});

const milestoneDays=[30,60,90];
function renderChecks(){
  get('checks').innerHTML=milestoneDays.map((n,i)=>{
    const due=state().start?addDays(state().start,n-1):'';
    const dueText=due?displayDate(due)+(due===today()?' · Oggi':due<today()&&!state().checks[n]?.done?' · Scaduto':''):'Imposta la data d’avvio nei Primi 14 giorni';
    const check=state().checks[n]||{};
    return `<form class="entry" data-milestone="${n}"><h3>${esc(data.deadlines[i].split(':')[0])}</h3><p>${esc(data.deadlines[i].slice(data.deadlines[i].indexOf(':')+2))}</p><p>${esc(dueText)}</p><label><input name="done" type="checkbox" ${check.done?'checked':''}> Completato</label><label>Note<textarea name="note">${esc(check.note)}</textarea></label><button>Salva controllo</button></form>`;
  }).join('');
}
get('checks').onsubmit=event=>{
  event.preventDefault();const form=event.target,item=entries(form);
  change(next=>{next.checks[form.dataset.milestone]={note:item.note,done:item.done==='on'};});
};
function renderReport(){
  const date=get('report-date').value||today();
  if(!dateValid(date))return;
  const weekly=get('period').value==='week',weekday=new Date(date+'T12:00:00Z').getUTCDay();
  const from=weekly?addDays(date,-((weekday+6)%7)):date,to=weekly?addDays(from,6):date;
  const days=Object.entries(state().days).filter(([date])=>from<=date&&date<=to).sort(([a],[b])=>a.localeCompare(b));
  const trips=state().trips.filter(t=>from<=t.date&&t.date<=to);
  const tracked=trips.filter(t=>t.delivered!=='').length;
  const minutes=trips.filter(t=>t.minutes!=='');
  get('report').innerHTML=`<h3>${mode()==='live'?'Operativo':'Simulazione'} · ${from}${weekly?' – '+to:''}</h3>
  <p>${days.reduce((n,[,d])=>n+d.done.length+Number(d.social),0)} attività completate · ${trips.length} giri · ${minutes.length?minutes.reduce((n,t)=>n+Number(t.minutes),0)+' min registrati':'Durate non registrate'} · ${tracked?trips.reduce((n,t)=>n+Number(t.delivered),0)+' volantini consegnati registrati':'Conteggi volantini non registrati'}</p>
  ${days.map(([day,d])=>`<article class="entry"><h3>${day}</h3><p>${d.done.map(i=>esc(data.slots[i][1])).concat(d.social?['Programmazione social']:[]).join(' · ')||'Nessuna spunta'}</p><strong>Prossime priorità</strong><pre>${esc(d.tomorrow||'—')}</pre></article>`).join('')}
  ${trips.map(t=>`<article class="entry"><h3>${esc(t.date)} · ${esc(t.streets)}</h3><p>${esc(t.civics||'Civici da registrare')} · ${esc(t.minutes||'—')} min · ${esc(t.delivered||'—')} volantini · ${rates(t)}</p></article>`).join('')}`;
}
get('report-date').onchange=renderReport;
get('period').onchange=renderReport;
get('print').onclick=()=>{
  document.body.classList.add('printing-report');window.print();
};
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-report'));

const linkRows=[
  ['Centro farming','../acquisizione-farming/'],['Lettere stampa','../lettere-stampa/'],
  ['Dashboard storica','../'],['Sito principale','../../'],
  ['Fonte OMI · Agenzia Entrate','https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/index.htm'],
  ['GitHub','https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia'],
  ['Dashboard di prova','../dashboard-prova/']
];
get('links').innerHTML=linkRows.map(([label,href])=>`<a class="button" href="${href}" target="_blank" rel="noopener">${label}</a>`).join('');
const letterQR=JSON.parse(get('letter-data').textContent);
const letterC='../lettere-stampa/lettera-c-23-11-aggiornata.html';
const letterText={
  A:'Se desidera orientarsi sui prezzi delle abitazioni ad Avigliana, può consultare i nostri materiali informativi sul mercato locale.',
  B:'Le presentiamo il nostro lavoro di comunicazione immobiliare ad Avigliana e in Valle di Susa. Il catalogo digitale raccoglie informazioni e materiali di promozione.'
};
function letterHTML(type){
  return `<!doctype html><html lang="it"><meta charset="utf-8"><title>CASE247 · Lettera ${type}</title>
  <style>@page{size:A4;margin:18mm}body{margin:16px;font:12pt/1.55 Arial,sans-serif;color:#19263b;background:white}h3{border-bottom:2px solid #d18c32;padding-bottom:7px}img{width:132px}a{overflow-wrap:anywhere}@media print{body{margin:0}}</style>
  <p><strong>SIMULAZIONE · Lettera ${type}</strong></p><h3>INFORMAZIONI IMMOBILIARI — AVIGLIANA</h3>
  <p>Gentile residente,</p><p>${letterText[type]}</p>
  <p>Il materiale è di carattere generale: non presuppone che il destinatario voglia vendere né che esistano acquirenti già interessati all'immobile.</p>
  <p>Il nostro ruolo è esclusivamente di comunicazione e marketing; le attività riservate alla mediazione competono agli agenti abilitati.</p>
  <img src="${letterQR.data}" alt="QR catalogo"><p><a href="${esc(letterQR.url)}">${esc(letterQR.url)}</a></p>
  <p>Distinti saluti<br><strong>Comunicazione territoriale CASE247</strong></p></html>`;
}
function showLetter(type){
  const frame=document.createElement('iframe');
  frame.title='Anteprima lettera '+type;
  if(type==='C')frame.src=letterC;
  else frame.srcdoc=letterHTML(type);
  get('letter-preview').replaceChildren(frame);
  get('letter-note').textContent=type==='C'?'Lettera C · modello pubblicato A5 fronte-retro':'Lettera '+type+' · modello A4 della Dashboard di Prova. Il foglio è contrassegnato come simulazione.';
}
get('letter-controls').innerHTML=['A','B','C'].map(t=>`<button type="button" data-letter="${t}">Anteprima ${t}</button>`).join('')+'<button type="button" id="letter-print" disabled>Stampa lettera selezionata</button><a href="'+letterC+'" target="_blank" rel="noopener">Apri la C originale</a>';
get('letter-controls').onclick=event=>{
  const type=event.target.dataset.letter;
  if(type){showLetter(type);get('letter-print').disabled=false;}
};
get('letter-print').onclick=()=>get('letter-preview').querySelector('iframe')?.contentWindow.print();

get('training-instruction').textContent=data.daily[8][1];
const objections=['Non voglio agenzie.','Vendo da solo.','Ho già un agente.','Non pago commissioni.','Ho già fissato il prezzo.','Adesso non ho tempo.','Mi richiami più avanti.','Prima mi mandi una brochure.','Non ho fretta.','Voglio prima conoscere i prezzi.'];
let objection=0, trainingEnd=0;
get('objection').textContent=objections[0];
get('objection-next').onclick=()=>{objection=(objection+1)%objections.length;get('objection').textContent=objections[objection];};
get('training-timer').onclick=()=>{
  const m=minute(dateTime.format(new Date()).slice(11,16));
  if(m<480||m>=720){status('Usa il timer di allenamento nella fascia mattutina 08:00–12:00.');return;}
  trainingEnd=Date.now()+20*60*1000;
};
function trainingTick(){
  if(!trainingEnd)return;
  const m=minute(dateTime.format(new Date()).slice(11,16));
  const remaining=m>=720?0:Math.max(0,Math.ceil((trainingEnd-Date.now())/1000));
  get('training-clock').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
  if(!remaining)trainingEnd=0;
}

function importLegacy(formats,environment){
  const next=JSON.parse(JSON.stringify(states[environment]));
  let changed=false;
  const apply=(key,value,transform)=>{
    if(!value || next.imports.includes(key))return;
    transform(value);
    next.imports.push(key);changed=true;
  };
  if(environment==='live'){
    for(const [key,value] of Object.entries(formats)){
      const date=key.slice('case247-ztd-'.length);
      if(!key.startsWith('case247-ztd-')||!dateValid(date)||!isRecord(value))continue;
      apply(key,value,v=>{
        if(next.days[date])return;
        const dones=Array.isArray(v.done)?[...new Set(v.done.filter(i=>Number.isInteger(i)&&i>=0&&i<9))]:[];
        next.days[date]={...blankDay(),done:dones,social:dones.includes(3),yesterday:typeof v.yesterday==='string'?v.yesterday:'',tomorrow:typeof v.tomorrow==='string'?v.tomorrow:''};
      });
    }
    apply('ztd-start',formats['ztd-start'],value=>{if(!next.start&&dateValid(value))next.start=value;});
    for(let i=0;i<14;i++)apply('ztd-stage-'+i,formats['ztd-stage-'+i],flag=>{next.setup[i]??=String(flag)==='1';});
    apply('guida-avigliana-checklist-v1',formats['guida-avigliana-checklist-v1'],value=>{
      const setup=isRecord(value.setup)?value.setup:{};
      stageGroups.forEach((group,i)=>{if(setup[i]===true)group.forEach(j=>{next.setup[j]??=true;});});
      for(const [date,checks] of Object.entries(value.days||{})){
        const iso=date.replace(/-(\d)(?=-|$)/g,'-0$1');
        if(!dateValid(iso)||!isRecord(checks))continue;
        const d=next.days[iso]??=blankDay();
        if(checks.social===true)d.social=true;
        const equivalent={0:[0],2:[4],3:[5],4:[6],7:[8]};
        for(const [i,slots] of Object.entries(equivalent))if(checks[i]===true)d.done=[...new Set([...d.done,...slots])];
      }
    });
  }else{
    const demo=formats['case247-dashboard-prova-manuale-v1'];
    const roads=formats['case247-dashboard-prova-presidio-v1'];
    apply('dashboard-prova-manuale',demo,value=>{
      if(!next.start&&dateValid(value.start))next.start=value.start;
      for(const [i,group] of stageGroups.entries()){
        const row=value.rows?.['s1-'+String(i+1).padStart(2,'0')];
        if(row?.status==='confirmed')group.forEach(j=>{next.setup[j]??=true;});
      }
      const email=value.rows?.['s1-08']?.data;
      for(let i=1;i<=4;i++){
        const body=email?.['email'+i];
        if(typeof body==='string' && body.trim())next.drafts['email-'+i]??={...initialDrafts['email-'+i],text:body,archived:false};
      }
    });
    apply('dashboard-prova-presidio',roads,value=>{
      for(const [date,items] of Object.entries(value.days||{})){
        if(!dateValid(date)||!isRecord(items))continue;
        for(const [key,row] of Object.entries(items)){
          if(!isRecord(row)||typeof row.street!=='string'||!row.street.trim())continue;
          const id='demo-presidio-'+date+'-'+key, prepared=String(row.prepared??''), delivered=String(row.delivered??'');
          if(!integerField(prepared,0)||!integerField(delivered,0)||(prepared!==''&&delivered!==''&&+delivered>+prepared))continue;
          if(!next.trips.some(t=>t.id===id))next.trips.push({id,date,streets:row.street,civics:String(row.civici||''),minutes:'',prepared,delivered,restrictions:row.noAdvertisingChecked?'Controllati':'Da controllare',notes:String(row.notes||'')});
        }
      }
    });
  }
  if(changed)return write(next,'Dati compatibili recuperati in '+(environment==='live'?'Operativo.':'Prova.'));
  return false;
}
function legacyStorage(){
  const result={};
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!(key?.startsWith('case247-ztd-')||/^ztd-stage-\d+$/.test(key)||['ztd-start','guida-avigliana-checklist-v1','case247-dashboard-prova-manuale-v1','case247-dashboard-prova-presidio-v1'].includes(key)))continue;
    if(key.startsWith(storagePrefix)) continue;
    try {result[key]=key.startsWith('ztd-')?localStorage.getItem(key):read(key);} catch {}
  }
  return result;
}
get('migrate').onclick=()=>{
  try{
    const migrated=importLegacy(legacyStorage(),mode());
    if(migrated)renderAll();
    else if(!blocked.has(mode()))status('Nessun dato precedente compatibile da recuperare in questo ambiente.');
  }catch{status('Lettura dell’archivio precedente non disponibile.');}
};
get('migration').textContent='Recupero locale: dati ZTD precedenti in Operativo, registri precedenti della Dashboard di Prova in Prova. La copia aperta con file:// richiede un JSON dei dati.';
get('backup').onclick=()=>{
  const payload={app:'CASE247-ZTD',version:1,environment:mode(),exportedAt:new Date().toISOString(),data:state()};
  download('CASE247-ZTD-'+mode()+'-'+today()+'.json',JSON.stringify(payload,null,2),'application/json');
};
get('restore').onclick=()=>get('backup-file').click();
get('backup-file').onchange=async event=>{
  const input=event.target,file=input.files?.[0],environment=mode();input.value='';
  if(!file)return;
  try{
    const payload=JSON.parse(await file.text());
    if(environment!==mode())throw Error('L’ambiente è cambiato durante l’importazione.');
    if(payload?.app==='CASE247-ZTD'){
      if(payload.version!==1||payload.environment!==environment||!validate(payload.data))throw Error('Backup incompatibile con l’ambiente selezionato.');
      if(confirm('Sostituire i dati di '+(environment==='live'?'Operativo':'Prova')+' con il backup convalidato?')&&write(payload.data,'Backup ripristinato.'))renderAll();
    }else if(environment==='demo'&&payload?.version===1&&isRecord(payload.data?.rows)){
      if(importLegacy({'case247-dashboard-prova-manuale-v1':payload.data,'case247-dashboard-prova-presidio-v1':payload.presidio},environment))renderAll();
      else status('Dati di prova già recuperati o assenti.');
    }else if(environment==='live'&&isRecord(payload?.days)&&isRecord(payload?.setup)){
      if(importLegacy({'guida-avigliana-checklist-v1':payload},environment))renderAll();
      else status('Dati della guida già recuperati o assenti.');
    }else throw Error('Formato di backup non riconosciuto.');
  }catch(error){status('Ripristino interrotto. '+error.message);}
};
get('reset-demo').onclick=()=>{
  if(mode()!=='demo')return;
  if(confirm('Azzerare solo i dati della simulazione?')&&write(blank(),'Simulazione azzerata.'))renderAll();
};
function renderAll(){
  renderDayForm();renderSetup();renderChecks();renderRoads();renderTrips();renderDrafts();renderNews();renderQual();renderReport();tick();
  get('reset-demo').disabled=mode()!=='demo';
}
get('mode').onchange=()=>{
  for(const id of ['trip-form','news-form','draft-form','qual-form'])resetForm(get(id));
  get('archived').checked=false;
  status(mode()==='demo'?'Ambiente di prova.':'Ambiente operativo.');
  renderAll();
};
try {importLegacy(legacyStorage(),'live');}catch {}
renderAll();
followHash();
setInterval(()=>{tick();trainingTick();},1000);
const header=document.querySelector('.top');
if(typeof ResizeObserver==='function')new ResizeObserver(()=>document.documentElement.style.setProperty('--head',header.offsetHeight+'px')).observe(header);
