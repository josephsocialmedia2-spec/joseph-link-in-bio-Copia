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
 header.append(identity,date);
 const nav=document.createElement('nav');nav.className='saas-tabs';nav.setAttribute('aria-label','Sezioni della dashboard');
 const labels=[['agenda','Agenda'],['acquisizione','Acquisizione'],['pilastri','Pilastri vendite'],['motivazione','Il mio Perché'],['operativo','Strumenti'],['archivio','Archivio']];
 const tabs=new Map();
 for(const [key,label] of labels){const b=document.createElement('button');b.type='button';b.className='saas-tab';b.dataset.saasView=key;b.textContent=label;b.setAttribute('aria-pressed',String(key==='agenda'));b.addEventListener('click',()=>activate(key));tabs.set(key,b);nav.append(b)}
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
 const sections={
  agenda:[],acquisizione:[],pilastri:[],motivazione:[],operativo:[],archivio:[]
 };
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
  const current=labels.findIndex(x=>x[0]===app.dataset.view);
  let next=current;
  if(event.key==='ArrowRight')next=(current+1)%labels.length;
  else if(event.key==='ArrowLeft')next=(current+labels.length-1)%labels.length;
  else return;
  event.preventDefault();activate(labels[next][0]);tabs.get(labels[next][0]).focus();
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
