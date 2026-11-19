/* CASE247 — tools embedded directly in existing chronological agenda blocks. */
(function(){
'use strict';
const STORAGE='case247-acquisizione-kpi-v1';
const QR_SCRIPT='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const WHATSAPP='https://wa.me/393713708294?text=Buongiorno%2C%20ho%20letto%20la%20scheda%20zona%20e%20desidero%20informazioni';
const VOLANTINO='https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/gestione/volantini-premium/volantino-digitale/';
const keys=['privati','consensi','prequalifiche'];
const htmlEscape=value=>String(value).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const clean=value=>Math.min(999,Math.max(0,parseInt(value,10)||0));
function dateRome(){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
function create(id,heading,body){
 const el=document.createElement('section');el.id=id;el.className='a50-inline-tool';
 el.innerHTML='<h3>'+heading+'</h3>'+body;
 return el;
}
function init(){
 const agenda=document.getElementById('a50-unified-view');
 if(!agenda)return false;
 if(document.getElementById('a50-tools-marker'))return true;
 const marker=document.createElement('span');marker.id='a50-tools-marker';marker.hidden=true;agenda.append(marker);
 const portals=create('a50-tools-portals','Ricerca immobili da privati · Avigliana e dintorni',[
 '<p>Apri i portali e seleziona manualmente gli annunci pubblicati da privati. I pulsanti non applicano filtri non verificati.</p>',
 '<div class="a50-tools-buttons">',
 '<a href="https://www.immobiliare.it/" target="_blank" rel="noopener noreferrer">Immobiliare.it</a>',
 '<a href="https://www.idealista.it/" target="_blank" rel="noopener noreferrer">Idealista</a>',
 '<a href="https://www.subito.it/" target="_blank" rel="noopener noreferrer">Subito</a>',
 '<a href="https://www.google.com/maps/search/?api=1&amp;query=Avigliana%20TO" target="_blank" rel="noopener noreferrer">Google Maps</a>',
 '<button type="button" id="a50-tools-crm">CRM Excel</button>',
 '<a href="./volantini-premium/">Studio Volantini</a>',
 '</div>'
 ].join(''));
 const timer=create('a50-tools-timer','Timer operativo · 50 minuti lavoro / 10 minuti pausa',[
 '<div class="a50-pomo-controls"><output id="a50-pomo-display" role="timer">50:00</output>',
 '<button type="button" data-pomo="50">50 min lavoro</button>',
 '<button type="button" data-pomo="10">10 min pausa</button>',
 '<button type="button" data-pomo="stop">Ferma</button></div>',
 '<p id="a50-pomo-message" class="a50-tools-status" role="status" aria-live="polite"></p>'
 ].join(''));
 const scripts=create('a50-tools-scripts','Acquisizione diretta · approccio e micro-zona',[
 '<p>Prima verifica il tipo di inserzionista e rispetta le regole della piattaforma. Nessuna chiamata commerciale non autorizzata.</p>',
 '<details class="a50-inline-script"><summary>Script annuncio privato</summary>',
 '<p>Buongiorno, mi occupo della promozione immobiliare di La Sacra. Ho visto il suo annuncio; se desidera, posso illustrarle il nostro servizio. Nessun obbligo e nessun invio senza richiesta.</p></details>',
 '<details class="a50-inline-script"><summary>Script zona / portineria</summary>',
 '<p>Buongiorno, le lascio una scheda informativa sui servizi immobiliari nella zona. Se vuole informazioni può contattarci direttamente tramite il QR, senza alcun obbligo.</p></details>',
 '<p>Micro-zona: annota indirizzi e fonti pubbliche pertinenti, senza raccogliere numeri o dati dei vicini.</p>'
 ].join(''));
 const qr=create('a50-tools-qr','Genera e stampa scheda zona A4 con QR',[
 '<div class="a50-tools-fields">',
 '<label>Titolo<input id="a50-qr-title" maxlength="100" value="CERCHI O VUOI VENDERE CASA IN QUESTA ZONA?"></label>',
 '<label>Via / Zona<input id="a50-qr-zone" maxlength="110" placeholder="Es. Avigliana · Corso Laghi"></label>',
 '<label>Messaggio<input id="a50-qr-note" maxlength="320" placeholder="Informazioni sui servizi immobiliari in zona"></label>',
 '<label>Destinazione del QR<select id="a50-qr-destination"><option value="whatsapp">WhatsApp Joseph · contatto volontario</option><option value="volantino">Volantino digitale La Sacra</option></select></label>',
 '</div><button type="button" id="a50-qr-print">Genera e stampa A4 con QR</button>',
 '<p id="a50-print-status" class="a50-tools-status" role="status" aria-live="polite"></p>',
 '<small>QR elaborato nel browser; non invia i dati digitati. È il destinatario che decide se contattarci.</small>'
 ].join(''));
 const kpi=create('a50-tools-kpi','Chiusura giornata · KPI acquisizione',[
 '<p id="a50-kpi-day" class="a50-kpi-day"></p>',
 '<div class="a50-kpi-fields">',
 '<label>Privati incontrati <small>min 2</small><input type="number" data-kpi="privati" min="0" max="999" step="1" inputmode="numeric"></label>',
 '<label>Consensi documentati <small>min 3</small><input type="number" data-kpi="consensi" min="0" max="999" step="1" inputmode="numeric"></label>',
 '<label>Prequalifiche <small>min 2</small><input type="number" data-kpi="prequalifiche" min="0" max="999" step="1" inputmode="numeric"></label>',
 '</div><p id="a50-kpi-status" class="a50-tools-status" role="status" aria-live="polite">Salvataggio locale · Europe/Rome</p>',
 '<small>I KPI non modificano le 50 azioni dell’Agenda. I consensi devono avere prova separata: questo conteggio non autorizza messaggi.</small>'
 ].join(''));
 const modules={portals,timer,scripts,qr,kpi};
 function readKpi(){
  try{const v=JSON.parse(localStorage.getItem(STORAGE)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(_){return {};}
 }
 const selected=()=>window.CASE247Agenda50?.getDay()||dateRome();
 let shownDay=null;
 function syncKpi(force=false){
  const day=selected();if(!force&&day===shownDay)return;
  shownDay=day;
  const vals=readKpi()[day]||{};
  keys.forEach(key=>{kpi.querySelector('[data-kpi="'+key+'"]').value=clean(vals[key]);});
  kpi.querySelector('#a50-kpi-day').textContent='Giorno selezionato: '+day+' · Europe/Rome';
 }
 keys.forEach(key=>kpi.querySelector('[data-kpi="'+key+'"]').addEventListener('change',event=>{
  const day=selected(),all=readKpi(),vals=all[day]||{};
  vals[key]=clean(event.target.value);all[day]=vals;
  try{localStorage.setItem(STORAGE,JSON.stringify(all));kpi.querySelector('#a50-kpi-status').textContent='KPI salvati per il '+day;}
  catch(_){kpi.querySelector('#a50-kpi-status').textContent='Impossibile salvare nel browser.';}
  syncKpi(true);
 }));
 portals.querySelector('#a50-tools-crm').addEventListener('click',()=>document.getElementById('cc-crm-open')?.click());
 let timerId=null,endAt=0;
 function tick(){
  if(!endAt)return;
  const seconds=Math.max(0,Math.ceil((endAt-Date.now())/1000));
  timer.querySelector('#a50-pomo-display').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  if(seconds===0){endAt=0;clearInterval(timerId);timerId=null;timer.querySelector('#a50-pomo-message').textContent='Tempo terminato. Scegli un nuovo blocco.';}
 }
 timer.querySelectorAll('[data-pomo]').forEach(button=>button.addEventListener('click',()=>{
  if(timerId)clearInterval(timerId);timerId=null;endAt=0;
  if(button.dataset.pomo==='stop'){
   timer.querySelector('#a50-pomo-display').textContent='50:00';
   timer.querySelector('#a50-pomo-message').textContent='Timer fermato.';return;
  }
  const duration=Number(button.dataset.pomo);
  endAt=Date.now()+duration*60000;
  timer.querySelector('#a50-pomo-message').textContent=duration===50?'Lavoro in corso.':'Pausa in corso.';
  tick();timerId=setInterval(tick,500);
 }));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 let qrPromise=null;
 function loadQr(){
  if(typeof window.qrcode==='function')return Promise.resolve(window.qrcode);
  if(qrPromise)return qrPromise;
  qrPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=QR_SCRIPT;script.referrerPolicy='no-referrer';
   script.onload=()=>typeof window.qrcode==='function'?resolve(window.qrcode):reject(Error('Libreria QR non disponibile'));
   script.onerror=()=>reject(Error('Caricamento libreria QR non riuscito'));
   document.head.appendChild(script);
  }).catch(error=>{qrPromise=null;throw error;});
  return qrPromise;
 }
 function qrSvg(url,create){
  const code=create(0,'M');code.addData(url,'Byte');code.make();
  const n=code.getModuleCount(),margin=4,side=n+2*margin,rects=[];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(code.isDark(y,x))rects.push('<rect x="'+(x+margin)+'" y="'+(y+margin)+'" width="1" height="1"/>');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+side+' '+side+'" width="218" height="218"><rect width="'+side+'" height="'+side+'" fill="#fff"/><g fill="#000">'+rects.join('')+'</g></svg>';
 }
 qr.querySelector('#a50-qr-print').addEventListener('click',async()=>{
  const button=qr.querySelector('#a50-qr-print'),status=qr.querySelector('#a50-print-status');
  button.disabled=true;status.textContent='Preparazione del QR per stampa A4…';
  try{
   const destination=qr.querySelector('#a50-qr-destination').value==='volantino'?VOLANTINO:WHATSAPP;
   const code=qrSvg(destination,await loadQr());
   const title=htmlEscape(qr.querySelector('#a50-qr-title').value.trim()||'INFORMAZIONI IMMOBILIARI IN ZONA');
   const zone=htmlEscape(qr.querySelector('#a50-qr-zone').value.trim()||'Valle di Susa · Torino');
   const description=htmlEscape(qr.querySelector('#a50-qr-note').value.trim()||'Informazioni sui servizi immobiliari di Immobiliare La Sacra.');
   const page=['<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Scheda zona La Sacra</title>',
    '<style>@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box}body{font:16px/1.4 Arial,sans-serif;color:#193c56;margin:0}',
    '.sheet{border:3px solid #164367;padding:27px;text-align:center;min-height:257mm}.brand{font-size:14px;letter-spacing:.13em;font-weight:800}',
    'h1{font-size:30px;margin:38px 0 20px}h2{font-size:23px;font-weight:500;margin:0 0 27px}',
    '.message{background:#eef5f9;padding:22px;text-align:left;min-height:90px;white-space:pre-wrap}',
    '.qr{margin:27px auto 14px;width:218px;height:218px}footer{font-size:12px;margin-top:35px;padding-top:17px;',
    'border-top:1px solid #cfdfe7;overflow-wrap:anywhere}</style></head><body><div class="sheet">',
    '<div class="brand">IMMOBILIARE LA SACRA · VALLE DI SUSA</div><h1>',title,'</h1><h2>',zone,'</h2>',
    '<div class="message">',description,'</div><div class="qr">',code,'</div>',
    '<p>Inquadra il QR se desideri informazioni: contatto volontario.</p>',
    '<footer>Joseph · WhatsApp 371 370 8294<br>',htmlEscape(destination),
    '<br>Il QR non comporta consenso automatico a messaggi commerciali.</footer></div></body></html>'].join('');
   const frame=document.createElement('iframe');
   frame.title='Scheda zona A4';frame.style.cssText='position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;';
   frame.addEventListener('load',()=>window.setTimeout(()=>{
    try{frame.contentWindow.focus();frame.contentWindow.print();status.textContent='Scheda pronta: controlla la finestra di stampa.';}
    catch(_){status.textContent='Stampa bloccata dal browser.';}
    window.setTimeout(()=>frame.remove(),60000);
   },250),{once:true});
   document.body.appendChild(frame);frame.srcdoc=page;
  }catch(error){status.textContent='Scheda non stampata: '+(error?.message||'Errore QR')+'.';}
  finally{button.disabled=false;}
 });
 function mount(){
  const timeline=agenda.querySelector('#a50-unified-timeline');
  if(!timeline)return;
  const block=start=>timeline.querySelector('.a50-time-block[data-start="'+start+'"] .a50-block-body');
  const saturday=timeline.querySelector('.a50-saturday-block');
  if(saturday){
   const saturdayKpi=block('12:00');
   if(saturdayKpi)saturdayKpi.append(modules.kpi);
   Object.values(modules).filter(x=>x!==modules.kpi).forEach(x=>x.remove());
  }else{
   const positions={portals:'09:00',timer:'09:30',scripts:'11:30',qr:'15:30',kpi:'16:30'};
   for(const [key,time] of Object.entries(positions)){
    const target=block(time);
    if(target)target.append(modules[key]);
   }
  }
  syncKpi(true);
 }
 document.addEventListener('case247:timeline-rendered',mount);
 window.addEventListener('storage',event=>{if(event.key===STORAGE)syncKpi(true);});
 mount();
 return true;
}
function boot(){
 if(init())return;
 const observer=new MutationObserver(()=>{if(init())observer.disconnect();});
 observer.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
