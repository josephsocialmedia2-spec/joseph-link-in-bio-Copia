/* CASE247: OMI 2026/1 data imported from the three user-supplied Avigliana files.
   Public spatial and quotation data: managed read-only. Browser-specific manual OMI rows
   remain in db.omi, never overwritten or sent to GitHub. */
(function(){
'use strict';
const DATA_PATH='./omi-avigliana-2026-1.json';
let official=null,selectedZone='';
const container=document.getElementById('omi');
if(!container)return;
const section=document.createElement('section');section.className='card omi-sourced';
section.innerHTML=[
 '<h2>Quotazioni OMI Avigliana · 2026/1</h2>',
 '<p id="omi-source-status" role="status">Caricamento 7 zone e 35 quotazioni dai file OMI 2026/1…</p>',
 '<p class="muted">La <strong>zona OMI</strong> è diversa dai quadranti commerciali A/B/C/D del farming. Seleziona la zona tramite la mappa o il menu, poi scegli <strong>tipologia e stato</strong> dell’immobile. L’indirizzo da solo non determina automaticamente la zona.</p>',
 '<div class="omi-filters">',
 '<label>Zona OMI<select id="omi-zone"><option value="">Tutte le zone</option></select></label>',
 '<label>Tipologia<select id="omi-type"><option value="">Tutte le tipologie</option></select></label>',
 '<label>Stato conservativo<select id="omi-condition"><option value="">Tutti gli stati</option></select></label>',
 '</div>',
 '<div class="omi-map-box">',
 '<div class="omi-map-heading"><strong>Perimetri OMI da KML A518</strong><small>Schema geografico senza cartografia stradale · seleziona un poligono</small></div>',
 '<svg id="omi-map" viewBox="0 0 780 550" aria-label="Mappa interattiva delle sette zone OMI di Avigliana" role="group"></svg>',
 '<div id="omi-zone-description" class="muted">Seleziona una zona per visualizzarne la descrizione ufficiale.</div>',
 '</div>',
 '<p class="tiny">Origine: VALORI.csv + ZONE.csv, elaborazione <strong>20/11/2026</strong>; A518.kml (generazione 06/10/2026). Superficie quotazioni: <strong>L</strong>, indicata nel file sorgente. Locazione espressa in €/m²/mese. I dati sono stati forniti dall’utente, senza una verifica online indipendente. Prezzi indicativi, non perizia.</p>'
].join('');
container.insertBefore(section,container.firstChild);
const style=document.createElement('style');
style.textContent=[
 '#omi .omi-sourced{border-left:4px solid #2276a4}',
 '#omi .omi-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:11px 0}',
 '#omi .omi-filters label{font-size:12px;font-weight:700;color:#3b566e}',
 '#omi .omi-filters select{margin-top:4px;font-size:12px}',
 '#omi .omi-map-box{max-width:980px;background:#f4f8fc;border:1px solid #d6e4ed;padding:10px;border-radius:10px}',
 '#omi .omi-map-heading{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}',
 '#omi .omi-map-heading small{color:#65778e}',
 '#omi #omi-map{width:100%;height:auto;max-height:460px;display:block;border-radius:6px;background:#e7f0f6}',
 '#omi #omi-map path{stroke:#ffffff;stroke-width:1.45;stroke-linejoin:round;cursor:pointer;fill-opacity:.65}',
 '#omi #omi-map path:focus-visible{outline:none;stroke:#152e46;stroke-width:4}',
 '#omi #omi-map path:hover{fill-opacity:.9;stroke:#152e46;stroke-width:2.5}',
 '#omi #omi-map path[aria-pressed="true"]{fill-opacity:.95;stroke:#142f4c;stroke-width:4}',
 '#omi #omi-map text{font-size:14px;fill:#112c43;font-weight:900;pointer-events:none;paint-order:stroke;stroke:#fff;stroke-width:3px}',
 '#omi .omi-sourced .muted{line-height:1.5}',
 '#omi #omi-zone-description{background:white;border:1px solid #d4e3eb;padding:8px 10px;border-radius:6px}',
 '#omi .omi-sourced-status{color:#205f47;background:#e9f6ef;padding:8px;border-radius:6px}',
 '#omi .omi-source-cell{font-size:11px;color:#58728a}',
 '@media(max-width:700px){#omi .omi-filters{grid-template-columns:1fr}#omi #omi-map{max-height:300px}}'
].join('\n');
document.head.append(style);
const svg=document.getElementById('omi-map');
const ns='http://www.w3.org/2000/svg';
function node(type,attrs){
 const el=document.createElementNS(ns,type);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
 return el;
}
function options(select,entries,placeholder){
 const previous=select.value;
 select.replaceChildren(new Option(placeholder,''));
 entries.forEach(value=>select.add(new Option(value,value)));
 select.value=entries.includes(previous)?previous:'';
}
function allQuotations(){
 const registered=Array.isArray(db.omi)?db.omi:[];
 return (official?official.quotations.map(q=>({
  id:q.id,city:'Avigliana',zone:q.zone,semester:'2026/1',type:q.type,
  condition:q.condition,min:q.marketMin,max:q.marketMax,
  rentMin:q.rentMin,rentMax:q.rentMax,surfaceMarket:q.marketSurface,
  surfaceRent:q.rentSurface,
  source:'File OMI 2026/1 forniti: QIP_1475977_1_20261_VALORI.csv',
  sourceType:'CSV_OMI'
 })):[]).concat(registered.map(q=>({...q,condition:String(q.condition||'').trim().toUpperCase(),sourceType:'USER'})));
}
function chosenQuote(){return allQuotations().find(x=>x.id===document.getElementById('dOmi').value);}
const colors={B1:'#e6ae35',C1:'#8dd0bf',C2:'#92b3eb',D1:'#cc9bd9',D3:'#e8a5a0',D4:'#89c0d5',E1:'#a5d397'};
function mapDraw(){
 if(!official)return;
 const zones=official.zones;
 let lonMin=Infinity,lonMax=-Infinity,latMin=Infinity,latMax=-Infinity;
 zones.forEach(z=>z.coordinates.forEach(([lon,lat])=>{
  lonMin=Math.min(lonMin,lon);lonMax=Math.max(lonMax,lon);
  latMin=Math.min(latMin,lat);latMax=Math.max(latMax,lat);
 }));
 const cos=Math.cos((latMin+latMax)/2*Math.PI/180);
 const width=(lonMax-lonMin)*cos,height=latMax-latMin;
 const scale=Math.min(730/width,500/height);
 const offX=(780-width*scale)/2,offY=(550-height*scale)/2;
 const point=([lon,lat])=>[offX+(lon-lonMin)*cos*scale,offY+(latMax-lat)*scale];
 const areas=zones.map(z=>{
  const pts=z.coordinates.map(point);
  let area=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];area+=a[0]*b[1]-b[0]*a[1];}
  return {z,pts,area:Math.abs(area)/2};
 }).sort((a,b)=>b.area-a.area);
 svg.replaceChildren();
 for(const item of areas){
  const coords=item.pts.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)).join(' ')+' Z';
  const attrs={d:coords,fill:colors[item.z.code]||'#bad4df',tabindex:'0',role:'button',
    'data-zone':item.z.code,'aria-pressed':String(selectedZone===item.z.code),
    'aria-label':'Seleziona zona OMI '+item.z.code+': '+item.z.description};
  const path=node('path',attrs);
  path.addEventListener('click',()=>selectZone(item.z.code));
  path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectZone(item.z.code)}});
  path.appendChild(node('title',{})).textContent=item.z.code+' · '+item.z.description;
  svg.append(path);
 }
 // Labels are rendered last so all the areas remain visible and keyboard-accessible.
 for(const item of areas){
  const xs=item.pts.map(p=>p[0]),ys=item.pts.map(p=>p[1]);
  const text=node('text',{x:((Math.min(...xs)+Math.max(...xs))/2).toFixed(1),y:((Math.min(...ys)+Math.max(...ys))/2).toFixed(1),'text-anchor':'middle'});
  text.textContent=item.z.code;svg.append(text);
 }
 svg.querySelectorAll('path').forEach(p=>p.setAttribute('aria-pressed',String(p.getAttribute('data-zone')===selectedZone)));
}
function selectZone(code){
 if(!official?.zones.some(z=>z.code===code))return;
 selectedZone=code;
 document.getElementById('omi-zone').value=code;
 renderOmi();
}
function renderOmi(){
 const zoneEl=document.getElementById('omi-zone'),typeEl=document.getElementById('omi-type'),stateEl=document.getElementById('omi-condition');
 const current=zoneEl.value; // Empty means 'all zones'; never restore a stale map selection.
 if(official&&zoneEl.options.length===1)options(zoneEl,official.zones.map(z=>z.code),'Tutte le zone');
 if(current&&Array.from(zoneEl.options).some(o=>o.value===current))zoneEl.value=current;
 selectedZone=zoneEl.value;
 const quotes=allQuotations();
 const types=[...new Set(quotes.filter(q=>!selectedZone||q.zone===selectedZone).map(q=>q.type))].sort((a,b)=>a.localeCompare(b,'it'));
 options(typeEl,types,'Tutte le tipologie');
 const conditions=[...new Set(quotes.filter(q=>(!selectedZone||q.zone===selectedZone)&&(!typeEl.value||q.type===typeEl.value)).map(q=>q.condition))].filter(Boolean).sort();
 options(stateEl,conditions,'Tutti gli stati');
 const shown=quotes.filter(q=>(!selectedZone||q.zone===selectedZone)&&(!typeEl.value||q.type===typeEl.value)&&(!stateEl.value||q.condition===stateEl.value));
 const money=n=>Number.isFinite(Number(n))?euro(Number(n)):'—';
 document.getElementById('omiRows').innerHTML=shown.map(q=>
  '<tr><td><strong>'+esc(q.zone)+'</strong></td><td>'+esc(q.semester)+'</td><td>'+esc(q.type)+' · '+esc(q.condition||'—')+'</td><td>'+money(q.min)+'/m²</td><td>'+money(q.max)+'/m²</td><td><span class="omi-source-cell">'+esc(q.sourceType==='CSV_OMI'?'OMI CSV 2026/1 · L':'Manuale · '+(q.source||''))+
  (q.rentMin!=null&&q.rentMax!=null?'<br>Affitto: '+esc(String(q.rentMin))+'–'+esc(String(q.rentMax))+' €/m²/mese':'')+'</span></td><td>'+
  (q.sourceType==='USER'?'<button class="btn danger" type="button" data-delete-omi="'+esc(q.id)+'">Elimina</button>':'<small>Fonte importata</small>')+'</td></tr>'
 ).join('')||'<tr><td colspan="7">Nessuna quotazione corrispondente ai filtri selezionati</td></tr>';
 document.querySelectorAll('[data-delete-omi]').forEach(button=>button.addEventListener('click',()=>deleteOmi(button.getAttribute('data-delete-omi'))));
 const old=document.getElementById('dOmi').value;
 const choice=document.getElementById('dOmi');
 choice.replaceChildren(new Option('Seleziona zona, tipologia e stato verificati',''));
 shown.forEach(q=>choice.add(new Option(q.zone+' · '+q.type+' · '+(q.condition||'—')+' · '+q.semester+' · '+(q.sourceType==='CSV_OMI'?'OMI':'Manuale'),q.id)));
 choice.value=shown.some(q=>q.id===old)?old:'';
 const item=official?.zones.find(z=>z.code===selectedZone);
 document.getElementById('omi-zone-description').textContent=item?
  ('Zona '+item.code+' · '+item.description+' · Microzona '+item.microzone+' · Codice area '+item.linkZone):
  'Seleziona una zona OMI per visualizzarne il perimetro e la descrizione territoriale.';
 mapDraw();
 previewDossier();
}
function euro2(n){return Number(n).toLocaleString('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0})}
function previewDossier(){
 const x=chosenQuote(),mq=Number(document.getElementById('dMq').value);
 const address=document.getElementById('dAddress').value,kind=document.getElementById('dType').value,notes=document.getElementById('dNotes').value;
 const zone=official?.zones.find(z=>z.code===x?.zone);
 const sourceDetail=x?.sourceType==='CSV_OMI'?
  'CSV OMI Avigliana VALORI e ZONE · semestre 2026/1 · elaborazione 20/11/2026 · geometria A518.kml':
  (x?.source||'Quotazione inserita manualmente');
 const known=x&&mq>0&&Number.isFinite(mq)&&Number.isFinite(Number(x.min))&&Number.isFinite(Number(x.max));
 const annual=known&&x.rentMin!=null&&x.rentMax!=null;
 const html=[
  '<small>IMMOBILIARE LA SACRA · DOSSIER INFORMATIVO</small>',
  '<h2>Valutazione rapida · Avigliana</h2>',
  '<p><strong>Indirizzo indicato:</strong> '+esc(address||'Da inserire')+'<br><strong>Superficie immobile:</strong> '+(mq>0&&Number.isFinite(mq)?esc(mq)+' m²':'Da inserire')+
   '<br><strong>Descrizione dichiarata:</strong> '+esc(kind||'Da specificare')+'</p>',
  known?'<p><strong>Zona OMI selezionata:</strong> '+esc(x.zone)+(zone?'<br><strong>Zona descritta:</strong> '+esc(zone.description):'')+
  '<br><strong>Tipologia:</strong> '+esc(x.type)+
  '<br><strong>Stato di conservazione:</strong> '+esc(x.condition||'Non indicato')+
  '<br><strong>Semestre:</strong> '+esc(x.semester)+
  '<br><strong>Superficie nel file OMI:</strong> '+esc(x.surfaceMarket||'non indicata')+
  '<br><strong>Valori di mercato:</strong> '+euro2(x.min)+' – '+euro2(x.max)+' per m²</p>'+
  '<h2>'+euro2(mq*x.min)+' – '+euro2(mq*x.max)+'</h2>':
  '<p class="status warn">Calcolo non disponibile: seleziona una quotazione OMI e inserisci una superficie valida.</p>',
  annual?'<p><strong>Locazione indicativa:</strong> '+esc(x.rentMin)+' – '+esc(x.rentMax)+' €/m²/mese<br>'+
  '<strong>Intervallo matematico mensile:</strong> '+euro2(mq*x.rentMin)+' – '+euro2(mq*x.rentMax)+' (non stima del canone effettivo)</p>':'',
  '<p><strong>Caratteristiche e pertinenze:</strong> '+esc(notes||'Non indicate')+'</p>',
  known?'<p class="tiny"><strong>Fonte:</strong> '+esc(sourceDetail)+'</p>':'',
  '<p class="tiny">I perimetri OMI devono essere verificati rispetto all’indirizzo: nessuna geocodifica automatica. Il calcolo moltiplica la superficie immessa per gli estremi OMI della tipologia e stato selezionati: <strong>non è una perizia</strong>, non corregge stato, affacci, pertinenze, superfici diverse o caratteristiche particolari. Consegna come prospetto informativo, non come valutazione professionale certificata.</p>'
 ];
 document.getElementById('dossierPreview').innerHTML=html.join('');
}
function printDossier(){
 previewDossier();
 if(!chosenQuote()||!(Number(document.getElementById('dMq').value)>0)){window.alert('Scegli la quotazione OMI corretta e una superficie valida prima di stampare.');return;}
 printHtml(document.getElementById('dossierPreview').innerHTML);
}
window.renderOmi=renderOmi;
window.previewDossier=previewDossier;
window.printDossier=printDossier;
document.getElementById('omi-zone').addEventListener('change',()=>{selectedZone=document.getElementById('omi-zone').value;renderOmi()});
document.getElementById('omi-type').addEventListener('change',renderOmi);
document.getElementById('omi-condition').addEventListener('change',renderOmi);
window.CASE247OMI={
 getData:()=>official,
 selectZone:code=>selectZone(code),
 getSelectedQuote:()=>chosenQuote()
};
async function load(){
 try{
  const response=await fetch(DATA_PATH,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const parsed=await response.json();
  if(parsed?.metadata?.municipalityCode!=='A518'||parsed.metadata.semester!=='2026/1'||parsed.zones?.length!==7||parsed.quotations?.length!==35)throw Error('Formato OMI non valido');
  const zoneSet=new Set(parsed.zones.map(z=>z.code));
  if(parsed.quotations.some(q=>!zoneSet.has(q.zone)||!(q.marketMin>0)||q.marketMax<q.marketMin))throw Error('Quotazioni e zone incoerenti');
  official=parsed;
  const status=document.getElementById('omi-source-status');
  status.className='omi-sourced-status';
  status.textContent='Dataset OMI 2026/1 caricato: 7 zone · 35 quotazioni · 7 perimetri georeferenziati. Fonte: file forniti dall’utente.';
  renderOmi();
 }catch(err){
  document.getElementById('omi-source-status').className='status warn';
  document.getElementById('omi-source-status').textContent='Dataset OMI 2026/1 non caricato ('+String(err.message||err)+'). Restano disponibili le quotazioni inserite manualmente.';
  renderOmi();
 }
}
load();
})();