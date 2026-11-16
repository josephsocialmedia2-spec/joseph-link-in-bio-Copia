/* CASE247 — Il mio Perché: local-only ticker; never send entries to a server. */
(function(){
'use strict';
function initialize(){
 const widget=document.getElementById('perche-widget');
 if(!widget)return;
 const input=widget.querySelector('#input-perche');
 const form=widget.querySelector('#perche-form');
 const text=widget.querySelector('#ticker-text');
 const ticker=widget.querySelector('#ticker-container');
 const status=widget.querySelector('#perche-status');
 if(!input||!form||!text||!ticker||!status)return;
 const KEY='mieiPerche';
 const fallback='Inserisci il tuo primo "Perché" qui sopra per iniziare...';
 let listaPerche=[];
 function carica(){
  try{
   const value=JSON.parse(localStorage.getItem(KEY)||'[]');
   return Array.isArray(value)?value.filter(x=>typeof x==='string'&&x.trim().length>0):[];
  }catch(_){return []}
 }
 function aggiornaTicker(){
  const contenuto=listaPerche.length?listaPerche.join('     ★     ')+'     ★     ':fallback;
  // Do not use innerHTML: user-supplied motivations must remain plain text.
  text.textContent=contenuto;
  const durata=Math.max(15,contenuto.length*.18);
  ticker.style.setProperty('--perche-duration',durata+'s');
 }
 function aggiungiPerche(){
  const valore=input.value.trim();
  if(!valore){status.textContent='Scrivi una motivazione prima di salvare.';input.focus();return}
  const oggi=new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',timeZone:'Europe/Rome'}).format(new Date());
  const next=['['+oggi+'] '+valore,...listaPerche];
  try{
   localStorage.setItem(KEY,JSON.stringify(next));
  }catch(_){
   status.textContent='Salvataggio non riuscito: memoria locale del browser non disponibile.';
   return;
  }
  listaPerche=next;
  input.value='';
  status.textContent='Il tuo Perché è stato salvato su questo dispositivo.';
  aggiornaTicker();
  input.focus();
 }
 form.addEventListener('submit',function(e){e.preventDefault();aggiungiPerche()});
 listaPerche=carica();
 aggiornaTicker();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();
})();
