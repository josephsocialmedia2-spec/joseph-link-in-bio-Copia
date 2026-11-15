/* Personal CRM setup: consume fragment immediately, keep workbook URL out of public source. */
(function(){
'use strict';
const KEY='case247-cc-private-excel-url-v1';
const PREFIX='#crm-connect=';
const status=document.getElementById('crm-setup-status');
const dashboard='../#cc-calendar';
const show=message=>{status.textContent=message;};
const hash=window.location.hash||'';
if(!hash.startsWith(PREFIX)){
 show('Nessun collegamento CRM ricevuto. Apri la dashboard e usa “Collega / modifica CRM”.');
 return;
}
let candidate='';
try{candidate=decodeURIComponent(hash.slice(PREFIX.length));}catch(_){}
// The fragment can contain a share token. Remove it before any navigation or rendering.
try{window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);}
catch(_){window.location.hash='';}
function validatedFileUrl(value){
 try{
  const url=new URL(String(value||'').trim());
  if(url.protocol!=='https:'||url.username||url.password)return '';
  const host=url.hostname.toLowerCase();
  if(host==='1drv.ms'||host==='onedrive.live.com'||host==='drive.google.com'||host==='docs.google.com'||host==='excel.officeapps.live.com'||host.endsWith('.sharepoint.com'))return url.href;
 }catch(_){}
 return '';
}
const crm=validatedFileUrl(candidate);
candidate='';
if(!crm){
 show('Collegamento non valido: accettiamo soltanto link HTTPS OneDrive o Google Drive.');
 return;
}
try{window.localStorage.setItem(KEY,JSON.stringify(crm));}
catch(_){
 show('Il browser ha bloccato il salvataggio locale. Consenti i dati dei siti e riprova.');
 return;
}
show('CRM Excel collegato in questo browser. Apertura dell’agenda…');
window.location.replace(dashboard);
})();
