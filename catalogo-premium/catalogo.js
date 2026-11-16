/* Immobiliare La Sacra · Lettore catalogo pubblico.
 * Nessuna credenziale / API privata nel browser.
 * Solo schede di export espressamente convalidate possono apparire al cliente. */
(()=>{
'use strict';
const pageNodes=[...document.querySelectorAll('.page')];
const pageNames=['Copertina','Il nostro metodo','Immobili','Il territorio','Contatti'];
const rootUrl=new URL('./',location.href).href.split('#')[0].split('?')[0];
let selected=0;
const $=id=>document.getElementById(id);
const toast=message=>{const node=$('toast');node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),3200)};
const dots=$('pageDots');
function showPage(index,updateUrl=true){
  selected=Math.max(0,Math.min(pageNodes.length-1,index));
  for(let i=0;i<pageNodes.length;i++){
    pageNodes[i].hidden=i!==selected;
    pageNodes[i].classList.toggle('active',i===selected);
  }
  $('pageCounter').textContent=(selected+1)+' / '+pageNodes.length;
  $('pageLabel').textContent=pageNames[selected];
  $('prevPage').disabled=selected===0;
  $('nextPage').disabled=selected===pageNodes.length-1;
  for(const [i,b] of [...dots.children].entries()){b.classList.toggle('active',i===selected);b.setAttribute('aria-current',i===selected?'page':'false');}
  if(updateUrl)history.replaceState(null,'',rootUrl+'#pagina-'+(selected+1));
}
pageNodes.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.title=pageNames[i];b.setAttribute('aria-label','Vai a '+pageNames[i]);b.onclick=()=>showPage(i);dots.append(b)});
$('prevPage').onclick=()=>showPage(selected-1);
$('nextPage').onclick=()=>showPage(selected+1);
const match=location.hash.match(/^#pagina-(\d+)$/);showPage(match?Number(match[1])-1:0,false);
addEventListener('hashchange',()=>{const m=location.hash.match(/^#pagina-(\d+)$/);if(m)showPage(Number(m[1])-1,false)});
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(e.key==='ArrowRight'){e.preventDefault();showPage(selected+1)}
  if(e.key==='ArrowLeft'){e.preventDefault();showPage(selected-1)}
});
let touchX=null,touchY=null;
const frame=document.querySelector('.reader-frame');
frame.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;touchX=e.touches[0].clientX;touchY=e.touches[0].clientY},{passive:true});
frame.addEventListener('touchend',e=>{if(touchX===null||e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;touchX=null;touchY=null;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.4)showPage(selected+(dx<0?1:-1))},{passive:true});
const shareText='Immobiliare La Sacra | Catalogo digitale. Sfoglia la brochure e contatta direttamente l’agenzia: '+rootUrl;
for(const btn of document.querySelectorAll('[data-share]'))btn.addEventListener('click',async()=>{
  const t=btn.dataset.share;
  if(t==='print'){print();return}
  if(t==='whatsapp'){open('https://wa.me/?text='+encodeURIComponent(shareText),'_blank','noopener,noreferrer');return}
  if(t==='email'){location.href='mailto:?subject='+encodeURIComponent('Immobiliare La Sacra | Catalogo digitale')+'&body='+encodeURIComponent('Buongiorno,\n\nle condivido il catalogo digitale di Immobiliare La Sacra:\n'+rootUrl+'\n\nCordiali saluti.');return}
  if(t==='sms'){location.href='sms:?body='+encodeURIComponent('Immobiliare La Sacra · Catalogo digitale: '+rootUrl);return}
  if(t==='copy'){try{await navigator.clipboard.writeText(rootUrl);toast('Link del catalogo copiato.')}catch{const tmp=document.createElement('textarea');tmp.value=rootUrl;document.body.append(tmp);tmp.select();const ok=document.execCommand('copy');tmp.remove();toast(ok?'Link copiato.':'Copia il link dalla barra degli indirizzi.')}return}
});
const hostOK=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['lasacraimmobiliare.it','www.lasacraimmobiliare.it'].includes(u.hostname)&&/^\/products\/[a-z0-9-]+\/?$/.test(u.pathname)}catch{return false}};
const text=x=>typeof x==='string'?x.trim():'';
function publishable(p){
  if(!p||!hostOK(p.url)||p.status!=='ACTIVE'||p.availabilityConfirmed!==true||p.locationVerified!==true||p.imageVerified!==true||p.priceVerified!==true)return false;
  if(!p.title||!p.municipality||!Number.isFinite(Number(p.price))||Number(p.price)<=0||!/^https:\/\//.test(text(p.image)))return false;
  if(p.apeStatus==='PRESENTE')return /^(A[1-4]|[B-G])$/.test(text(p.energyClass))&&Number.isFinite(Number(p.epglNren))&&Number(p.epglNren)>=0&&Number.isFinite(Number(p.envelopeIndex))&&Number(p.envelopeIndex)>=0&&p.apeVerified===true;
  if(p.apeStatus==='ESENTE')return p.exemptionVerified===true&&text(p.exemptionReason).length>5;
  return false;
}
let listings=[];
function cell(tag,className,value){const n=document.createElement(tag);n.className=className;if(value!==undefined)n.textContent=String(value);return n}
function card(p){
  const a=cell('article','property-card'),im=document.createElement('img');
  im.src=p.image;im.alt='Fotografia immobile: '+p.title;im.loading='lazy';im.referrerPolicy='no-referrer';a.append(im);
  const body=cell('div','content');body.append(cell('span','location',p.municipality),cell('h3','',p.title));
  body.append(cell('strong','price',new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(p.price))));
  body.append(cell('p','energy',p.apeStatus==='ESENTE'?'APE: esenzione verificata':'Classe '+p.energyClass+' · EPgl,nren '+p.epglNren+' kWh/m² anno'));
  const link=cell('a','','Vedi immobile e richiedi visita ↗');link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';body.append(link);a.append(body);return a;
}
function renderListings(){
  const city=$('cityFilter').value,needle=text($('queryFilter').value).toLocaleLowerCase('it');
  const filtered=listings.filter(x=>(!city||x.municipality===city)&&(!needle||[x.title,x.municipality,x.description].some(t=>text(t).toLocaleLowerCase('it').includes(needle))));
  const container=$('propertyResults');container.replaceChildren();
  if(!filtered.length){
    const box=cell('div','empty-state');box.append(cell('span','empty-glyph','⌂'));
    box.append(cell('h3','',listings.length?'Nessun immobile per questa ricerca':'Stiamo completando la selezione'));
    box.append(cell('p','',listings.length?'Prova a cambiare comune o criterio di ricerca.':'Le schede immobiliari saranno mostrate qui quando i dati energetici e le altre verifiche saranno completati.'));
    const link=cell('a','','Consulta il sito ufficiale ↗');link.href='https://lasacraimmobiliare.it';link.target='_blank';link.rel='noopener noreferrer';box.append(link);container.append(box);
  }else{const grid=cell('div','property-grid');for(const p of filtered)grid.append(card(p));container.append(grid)}
  $('listingCount').textContent=listings.length?listings.length+' SCHEDE PUBBLICABILI':'SCHEDE IN VALIDAZIONE';
}
async function load(){
  try{
    const res=await fetch('./immobili-verificati.json',{cache:'no-store'});
    if(!res.ok)throw Error('feed');
    const data=await res.json();
    if(!Array.isArray(data.items))throw Error('format');
    listings=data.items.filter(publishable).sort((a,b)=>a.municipality.localeCompare(b.municipality,'it')||a.title.localeCompare(b.title,'it'));
    const city=$('cityFilter');
    for(const name of [...new Set(listings.map(x=>x.municipality))].sort((a,b)=>a.localeCompare(b,'it'))){const option=document.createElement('option');option.value=name;option.textContent=name;city.append(option)}
    renderListings();
  }catch{listings=[];renderListings()}
}
$('cityFilter').addEventListener('change',renderListings);
$('queryFilter').addEventListener('input',renderListings);
load();
})();