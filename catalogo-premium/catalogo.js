/* Immobiliare La Sacra · Lettore catalogo pubblico.
 * Nessuna credenziale / API privata nel browser.
 * Solo schede di export espressamente convalidate possono apparire al cliente. */
(()=>{
'use strict';
let pageNodes=[...document.querySelectorAll('.page')];
let pageNames=['Copertina','Il nostro metodo','Indice immobili','Il territorio','Contatti'];
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
function resetDots(){
  dots.replaceChildren();
  pageNodes.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.title=pageNames[i];b.setAttribute('aria-label','Vai a '+pageNames[i]);b.onclick=()=>showPage(i);dots.append(b)});
}
resetDots();
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
const formatPrice=value=>Number(value)>0?new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)):'Prezzo da richiedere';
const escText=x=>typeof x==='string'?x.trim():'';
function cell(tag,className,value){const el=document.createElement(tag);el.className=className;if(value!==undefined)el.textContent=String(value);return el}
function card(p,compact=false){
  const a=cell('article',compact?'property-card sheet-card':'property-card');
  const image=cell('img','');image.src=p.image||'';image.alt='Immobile '+p.title;image.loading='lazy';image.referrerPolicy='no-referrer';
  image.onerror=()=>{image.removeAttribute('src');image.alt='Fotografia non disponibile'};
  a.append(image);
  const body=cell('div','content');
  const locality=p.municipality||'Località da confermare';
  body.append(cell('span','location',locality),cell('h3','',p.title),cell('strong','price',formatPrice(p.price)));
  if(p.surface)body.append(cell('span','property-feature',p.surface+' m²'));
  body.append(cell('p','energy','Prestazione energetica: dato non riportato nella fonte catalogo'));
  const link=cell('a','','Apri scheda ufficiale ↗');link.href=p.url;link.target='_blank';link.rel='noopener noreferrer';body.append(link);
  a.append(body);return a;
}
function renderListings(){
  const city=$('cityFilter').value,needle=escText($('queryFilter').value).toLocaleLowerCase('it');
  const filtered=listings.filter(x=>(!city||x.municipality===city)&&(!needle||[x.title,x.municipality,x.description].some(t=>escText(t).toLocaleLowerCase('it').includes(needle))));
  const container=$('propertyResults');container.replaceChildren();
  if(!filtered.length){
    const box=cell('div','empty-state');box.append(cell('h3','','Nessun immobile per questa ricerca'));
    box.append(cell('p','','Prova a modificare il comune o le parole cercate.'));container.append(box);
  }else{
    const heading=cell('p','results-note',filtered.length+' immobili nell’indice · seleziona un annuncio per aprirlo sul sito ufficiale.');
    container.append(heading);
    const grid=cell('div','property-grid');
    for(const p of filtered)grid.append(card(p));
    container.append(grid);
  }
  $('listingCount').textContent=listings.length+' ANNUNCI IN ARCHIVIO';
}
function addSheets(items){
  const frame=document.querySelector('.reader-frame');
  for(const old of frame.querySelectorAll('.page-listing-sheet'))old.remove();
  // Insert six properties per page, before the territory page.
  const before=frame.querySelector('.page-territory');
  const pageSize=6;
  for(let offset=0;offset<items.length;offset+=pageSize){
    const sheet=cell('article','page page-listing-sheet');sheet.hidden=true;
    const content=cell('div','page-inner');
    const num=Math.floor(offset/pageSize)+1;
    content.append(cell('p','eyebrow','03 / IL PORTAFOGLIO IMMOBILIARE · '+String(num).padStart(2,'0')));
    content.append(cell('h2','sheet-title','Le nostre proposte'));
    const intro=cell('p','sheet-subtitle','Consulta ogni annuncio sul sito ufficiale La Sacra. Prezzo e disponibilità possono variare; richiedi conferma all’agenzia.');
    content.append(intro);
    const grid=cell('div','sheet-grid');
    for(const p of items.slice(offset,offset+pageSize))grid.append(card(p,true));
    content.append(grid);
    const foot=cell('div','page-tail','IMMOBILIARE LA SACRA · CATALOGO IMMOBILI');
    foot.append(cell('span','','ANNUNCI '+(offset+1)+'–'+Math.min(offset+pageSize,items.length)+' / '+items.length));
    content.append(foot);
    sheet.append(content);frame.insertBefore(sheet,before);
  }
  pageNodes=[...document.querySelectorAll('.page')];
  pageNames=['Copertina','Il nostro metodo','Indice immobili',...Array.from({length:Math.ceil(items.length/pageSize)},(_,i)=>'Immobili '+(i*pageSize+1)+'–'+Math.min((i+1)*pageSize,items.length)),'Il territorio','Contatti'];
  pageNodes.forEach((p,i)=>{p.dataset.page=String(i)});
  resetDots();
  showPage(selected,false);
}
async function load(){
  try{
    const res=await fetch('../immobili/catalogo.json',{cache:'no-store'});
    if(!res.ok)throw Error('Catalogo non raggiungibile');
    const data=await res.json();
    if(!Array.isArray(data.items))throw Error('Formato catalogo non valido');
    // Archived/draft are not in this source. Do not infer energy certification from marketing descriptions.
    listings=data.items.filter(p=>p&&hostOK(p.url)&&p.availability_status==='AVAILABLE')
      .sort((a,b)=>(a.municipality||'ZZZ').localeCompare(b.municipality||'ZZZ','it')||a.title.localeCompare(b.title,'it'));
    const city=$('cityFilter');
    for(const name of [...new Set(listings.map(x=>x.municipality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'))){
      const opt=document.createElement('option');opt.value=name;opt.textContent=name;city.append(opt);
    }
    renderListings();
    addSheets(listings);
  }catch(error){
    const container=$('propertyResults');container.replaceChildren();
    container.append(cell('p','results-error','Caricamento annunci non riuscito. '+error.message));
    $('listingCount').textContent='ERRORE CARICAMENTO';
    console.error(error);
  }
}
// Richiesta spontanea di materiale: passaggio esplicito al client email del visitatore.
// Questa pagina statica NON crea contatti marketing e non dichiara consensi verificati.
const requestForm=$('materialRequest');
if(requestForm){
  requestForm.addEventListener('submit',event=>{
    event.preventDefault();
    const status=$('requestStatus');
    if(!requestForm.checkValidity()){
      status.textContent='Completa i campi obbligatori e prendi visione dell’informativa.';
      requestForm.reportValidity();
      return;
    }
    const d=new FormData(requestForm);
    const clean=(field,max)=>String(d.get(field)||'').trim().slice(0,max).replace(/[\\r\\n]+/g,' ');
    const name=clean('name',100),business=clean('business',130),
      email=clean('email',254),city=clean('city',90),subject=clean('subject',100),
      message=String(d.get('message')||'').trim().slice(0,700);
    if(!name||!business||!email||!city||!subject){
      status.textContent='Compila tutti i campi obbligatori.';return;
    }
    const lines=[
      'Richiesta spontanea di materiale pubblicitario',
      'Immobiliare La Sacra · Referente Malafronte Joseph',
      '',
      'Nome e cognome: '+name,
      'Attività: '+business,
      'Email: '+email,
      'Comune: '+city,
      'Materiale richiesto: '+subject,
      'Messaggio: '+(message||'Nessuno'),
      '',
      'Informativa privacy: presa visione dichiarata.',
      d.has('marketing')
        ? 'Future comunicazioni marketing: interesse espresso, NON iscrizione e NON consenso operativo verificato; richiede separata procedura di verifica.'
        : 'Future comunicazioni marketing: NON richieste.',
      'Origine: '+rootUrl,
      '',
      'La presente è una richiesta individuale inviata spontaneamente dall’interessato.'
    ];
    const href='mailto:immobiliarelasacra@gmail.com?subject='+
      encodeURIComponent('Richiesta materiale · '+subject+' · '+business)+
      '&body='+encodeURIComponent(lines.join('\\n'));
    status.textContent='Il programma email si aprirà con la richiesta pronta. Conferma l’invio nella tua email; nessun dato è stato ancora trasmesso da questa pagina.';
    window.location.href=href;
  });
}

$('cityFilter').addEventListener('change',renderListings);
$('queryFilter').addEventListener('input',renderListings);
load();
})();