/* CASE247 · Piano vie C1/C2/D1 da CSV OMI 2026/1.
   Non convertire descrizioni OMI in attribuzioni automatiche dei numeri civici.
   Registra solo dati di territorio, mai nominativi o telefonate a freddo. */
(()=>{
'use strict';
const host=document.getElementById('zones');if(!host)return;
const KEY='case247-farming-strade-omi-2026-1-v1';
if(host.previousElementSibling?.tagName==='H2')host.previousElementSibling.textContent='Vie del presidio quotidiano · Zone OMI C1 / C2 / D1';
if(host.nextElementSibling?.matches('p'))host.nextElementSibling.textContent='Vie tratte dal CSV OMI ZONE 2026/1 e confrontate con KML A518. Ogni civico e tratto va verificato prima della consegna. Le zone OMI non coincidono con i quadranti A/B/C/D del farming.';
const STREET=[
 {zone:'C1',street:'Via Suppo',mapStreet:'Via Suppo Giovanni',note:'OMI: VIA SUPPO. Il documento stradale locale riporta Via Suppo Giovanni; Via dei Suppo è una denominazione distinta. Verifica la targa e il tratto.'},
 {zone:'C1',street:'Via Reano',note:'OMI: VIA REANO. Verificare tratto e civici compresi nel perimetro C1: la descrizione non elenca i singoli numeri.'},
 {zone:'C1',street:"Via Sant'Agostino",note:'OMI: VIA S.AGOSTINO. La denominazione Via Sant’Agostino risulta anche negli elenchi stradali locali; verificare civici e perimetro.'},
 {zone:'C2',street:'Corso Europa',note:'OMI: C.SO EUROPA. S.S. 25 e ferrovia Torino–Modane sono riferimenti territoriali, non nuove vie da contare come cassette. Verificare tratto e civici.'},
 {zone:'D1',street:'Via Drubiaglio',note:'OMI: VIA DRUBIAGLIO. Denominazione confermata in elenchi stradali locali; verificare tratto e civici nel perimetro D1.'},
 {zone:'D1',street:'Via Villardora',mapStreet:'Via Villar Dora',note:'OMI: VIA VILLARDORA. Gli elenchi locali riportano Via Villar Dora: verificare targa e civici, senza attribuire automaticamente tutta la via alla D1.'}
];
const DOW={1:'C1',2:'C2',4:'D1'};
const DESCRIPTIONS={
 C1:'RESIDENZIALE A NORD DEL LAGO GRANDE - VIA SUPPO - VIA REANO - VIA S.AGOSTINO',
 C2:'RESIDENZIALE - S.S. 25 - C.SO EUROPA - FERROVIA TORINO MODANE',
 D1:'RESIDENZIALE A NORD DELLA DORA - S.S. 24 - VIA DRUBIAGLIO - VIA VILLARDORA'
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Rome'});
let state={};
try{state=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){}
if(!state.days||typeof state.days!=='object')state.days={};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){};render()};
const css=document.createElement('style');
css.textContent='#zones .omi-work-top{display:flex;gap:7px;align-items:end;flex-wrap:wrap;margin:11px 0}#zones .omi-work-top label{font-size:12px;font-weight:650}#zones .omi-work-top input,#zones .omi-work-top select,#zones .omi-work-card input,#zones .omi-work-card textarea{display:block;max-width:100%;width:100%;padding:8px;border:1px solid #b8c9db;border-radius:6px;background:white;color:#1d3650}#zones .omi-work-row{border:1px solid #d7e2ec;border-radius:7px;padding:10px;margin:8px 0;background:white}#zones .omi-work-row strong{display:block;color:#1c4e73}#zones .omi-work-row p{font-size:12px;margin:3px 0}#zones .omi-work-row .btn{font-size:11px}#zones .omi-work-info{padding:9px 11px;background:#f3f8fc;border-left:4px solid #2a719b;color:#344f69;font-size:12px;line-height:1.5;margin:8px 0}#zones .omi-work-card{border:2px solid #c6d9e8;border-top:4px solid #bb8d39;border-radius:8px;background:#f8fbfd;padding:12px;margin:11px 0}#zones .omi-work-card h3{margin:0 0 9px;font-size:16px}#zones .omi-work-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#zones .omi-work-card label{font-size:11px;font-weight:700;color:#33546b}#zones .omi-work-card textarea{min-height:56px}#zones .omi-work-confirm{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}#zones .omi-work-confirm label{display:flex;align-items:center;gap:6px;font-weight:600}#zones .omi-work-confirm input{width:18px;height:18px}#zones [data-omi-status=done]{color:#1d7252;font-weight:700}#zones .omi-work-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}@media(max-width:620px){#zones .omi-work-fields{grid-template-columns:1fr}}@media print{#printRoot button{display:none!important}}';
document.head.append(css);
host.innerHTML='<div class="omi-work-info"><strong>Zone OMI 2026/1 verificate: C1, C2, D1.</strong> Lunedì C1 · martedì C2 · mercoledì studi B2B · giovedì D1 · venerdì verifiche/follow-up. Le descrizioni OMI non identificano automaticamente i civici. S.S. 25, S.S. 24 e ferrovia Torino–Modane sono riferimenti di zona.</div><div class="omi-work-top"><label>Data del presidio<input id="omi-work-date" type="date"></label><label>Zona<select id="omi-work-zone"><option value="C1">C1 · Lago Grande</option><option value="C2">C2 · Corso Europa</option><option value="D1">D1 · Nord Dora</option><option value="all">Tutte</option></select></label><button class="btn secondary" type="button" id="omi-work-export">Esporta diario vie CSV</button></div><div id="omi-work-description" class="omi-work-info"></div><div id="omi-work-list"></div><div id="omi-work-editor" class="omi-work-card" hidden></div><p class="muted">Prima della distribuzione verifica i divieti “No pubblicità”, il tratto e i civici. Nessun invio automatico, nessun nominativo catastale e nessun falso acquirente.</p>';
const rowLinks=document.createElement('div');
rowLinks.className='omi-work-top';
rowLinks.innerHTML='<button class="btn secondary" type="button" id="omi-work-letter">Prepara lettera della zona</button><button class="btn secondary" type="button" id="omi-work-quotes">Apri dati OMI</button><a class="btn secondary" href="./storico/" rel="noopener noreferrer" target="_blank">Diario operativo</a>';
host.querySelector('#omi-work-list').before(rowLinks);
rowLinks.querySelector('#omi-work-letter').addEventListener('click',()=>{
 const zone=host.querySelector('#omi-work-zone').value;
 const first=STREET.find(x=>x.zone===zone);
 if(typeof goto==='function')goto('lettere');
 const input=document.getElementById('letterZone');
 if(input){input.value=first?first.street+', Avigliana (TO) · tratto da verificare':'Avigliana (TO) · verificare zona e civici';if(typeof previewLetter==='function')previewLetter();}
});
rowLinks.querySelector('#omi-work-quotes').addEventListener('click',()=>{
 const zone=host.querySelector('#omi-work-zone').value;
 if(typeof goto==='function')goto('omi');
 if(zone!=='all'&&window.CASE247OMI?.selectZone)window.CASE247OMI.selectZone(zone);
});
host.querySelector('#omi-work-description').insertAdjacentHTML('afterend','<div id="omi-work-week" class="omi-work-info" aria-live="polite"></div>');
const inputDate=host.querySelector('#omi-work-date'),inputZone=host.querySelector('#omi-work-zone'),list=host.querySelector('#omi-work-list'),editor=host.querySelector('#omi-work-editor');
inputDate.value=today();
const dayZone=()=>{const dow=new Date(inputDate.value+'T12:00:00Z').getUTCDay();return DOW[dow]||'all'};
inputZone.value=dayZone();
const records=()=>state.days[inputDate.value]||{};
function weeklyReview(){
 const d=new Date(inputDate.value+'T12:00:00Z');if(Number.isNaN(d.valueOf()))return;
 const dow=d.getUTCDay();d.setUTCDate(d.getUTCDate()-(dow+6)%7);
 const weekly=[{offset:0,day:'Lunedì',zone:'C1'},{offset:1,day:'Martedì',zone:'C2'},{offset:3,day:'Giovedì',zone:'D1'}];
 const lines=weekly.map(item=>{
  const date=new Date(d);date.setUTCDate(date.getUTCDate()+item.offset);
  const rec=state.days[date.toISOString().slice(0,10)]||{};
  const roads=STREET.filter(x=>x.zone===item.zone);
  const done=roads.filter(x=>{const r=rec[x.zone+'|'+x.street];return r?.verified&&r?.noAdvertisingChecked&&String(r.civici||'').trim()}).length;
  const delivered=roads.reduce((n,x)=>n+Number(rec[x.zone+'|'+x.street]?.delivered||0),0);
  return item.day+' '+item.zone+': '+done+'/'+roads.length+' vie documentate, '+delivered+' lettere consegnate';
 });
 host.querySelector('#omi-work-week').textContent='SETTIMANA DAL '+d.toISOString().slice(0,10)+' · '+lines.join(' | ')+' · Mercoledì B2B; venerdì controllo e richiami.';
}
function render(){
 const zone=inputZone.value,rr=records(),selection=STREET.filter(x=>zone==='all'||x.zone===zone);weeklyReview();
 host.querySelector('#omi-work-description').textContent=(zone==='all'?'Tutte le zone · 6 vie':zone+' · '+DESCRIPTIONS[zone])+' · '+selection.filter(x=>rr[x.zone+'|'+x.street]?.verified&&rr[x.zone+'|'+x.street]?.noAdvertisingChecked&&String(rr[x.zone+'|'+x.street]?.civici||'').trim()).length+'/'+selection.length+' vie verificate (sopralluogo e divieti) · '+selection.reduce((sum,x)=>sum+Number(rr[x.zone+'|'+x.street]?.delivered||0),0)+' lettere consegnate';
 list.innerHTML=selection.map(x=>{
  const id=x.zone+'|'+x.street,r=rr[id];const done=r?.verified;const safe=done&&r.noAdvertisingChecked;
  return '<div class="omi-work-row"><strong>'+esc(x.zone)+' · '+esc(x.street)+'</strong><p>'+esc(x.note)+'</p><p data-omi-status="'+(done?'done':'pending')+'">'+(safe?'Sopralluogo e divieti verificati; civici: '+esc(r.civici||'nessuno')+'; lettere consegnate: '+Number(r.delivered||0):done?'Sopralluogo registrato, verifica divieti ancora mancante':'Da verificare sul posto')+'</p><button class="btn secondary" type="button" data-omi-road="'+esc(id)+'">Apri scheda via</button></div>';
 }).join('');
 list.querySelectorAll('[data-omi-road]').forEach(el=>el.addEventListener('click',()=>open(el.dataset.omiRoad)));
}
function open(id){
 const selected=STREET.find(x=>x.zone+'|'+x.street===id);
 if(!selected)return;
 const prev=records()[id]||{};
 const url='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((selected.mapStreet||selected.street)+', Avigliana, Torino, Italia');
 editor.hidden=false;
 editor.innerHTML='<h3>'+esc(selected.zone)+' · '+esc(selected.street)+'</h3><p class="muted">'+esc(DESCRIPTIONS[selected.zone])+'</p><div class="omi-work-fields"><label>Civici/tratto controllati<input id="omi-road-civici" value="'+esc(prev.civici||'')+'" placeholder="Es.: dal civico 2 al 12"></label><label>Lettere preparate<input type="number" min="0" id="omi-road-prepared" value="'+Number(prev.prepared||0)+'"></label><label>Lettere consegnate<input type="number" min="0" id="omi-road-delivered" value="'+Number(prev.delivered||0)+'"></label><label style="grid-column:1/-1">Note territoriali (no nominativi)<textarea id="omi-road-notes">'+esc(prev.notes||'')+'</textarea></label></div><div class="omi-work-confirm"><label><input type="checkbox" id="omi-road-verified" '+(prev.verified?'checked':'')+'>Sopralluogo verificato personalmente</label><label><input type="checkbox" id="omi-road-noadv" '+(prev.noAdvertisingChecked?'checked':'')+'>Divieti di distribuzione controllati</label></div><div class="omi-work-actions"><button type="button" class="btn" id="omi-road-save">Salva operazione</button><a class="btn secondary" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Controlla su Maps</a><button type="button" class="btn secondary" id="omi-road-values">Apri quotazioni OMI</button><button type="button" class="btn secondary" id="omi-road-close">Chiudi</button></div>';
 editor.querySelector('#omi-road-close').onclick=()=>editor.hidden=true;
 editor.querySelector('#omi-road-values').onclick=()=>{
  if(typeof goto==='function')goto('omi');
  if(window.CASE247OMI?.selectZone)window.CASE247OMI.selectZone(selected.zone);
 };
 editor.querySelector('#omi-road-save').onclick=()=>{
  const civici=editor.querySelector('#omi-road-civici').value.trim();
  const prepared=Number(editor.querySelector('#omi-road-prepared').value);
  const delivered=Number(editor.querySelector('#omi-road-delivered').value);
  const verified=editor.querySelector('#omi-road-verified').checked;
  const noAdv=editor.querySelector('#omi-road-noadv').checked;
  if(!Number.isInteger(prepared)||prepared<0||!Number.isInteger(delivered)||delivered<0||delivered>prepared){window.alert('Numeri non validi: le consegne non possono superare il materiale preparato.');return}
  if(verified&&(!noAdv||!civici)){window.alert('Per confermare il sopralluogo servono civici/tratto e controllo dei divieti.');return}
  if(delivered>0&&(!verified||!noAdv||!civici)){window.alert('Per registrare consegne verifica sopralluogo, civici e divieti di pubblicità.');return}
  state.days[inputDate.value]??={};
  state.days[inputDate.value][id]={zone:selected.zone,street:selected.street,civici,prepared,delivered,verified,noAdvertisingChecked:noAdv,notes:editor.querySelector('#omi-road-notes').value.slice(0,500),updatedAt:new Date().toISOString()};
  editor.hidden=true;save();
 };
}
inputDate.addEventListener('change',()=>{inputZone.value=dayZone();editor.hidden=true;render()});
inputZone.addEventListener('change',()=>{editor.hidden=true;render()});
host.querySelector('#omi-work-export').onclick=()=>{
 const rows=[['Data','Zona','Via','Civici verificati','Preparati','Consegnati','Sopralluogo','Divieti','Note','Aggiornamento']];
 for(const [date,rec] of Object.entries(state.days))for(const r of Object.values(rec))rows.push([date,r.zone,r.street,r.civici,r.prepared,r.delivered,r.verified?'SI':'NO',r.noAdvertisingChecked?'SI':'NO',r.notes,r.updatedAt]);
 const text='\uFEFF'+rows.map(x=>x.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='CASE247_Presidio_OMI_C1_C2_D1.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),700);
};
render();
})();
