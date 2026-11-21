/* CASE247 · minimal SaaS application shell. Preserves existing DOM, events and local data. */
(function(){
'use strict';
function boot(){
 if(document.getElementById('saas-app'))return;
 const control=document.getElementById('case247-control-center');
 const agenda=document.getElementById('cc-calendar');
 const acquisition=document.getElementById('sv-acquisizione');
 const why=document.getElementById('perche-widget');
 const pillars=document.getElementById('cc-pilastri');
 const boards=document.getElementById('case247-two-boards');
 if(!control||!agenda||!acquisition||!why||!pillars||!boards)return false;
 const app=document.createElement('div');app.id='saas-app';app.dataset.view='agenda';
 const header=document.createElement('header');header.className='saas-header';
 const identity=document.createElement('div');identity.className='saas-identity';
 const mark=document.createElement('span');mark.className='saas-mark';mark.textContent='C';
 const name=document.createElement('div');name.innerHTML='<strong>CASE247</strong><small>Workspace · Immobiliare La Sacra</small>';identity.append(mark,name);
 const date=document.createElement('div');date.className='saas-header-right';date.textContent='Pannello operativo';
 const googlePiva=document.createElement('a');googlePiva.className='saas-google-piva';
 googlePiva.href='https://www.google.com/search?q=partita+iva+avigliana';googlePiva.target='_blank';googlePiva.rel='noopener noreferrer';
 googlePiva.textContent='Partita IVA Avigliana';googlePiva.setAttribute('aria-label','Cerca Partita IVA Avigliana su Google');
 header.append(identity,googlePiva,date);
 const nav=document.createElement('nav');nav.className='saas-tabs';nav.setAttribute('aria-label','Sezioni della dashboard');
 const labels=[['agenda','Agenda'],['acquisizione','Acquisizione'],['pilastri','Pilastri vendite'],['motivazione','Il mio Perché'],['operativo','Strumenti'],['archivio','Archivio']];
 const tabs=new Map();
 const ORDER_KEY='case247-saas-tab-order-v1';
 const validKeys=labels.map(([key])=>key);
 function readOrder(){
  try{
   const saved=JSON.parse(localStorage.getItem(ORDER_KEY)||'null');
   if(Array.isArray(saved)&&saved.length===validKeys.length&&new Set(saved).size===validKeys.length&&saved.every(key=>validKeys.includes(key)))return saved;
  }catch(_){}
  return validKeys.slice();
 }
 let order=readOrder();
 let sorting=false;
 let dragKey=null;
 const reorderToggle=document.createElement('button');
 reorderToggle.type='button';reorderToggle.className='saas-reorder-toggle';
 reorderToggle.textContent='Riordina schede';
 reorderToggle.setAttribute('aria-pressed','false');
 function persistOrder(){try{localStorage.setItem(ORDER_KEY,JSON.stringify(order))}catch(_){}}
 function redrawTabs(){
  order.forEach(key=>{
   const unit=tabUnits.get(key);
   if(!unit)return;
   nav.append(unit);
   unit.classList.toggle('saas-sort-mode',sorting);
   const current=order.indexOf(key);
   unit.querySelector('.saas-move-left').disabled=current===0;
   unit.querySelector('.saas-move-right').disabled=current===order.length-1;
  });
  nav.append(reorderToggle);
  reorderToggle.setAttribute('aria-pressed',String(sorting));
  reorderToggle.textContent=sorting?'Fine riordino':'Riordina schede';
 }
 function moveTab(from,to){
  const fromIndex=order.indexOf(from);
  const toIndex=order.indexOf(to);
  if(fromIndex<0||toIndex<0||fromIndex===toIndex)return;
  order.splice(fromIndex,1);order.splice(toIndex,0,from);
  persistOrder();redrawTabs();
 }
 function moveRelative(key,direction){
  const current=order.indexOf(key),next=current+direction;
  if(next<0||next>=order.length)return;
  moveTab(key,order[next]);tabs.get(key)?.focus();
 }
 const tabUnits=new Map();
 for(const [key,label] of labels){
  const unit=document.createElement('div');unit.className='saas-tab-unit';unit.draggable=true;unit.dataset.saasKey=key;
  const b=document.createElement('button');b.type='button';b.className='saas-tab';b.dataset.saasView=key;b.textContent=label;b.setAttribute('aria-pressed',String(key==='agenda'));
  b.addEventListener('click',()=>activate(key));
  b.addEventListener('keydown',event=>{
   if(event.altKey&&event.key==='ArrowLeft'){event.preventDefault();moveRelative(key,-1)}
   else if(event.altKey&&event.key==='ArrowRight'){event.preventDefault();moveRelative(key,1)}
  });
  tabs.set(key,b);unit.append(b);
  for(const [direction,sign,description] of [[-1,'‹','Sposta a sinistra'],[1,'›','Sposta a destra']]){
   const move=document.createElement('button');
   move.type='button';move.className=direction<0?'saas-move-left':'saas-move-right';
   move.textContent=sign;move.title=description+': '+label;
   move.setAttribute('aria-label',description+': '+label);
   move.addEventListener('click',()=>moveRelative(key,direction));
   unit.append(move);
  }
  unit.addEventListener('dragstart',event=>{
   dragKey=key;unit.classList.add('saas-dragging');
   if(event.dataTransfer){event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',key)}
  });
  unit.addEventListener('dragover',event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move'});
  unit.addEventListener('drop',event=>{event.preventDefault();if(dragKey)moveTab(dragKey,key)});
  unit.addEventListener('dragend',()=>{dragKey=null;unit.classList.remove('saas-dragging')});
  tabUnits.set(key,unit);
 }
 reorderToggle.addEventListener('click',()=>{sorting=!sorting;redrawTabs()});
 redrawTabs();
 const content=document.createElement('main');content.id='saas-content';
 const primary=document.createElement('div');primary.className='saas-pane saas-control';primary.dataset.pane='control';primary.append(control);
 const acquisitionPane=document.createElement('div');acquisitionPane.className='saas-pane';acquisitionPane.dataset.pane='acquisizione';acquisitionPane.append(acquisition);
 const pillarsPane=document.createElement('div');pillarsPane.className='saas-pane';pillarsPane.dataset.pane='pilastri';pillarsPane.append(pillars);
 const whyPane=document.createElement('div');whyPane.className='saas-pane';whyPane.dataset.pane='motivazione';whyPane.append(why);
 const archivePane=document.createElement('div');archivePane.className='saas-pane';archivePane.dataset.pane='archivio';archivePane.append(boards);
 content.append(primary,acquisitionPane,pillarsPane,whyPane,archivePane);
 app.append(header,nav,content);
 document.body.prepend(app);
 const oldParts=Array.from(document.body.children).filter(n=>n!==app&&n.tagName!=='SCRIPT'&&n.tagName!=='DIALOG');
 oldParts.forEach(n=>{if(n.id!=='case247-control-center')n.classList.add('saas-legacy-hidden')});
 // The CRM workbook link is stored only in the existing local, device-specific CRM configuration.
 const workbookBar=document.createElement('div');workbookBar.className='saas-workbook-bar';
 const workbookLabel=document.createElement('span');workbookLabel.textContent='Foglio di lavoro · CRM Excel';
 const workbookOpen=document.createElement('button');workbookOpen.type='button';workbookOpen.className='saas-workbook-action';workbookOpen.textContent='Apri foglio Excel';
 workbookOpen.addEventListener('click',()=>document.getElementById('cc-crm-open')?.click());
 const workbookConfig=document.createElement('button');workbookConfig.type='button';workbookConfig.className='saas-workbook-config';workbookConfig.textContent='Collega / modifica';
 workbookConfig.addEventListener('click',()=>document.getElementById('cc-crm-config')?.click());
 workbookBar.append(workbookLabel,workbookOpen,workbookConfig);
 acquisitionPane.prepend(workbookBar);
 function activate(view){
  if(!tabs.has(view))view='agenda';
  app.dataset.view=view;
  tabs.forEach((button,key)=>{const active=key===view;button.setAttribute('aria-pressed',String(active));button.tabIndex=active?0:0});
  content.scrollTop=0;
  const node=view==='agenda'?document.getElementById('cc-calendar'):
    view==='acquisizione'?acquisition:
    view==='pilastri'?pillars:
    view==='motivazione'?why:
    view==='archivio'?boards:document.getElementById('cc-overview');
  if(node&&node.scrollTop)node.scrollTop=0;
 }
 nav.addEventListener('keydown',event=>{
  if(event.altKey)return;
  const current=order.indexOf(app.dataset.view);
  let next=current;
  if(event.key==='ArrowRight')next=(current+1)%order.length;
  else if(event.key==='ArrowLeft')next=(current+order.length-1)%order.length;
  else return;
  event.preventDefault();activate(order[next]);tabs.get(order[next]).focus();
 });
 document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[href^="#cc-"]');
  if(!anchor||!app.contains(anchor))return;
  const href=anchor.getAttribute('href');
  const id=href.slice(1);
  const map={ 'cc-calendar':'agenda','cc-crm':'operativo','cc-studio':'operativo','cc-priorities':'operativo','cc-overview':'operativo','cc-projects':'operativo','cc-branches':'operativo' };
  if(map[id]){activate(map[id]);event.preventDefault();}
 });
 const hash=window.location.hash.substring(1);
 activate(hash==='cc-calendar'?'agenda':hash==='cc-pilastri'?'pilastri':hash==='cc-crm'||hash==='cc-studio'||hash==='cc-overview'?'operativo':'agenda');
 return true;
}
if(!boot()){
 const watcher=new MutationObserver(()=>{if(boot())watcher.disconnect()});
 watcher.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',()=>{if(boot())watcher.disconnect()},{once:true});
}
})();
