/* CASE247 — Optional acquisition tools inside the existing 0/50 daily agenda. */
(function () {
'use strict';
const KPI_KEY='case247-acquisizione-kpi-v1';
const QR_JS='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const QR_WA='https://wa.me/393713708294?text=Buongiorno%2C%20ho%20letto%20la%20scheda%20zona%20e%20desidero%20informazioni';
const QR_FLYER='https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/volantini-premium/volantino-digitale/';
const KINDS=['privati','consensi','prequalifiche'];
const clean=val=>Math.max(0,Math.min(999,parseInt(val,10)||0));
function romanDate(){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
function escapeHTML(value){
 return String(value).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
}
function init(){
 const agenda=document.getElementById('a50-unified-view');
 if(!agenda)return false;
 if(document.getElementById('case247-acq-tools'))return true;
 const node=document.createElement('details');node.id='case247-acq-tools';node.className='a50-acq-tools';
 node.innerHTML=[
 '<summary>Strumenti acquisizione · Timer, Privati, Scheda QR e KPI <span class="a50-tools-tag">Senza duplicare l’obiettivo 0/50</span></summary>',
 '<div class="a50-tools-content">',
 '<div class="a50-tools-row">',
 '<div class="a50-tools-timer"><strong>Timer Pomodoro</strong><output id="a50-pomo-display">50:00</output>',
 '<button type="button" data-pomo="50">50 min lavoro</button> <button type="button" data-pomo="10">10 min pausa</button> <button type="button" data-pomo="stop">Ferma</button>',
 '<span id="a50-pomo-message" role="status" aria-live="polite"></span></div>',
 '<div class="a50-tools-links"><strong>Ricerca privata e strumenti · 1 click</strong>',
 '<p>Portali senza filtri preimpostati: seleziona tu «Da privati». Nessuna ricerca né contatto automatico.</p>',
 '<div class="a50-tools-buttons">',
 '<a href="https://www.immobiliare.it/" target="_blank" rel="noopener noreferrer">Immobiliare.it</a>',
 '<a href="https://www.idealista.it/" target="_blank" rel="noopener noreferrer">Idealista</a>',
 '<a href="https://www.subito.it/" target="_blank" rel="noopener noreferrer">Subito</a>',
 '<a href="https://www.google.com/maps/search/?api=1&amp;query=Avigliana%20TO" target="_blank" rel="noopener noreferrer">Maps Avigliana</a>',
 '<button id="a50-tools-crm" type="button">CRM Excel</button>',
 '<a href="./case247-operazioni/">Seller Radar</a>',
 '<a href="./volantini-premium/">Studio Volantini</a>',
 '</div></div></div>',
 '<div class="a50-tools-row">',
 '<section class="a50-tools-print"><h3>Scheda zona A4 · QR per contatto volontario</h3>',
 '<div class="a50-tools-fields">',
 '<label>Titolo<input id="a50-qr-title" maxlength="100" value="CERCHI O VUOI VENDERE CASA IN QUESTA ZONA?"></label>',
 '<label>Via / Zona<input id="a50-qr-zone" maxlength="110" placeholder="Es. Avigliana · Corso Laghi"></label>',
 '<label>Messaggio<input id="a50-qr-note" maxlength="320" placeholder="Informazioni sui servizi immobiliari disponibili in zona"></label>',
 '<label>Destinazione QR<select id="a50-qr-destination">',
 '<option value="whatsapp">WhatsApp Joseph · contatto volontario</option>',
 '<option value="volantino">Volantino digitale La Sacra</option></select></label>',
 '</div><button type="button" id="a50-qr-print">Genera e stampa A4 con QR</button>',
 '<p id="a50-print-status" class="a50-tools-status" role="status" aria-live="polite"></p>',
 '<small>Il QR è costruito sul dispositivo. Non sono inviate informazioni inserite. Nessuna affermazione su compratori o incarichi non verificati.</small>',
 '</section>',
 '<section class="a50-tools-kpi"><h3>KPI giornalieri · inserimento manuale</h3>',
 '<p id="a50-kpi-day" class="a50-tools-day"></p>',
 '<div class="a50-kpi-fields">',
 '<label>Privati incontrati <span>min 2</span><input type="number" min="0" max="999" step="1" inputmode="numeric" data-kpi="privati"></label>',
 '<label>Consensi documentati <span>min 3</span><input type="number" min="0" max="999" step="1" inputmode="numeric" data-kpi="consensi"></label>',
 '<label>Prequalifiche <span>min 2</span><input type="number" min="0" max="999" step="1" inputmode="numeric" data-kpi="prequalifiche"></label>',
 '</div><p id="a50-kpi-status" class="a50-tools-status" role="status" aria-live="polite">Salvataggio locale · Europe/Rome</p>',
 '<small>I KPI sono indipendenti dal contatore 0/50. Un consenso si considera documentato solo con prova conservata separatamente; questa scheda non autorizza invii promozionali.</small>',
 '</section></div></div>'
 ].join('');
 const nav=agenda.querySelector('.a50-unified-nav');
 if(nav)nav.after(node);else agenda.prepend(node);
 const $=selector=>node.querySelector(selector);
 const today=()=>window.CASE247Agenda50?.getDay()||romanDate();
 function allKpis(){try{const v=JSON.parse(localStorage.getItem(KPI_KEY)||'{}');return v&&!Array.isArray(v)&&typeof v==='object'?v:{};}catch(_){return {};}}
 let shownDay='';
 function refresh(force=false){
   const day=today();if(!force&&shownDay===day)return;
   shownDay=day;const values=allKpis()[day]||{};
   KINDS.forEach(k=>{$('[data-kpi="'+k+'"]').value=clean(values[k]);});
   $('#a50-kpi-day').textContent='Giorno: '+day+' · Europe/Rome';
 }
 node.querySelectorAll('[data-kpi]').forEach(field=>field.addEventListener('change',()=>{
   const day=today(),all=allKpis(),values=all[day]||{};
   values[field.dataset.kpi]=clean(field.value);all[day]=values;
   try{localStorage.setItem(KPI_KEY,JSON.stringify(all));$('#a50-kpi-status').textContent='KPI salvati per il '+day;}
   catch(_){$('#a50-kpi-status').textContent='Memoria browser non disponibile: dati non salvati.';}
   refresh(true);
 }));
 $('#a50-tools-crm').addEventListener('click',()=>document.getElementById('cc-crm-open')?.click());
 let timerId=null,endAt=0;
 function tick(){
   if(!endAt)return;
   const sec=Math.max(0,Math.ceil((endAt-Date.now())/1000));
   $('#a50-pomo-display').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
   if(sec===0){endAt=0;clearInterval(timerId);timerId=null;$('#a50-pomo-message').textContent='Tempo completato.';}
 }
 node.querySelectorAll('[data-pomo]').forEach(button=>button.addEventListener('click',()=>{
   if(timerId)clearInterval(timerId);
   timerId=null;endAt=0;
   if(button.dataset.pomo==='stop'){
     $('#a50-pomo-display').textContent='50:00';$('#a50-pomo-message').textContent='Timer fermato.';return;
   }
   const n=Number(button.dataset.pomo);
   endAt=Date.now()+n*60000;$('#a50-pomo-message').textContent=n===50?'Sessione di lavoro avviata.':'Pausa avviata.';
   tick();timerId=setInterval(tick,500);
 }));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 let qrLoading=null;
 function qrLibrary(){
   if(typeof window.qrcode==='function')return Promise.resolve(window.qrcode);
   if(qrLoading)return qrLoading;
   qrLoading=new Promise((resolve,reject)=>{
     const s=document.createElement('script');s.src=QR_JS;s.referrerPolicy='no-referrer';
     s.onload=()=>typeof window.qrcode==='function'?resolve(window.qrcode):reject(Error('Libreria QR non disponibile'));
     s.onerror=()=>reject(Error('Caricamento libreria QR bloccato'));
     document.head.appendChild(s);
   }).catch(e=>{qrLoading=null;throw e;});
   return qrLoading;
 }
 function svgQR(url,create){
   const qr=create(0,'M');qr.addData(url,'Byte');qr.make();
   const n=qr.getModuleCount(),margin=4,side=n+margin*2,parts=[];
   for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))parts.push('<rect x="'+(x+margin)+'" y="'+(y+margin)+'" width="1" height="1"/>');
   return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+side+' '+side+'" width="220" height="220"><rect width="'+side+'" height="'+side+'" fill="#fff"/><g fill="#000">'+parts.join('')+'</g></svg>';
 }
 $('#a50-qr-print').addEventListener('click',async()=>{
   const button=$('#a50-qr-print'),status=$('#a50-print-status');
   button.disabled=true;status.textContent='Genero il QR in locale…';
   try{
     const dest=$('#a50-qr-destination').value==='volantino'?QR_FLYER:QR_WA;
     const qr=svgQR(dest,await qrLibrary());
     const title=escapeHTML($('#a50-qr-title').value.trim()||'INFORMAZIONI IMMOBILIARI IN ZONA');
     const zone=escapeHTML($('#a50-qr-zone').value.trim()||'Valle di Susa · Torino');
     const note=escapeHTML($('#a50-qr-note').value.trim()||'Scopri i nostri servizi immobiliari.');
     const page=['<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Scheda zona La Sacra</title>',
       '<style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font:17px/1.4 Arial,sans-serif;color:#173c57;margin:0}',
       '.sheet{border:3px solid #174365;min-height:257mm;padding:28px;text-align:center}.brand{letter-spacing:.13em;font-weight:800;font-size:14px}',
       'h1{font-size:31px;margin:38px 0 18px}h2{font-size:24px;font-weight:500;margin:0 0 28px}',
       '.msg{background:#eef5f9;padding:22px;text-align:left;white-space:pre-wrap;min-height:95px}.qr{width:220px;height:220px;margin:28px auto 14px}',
       'footer{border-top:1px solid #ccdbe6;margin-top:40px;padding-top:16px;font-size:12px;overflow-wrap:anywhere}</style></head>',
       '<body><div class="sheet"><div class="brand">IMMOBILIARE LA SACRA · VALLE DI SUSA</div>',
       '<h1>',title,'</h1><h2>',zone,'</h2><div class="msg">',note,'</div><div class="qr">',qr,'</div>',
       '<p>Inquadra il QR: il contatto avviene solo su tua iniziativa.</p>',
       '<footer>Promozione immobiliare · Joseph · WhatsApp 371 370 8294<br>',
       escapeHTML(dest),'<br>Il contatto non costituisce consenso automatico a comunicazioni promozionali.</footer>',
       '</div></body></html>'].join('');
     const frame=document.createElement('iframe');
     frame.title='Scheda zona in formato A4';frame.style.cssText='position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
     frame.addEventListener('load',()=>window.setTimeout(()=>{
       try{frame.contentWindow.focus();frame.contentWindow.print();status.textContent='Scheda pronta: verifica la finestra di stampa.';}
       catch(_){status.textContent='Stampa bloccata dal browser.';}
       window.setTimeout(()=>frame.remove(),60000);
     },250),{once:true});
     document.body.appendChild(frame);frame.srcdoc=page;
   }catch(e){status.textContent='Nessuna stampa: '+(e?.message||'Errore QR')+'. Verifica la connessione o le impostazioni del browser.';}
   finally{button.disabled=false;}
 });
 document.addEventListener('case247:agenda50-render',()=>refresh());
 window.addEventListener('storage',e=>{if(e.key===KPI_KEY)refresh(true)});
 refresh(true);return true;
}
function boot(){
 if(init())return;
 const mo=new MutationObserver(()=>{if(init())mo.disconnect()});
 mo.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
