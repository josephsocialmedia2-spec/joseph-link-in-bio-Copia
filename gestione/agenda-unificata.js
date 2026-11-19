/* CASE247 — Vista unica: calendario + 50 conferme, senza duplicare contatori o storage. */
(function () {
'use strict';
const S = window.CASE247Studio;
const A = window.CASE247Agenda50;
if (!S || !A) return;
const root=document.getElementById('case247-agenda50');
const calendar=document.getElementById('cc-calendar');
if(!root||!calendar||document.getElementById('a50-unified-view'))return;
const groups=root.querySelector('.a50-grid');
if(!groups)return;
const days=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const WEEKDAYS=[
 ['08:30','09:00','Colazione strategica · Centri di influenza',[]],
 ['09:00','09:30','Mappatura annunci privati · Avigliana',[]],
 ['09:30','11:30','Acquisizione Digitale',['email','linkedin','dm']],
 ['11:30','12:30','Acquisizione Diretta',['calls']],
 ['12:30','14:00','Pausa e preparazione',[]],
 ['14:00','15:30','Sviluppo Prioritario & Commenti Social',['comments']],
 ['15:30','16:30','Contenuti, Materiali & Follow-up',['followups']],
 ['16:30','17:00','Test, Verifiche & Chiusura Operativa',[]]
];
const SATURDAY=[
 ['09:00','10:30','Revisione lavori aperti'],
 ['10:30','12:00','Test e completamenti'],
 ['12:00','12:30','KPI e scadenze'],
 ['14:00','16:00','Pianificazione settimana']
];
const CRM_BUTTON_ID='cc-crm-open';
const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
const v=make('div','a50-unified-view');v.id='a50-unified-view';
const nav=make('nav','a50-unified-nav');nav.setAttribute('aria-label','Navigazione agenda per giorno');
const prev=make('button','a50-day-button','←');prev.type='button';prev.setAttribute('aria-label','Giorno precedente');
const today=make('button','a50-day-button a50-today-button','Oggi');today.type='button';
const next=make('button','a50-day-button','→');next.type='button';next.setAttribute('aria-label','Giorno successivo');
const dayLabel=make('strong','a50-selected-day');
const navCaption=make('span','a50-selected-sub','Europe/Rome · v19.11.3 · Agenda unica');
nav.append(prev,today,next,dayLabel,navCaption);
const buildMarker=make('span','a50-agenda-build','AGGIORNATA · 19.11.3');
nav.append(buildMarker);
const timeline=make('div','a50-unified-timeline');timeline.id='a50-unified-timeline';
const addButton=make('button','a50-add-activity','+ Nuova attività');addButton.type='button';
addButton.addEventListener('click',()=>document.getElementById('cc-new')?.click());
const actions=make('div','a50-unified-actions');actions.append(addButton);
v.append(nav,timeline,actions);
groups.before(v);
const counters={};
root.querySelectorAll('.a50-item').forEach(item=>{counters[item.dataset.item]=item});
const timeToMinutes=s=>{const [h,m]=s.split(':').map(Number);return h*60+m};
function calendarDate(){const now=new Date();const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const d=Object.fromEntries(p.map(x=>[x.type,x.value]));return d.year+'-'+d.month+'-'+d.day}
function dayOf(day){return new Date(day+'T12:00:00Z').getUTCDay()}
function skipSunday(day,step){const candidate=S.plusDays(day,step);return dayOf(candidate)===0?S.plusDays(candidate,step):candidate}
function selected(){return A.getDay()}
function quick(label,url){const a=make('a','a50-quick-link',label);a.href=url;if(url.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer'}return a}
function crmButton(){
 const button=make('button','a50-quick-link a50-crm-quick','CRM Excel');
 button.type='button';button.addEventListener('click',()=>document.getElementById(CRM_BUTTON_ID)?.click());
 return button;
}
function quickLinks(ids){
 const bar=make('div','a50-quick-links');
 if(ids.includes('email')||ids.includes('linkedin')||ids.includes('dm')){
  bar.append(crmButton(),quick('Partita IVA Avigliana','https://www.google.com/search?q=partita+iva+avigliana'),quick('Gmail','https://mail.google.com/'),quick('LinkedIn','https://www.linkedin.com/'),quick('Canali CASE247','./canali-case247/'));
 }else if(ids.includes('calls')){
  bar.append(crmButton(),quick('WhatsApp','./whatsapp-volantini/'));
 }else if(ids.includes('comments')||ids.includes('followups')){
  bar.append(quick('Canali CASE247','./canali-case247/'),quick('Gmail','https://mail.google.com/'));
 }
 return bar;
}
function block(start,end,title,opts={}){
 const article=make('article','a50-time-block');article.dataset.start=start;article.dataset.end=end;
 article.dataset.window=opts.window||'';
 const times=make('div','a50-block-time',start+'–'+end);
 const body=make('div','a50-block-body');
 const heading=make('div','a50-block-title',title);
 const badge=make('span','a50-block-badge','● ORA IN CORSO');badge.hidden=true;
 const topline=make('div','a50-block-head');topline.append(heading,badge);
 body.append(topline);article.append(times,body);
 if(opts.school)article.classList.add('a50-school-block');
 if(opts.saturday)article.classList.add('a50-saturday-block');
 if(opts.silent)article.classList.add('a50-no-alert');
 return {article,body};
}
function getLessons(day){
 const monday=S.monday(day);
 try{
  const stored=JSON.parse(localStorage.getItem('case247-cc-school-2scat-v1')||'null');
  const rows=stored?.weeks?.[monday]?.rows;
  if(Array.isArray(rows))return rows.filter(row=>row.date===day && /^\d{2}:\d{2}$/.test(row.start) && /^\d{2}:\d{2}$/.test(row.end));
 }catch(_){}
 return S.reference(monday).filter(row=>row.date===day);
}
function extraTasks(day){
 try{
  const saved=JSON.parse(localStorage.getItem('case247-cc-tasks-v1')||'[]');
  return Array.isArray(saved)?saved.filter(task=>task&&task.date===day&&/^\d{2}:\d{2}$/.test(task.time)).map(task=>{
   const begin=timeToMinutes(task.time);const finish=begin+Math.max(5,Math.min(Number(task.duration)||30,720));
   return {start:task.time,end:String(Math.floor(finish/60)%24).padStart(2,'0')+':'+String(finish%60).padStart(2,'0'),title:task.title||task.project||'Attività',status:task.status||'open',priority:task.priority||'',study:task.project==='STUDIO'};
  }):[];
 }catch(_){return []}
}
function render(){
 const day=selected(),weekday=dayOf(day),isSaturday=weekday===6;
 const label=new Intl.DateTimeFormat('it-IT',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(S.fromISO(day));
 dayLabel.textContent=days[weekday]+' '+label;
 dayLabel.dataset.day=day;
 timeline.replaceChildren();
 root.classList.toggle('a50-day-saturday',isSaturday);
 const title=root.querySelector('#a50-title');
 if(title&&title.firstChild)title.firstChild.textContent=isSaturday?'Agenda integrata · Sabato':'Agenda integrata · Obiettivo ';
 const entries=[];
 if(isSaturday){
  SATURDAY.forEach(([start,end,text])=>{entries.push({start,end,block:block(start,end,text,{saturday:true})})});
 }else{
  WEEKDAYS.forEach(([start,end,text,ids])=>{
   const x=block(start,end,text,{window:ids[0]||'',silent:start==='12:30'});
   if(ids.length){
    const body=make('div','a50-block-counters');
    ids.forEach(id=>{if(counters[id])body.append(counters[id])});
    x.body.append(body,quickLinks(ids));
   }
   entries.push({start,end,block:x});
  });
  const schoolLessons=getLessons(day);
  if(!schoolLessons.length){
   const x=block('17:00','21:25','STUDIO · 2S CAT · Orario da confermare',{school:true});
   x.body.append(make('span','a50-lesson-badge','Carica o conferma le materie nella scheda Strumenti'));
   entries.push({start:'17:00',end:'21:25',block:x});
  }
  schoolLessons.forEach(row=>{
   const x=block(row.start,row.end,'STUDIO · 2S CAT · '+row.subject,{school:true});
   const meta=make('span','a50-lesson-badge',row.confidence==='confermato'?'Lezione confermata':'Orario di riferimento · da verificare');
   x.body.append(meta);entries.push({start:row.start,end:row.end,block:x});
  });
 }
 if(!isSaturday)extraTasks(day).forEach(task=>{
  if(task.study && entries.some(entry=>entry.start===task.start && entry.block.article.classList.contains('a50-school-block') && entry.block.body.textContent.toLocaleLowerCase('it').includes(task.title.toLocaleLowerCase('it'))))return;
  const x=block(task.start,task.end,task.title,{school:task.study});
  x.body.append(make('span','a50-task-status',task.priority+' · '+task.status));
  entries.push({start:task.start,end:task.end,block:x});
 });
 entries.sort((a,b)=>timeToMinutes(a.start)-timeToMinutes(b.start)||timeToMinutes(a.end)-timeToMinutes(b.end));
 entries.forEach(entry=>timeline.append(entry.block.article));
 document.dispatchEvent(new CustomEvent('case247:timeline-rendered',{detail:{date:day,weekday}}));
 // Keep the existing counters mounted in the same Agenda 50 section, even on Saturday.
 if(isSaturday)groups.append(...Object.values(counters));
 showCurrent();
}
function showCurrent(){
 const day=selected(),now=calendarDate(),isToday=day===now;
 const parts=new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
 const minute=Number(p.hour)*60+Number(p.minute);
 const counts=A.getCounts();
 const caps={email:10,linkedin:10,dm:10,calls:10,comments:5,followups:5};
 timeline.querySelectorAll('.a50-time-block').forEach(el=>{
  const start=timeToMinutes(el.dataset.start),end=timeToMinutes(el.dataset.end);
  const windowId=el.dataset.window;
  const ids=windowId==='email'?['email','linkedin','dm']:windowId==='calls'?['calls']:windowId==='comments'?['comments']:windowId==='followups'?['followups']:[];
  const complete=ids.length>0&&ids.every(id=>(counts[id]||0)>=caps[id]);
  const active=isToday&&minute>=start&&minute<end&&!complete&&!el.classList.contains('a50-no-alert');
  el.classList.toggle('fascia-attiva-lampeggiante',active);
  const badge=el.querySelector('.a50-block-badge');
  if(badge)badge.hidden=!active;
 });
}
function go(day){if(A.selectDay(day)){render();}}
prev.addEventListener('click',()=>go(skipSunday(selected(),-1)));
next.addEventListener('click',()=>go(skipSunday(selected(),1)));
today.addEventListener('click',()=>{const day=calendarDate();go(dayOf(day)===0?S.plusDays(day,1):day)});
document.addEventListener('case247:agenda50-render',event=>{
 if(!root.isConnected)return;
 const d=event.detail?.date;
 if(d&&d!==dayLabel.dataset.day){dayLabel.dataset.day=d;render();}
 else showCurrent();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(dayLabel.dataset.day!==selected())render();else showCurrent()}});
window.addEventListener('storage',event=>{if(event.key==='case247-cc-school-2scat-v1'||event.key==='case247-cc-tasks-v1')render()});
window.setInterval(()=>{if(dayLabel.dataset.day!==selected())render();else showCurrent()},20000);
const first=selected();
if(dayOf(first)===0)A.selectDay(S.plusDays(first,1));
dayLabel.dataset.day=selected();
render();
})();
