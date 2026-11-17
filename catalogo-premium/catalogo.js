/* Immobiliare La Sacra · Lettore catalogo pubblico.
 * Nessuna credenziale / API privata nel browser.
 * Solo schede di export espressamente convalidate possono apparire al cliente. */
(()=>{
'use strict';
const Rules=window.LaSacraRules;
if(!Rules)throw Error('Regole di selezione immobili non caricate.');
let pageNodes=[...document.querySelectorAll('.page')];
let pageNames=['Copertina','Valutazione gratuita'];
// The one client URL can optionally carry a conservative allowlist of product IDs
// selected from existing official URLs in Studio Volantini Premium.
const publicUrl=new URL(location.href);
publicUrl.hash='';
for(const key of [...publicUrl.searchParams.keys()])if(!['immobili','solo_verificati'].includes(key))publicUrl.searchParams.delete(key);
const rootUrl=publicUrl.href;
const rawIds=publicUrl.searchParams.get('immobili');
const wantedIds=rawIds&&/^\d{10,20}(,\d{10,20}){0,17}$/.test(rawIds)?
  new Set(rawIds.split(',')):null;
const selectionInvalid=Boolean(rawIds&&!wantedIds);
const onlyVerified=publicUrl.searchParams.get('solo_verificati')==='1';
let selected=0;
const $=id=>document.getElementById(id);
const toast=message=>{const node=$('toast');node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),3200)};
const select=$('pageSelect');
function showPage(index,updateUrl=true){
  selected=Math.max(0,Math.min(pageNodes.length-1,index));
  for(let i=0;i<pageNodes.length;i++){
    pageNodes[i].hidden=i!==selected;
    pageNodes[i].classList.toggle('active',i===selected);
  }
  $('pageCounter').textContent='Pagina '+(selected+1)+' di '+pageNodes.length;
  $('pageLabel').textContent=pageNames[selected]||'Pagina';
  select.value=String(selected);
  $('prevPage').disabled=selected===0;
  $('nextPage').disabled=selected===pageNodes.length-1;
  if(updateUrl)history.replaceState(null,'',rootUrl+'#pagina-'+(selected+1));
}
function resetDots(){
  select.replaceChildren();
  pageNodes.forEach((_,i)=>{
    const option=document.createElement('option');
    option.value=String(i);
    option.textContent=(i+1)+' · '+(pageNames[i]||'Pagina');
    select.append(option);
  });
}
resetDots();
select.addEventListener('change',()=>showPage(Number(select.value)));
$('prevPage').onclick=()=>showPage(selected-1);
$('nextPage').onclick=()=>showPage(selected+1);
const match=location.hash.match(/^#pagina-(\d+)$/);
showPage(match?Number(match[1])-1:0,false);
addEventListener('hashchange',()=>{
  const m=location.hash.match(/^#pagina-(\d+)$/);
  if(m)showPage(Number(m[1])-1,false);
});
$('verifiedOnly').checked=onlyVerified;
$('verifiedOnly').addEventListener('change',()=>{
  const url=new URL(location.href);
  if($('verifiedOnly').checked)url.searchParams.set('solo_verificati','1');
  else url.searchParams.delete('solo_verificati');
  url.hash='';
  location.assign(url.href);
});
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(e.key==='ArrowRight'){e.preventDefault();showPage(selected+1)}
  if(e.key==='ArrowLeft'){e.preventDefault();showPage(selected-1)}
});
let touchX=null,touchY=null;
// Only one page is visible while browsing; printing requires the ENTIRE flipbook.
addEventListener('beforeprint',()=>{
  for(const page of document.querySelectorAll('.reader-frame .page'))page.hidden=false;
});
addEventListener('afterprint',()=>showPage(selected,false));
const frame=document.querySelector('.reader-frame');
frame.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;touchX=e.touches[0].clientX;touchY=e.touches[0].clientY},{passive:true});
frame.addEventListener('touchend',e=>{if(touchX===null||e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;touchX=null;touchY=null;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.4)showPage(selected+(dx<0?1:-1))},{passive:true});
const shareText='Buongiorno, come concordato le invio il catalogo immobiliare sfogliabile di Immobiliare La Sacra: quattro proposte per pagina, fotografie e schede ufficiali.\n\n'+rootUrl+'\n\nPrezzi e disponibilità sono da confermare con l’agenzia.';
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
  const data=Rules.displayData(p);
  const article=cell('article',compact?'property-card sheet-card':'property-card');
  article.setAttribute('data-property-id',String(p.id));
  const photo=cell('div','property-photo');
  const original=escText(p.image);
  if(original){
    const image=document.createElement('img');
    image.alt='Fotografia: '+data.title+' a '+data.locality;
    image.loading=compact?'eager':'lazy';
    image.decoding='async';
    image.referrerPolicy='no-referrer';
    image.onerror=()=>{
      if(image.dataset.source==='local'){
        image.dataset.source='shopify';
        image.src=original;
      }else{
        image.remove();
        photo.classList.add('photo-unavailable');
        photo.append(cell('span','photo-fallback','Fotografia non disponibile'));
      }
    };
    image.dataset.source='local';
    image.src='./photos/'+encodeURIComponent(String(p.id))+'.jpg';
    photo.append(image);
  }else{
    photo.classList.add('photo-unavailable');
    photo.append(cell('span','photo-fallback','Fotografia non disponibile'));
  }
  const body=cell('div','content');
  const main=cell('div','property-main');
  const heading=cell('div','property-heading');
  heading.append(cell('span','location',data.locality));
  heading.append(cell('strong','price',formatPrice(p.price)));
  main.append(heading,cell('h3','property-title',data.title));
  const facts=cell('div','property-features');
  const values=[data.surface,data.rooms,data.type,...data.features];
  for(const value of values)facts.append(cell('span','property-feature',value));
  main.append(facts);
  main.append(cell('span',data.apeVerified?'ape-badge verified':'ape-badge',data.ape));
  const link=cell('a','property-link','Apri scheda ufficiale ↗');
  link.href=p.url;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.setAttribute('aria-label','Apri scheda ufficiale: '+data.title+' a '+data.locality);
  body.append(main,link);
  article.append(photo,body);
  return article;
}
function addSheets(items){
  const frame=document.querySelector('.reader-frame');
  for(const old of frame.querySelectorAll('.page-listing-sheet'))old.remove();
  // Exactly four REAL official property links per catalogue spread, 2 x 2.
  const before=frame.querySelector('.page-end');
  const pageSize=4;
  for(let offset=0;offset<items.length;offset+=pageSize){
    const sheet=cell('article','page page-listing-sheet');sheet.hidden=true;
    const content=cell('div','page-inner');
    const num=Math.floor(offset/pageSize)+1;
    content.append(cell('p','eyebrow','IMMOBILIARE LA SACRA · LE NOSTRE PROPOSTE · '+String(num).padStart(2,'0')));
    content.append(cell('h2','sheet-title','Le nostre proposte'));
    const intro=cell('p','sheet-subtitle','4 immobili per pagina · immagini originali e link ufficiali · prezzi e disponibilità da confermare con l’agenzia.');
    content.append(intro);
    const grid=cell('div','sheet-grid');
    for(const p of items.slice(offset,offset+pageSize))grid.append(card(p,true));
    content.append(grid);
    const foot=cell('div','page-tail','IMMOBILIARE LA SACRA · VALLE DI SUSA E TORINO');
    foot.append(cell('span','','ANNUNCI '+(offset+1)+'–'+Math.min(offset+pageSize,items.length)+' / '+items.length));
    content.append(foot);
    sheet.append(content);frame.insertBefore(sheet,before);
  }
  pageNodes=[...document.querySelectorAll('.page')];
  pageNames=['Copertina',...Array.from({length:Math.ceil(items.length/pageSize)},(_,i)=>'Immobili '+(i*pageSize+1)+'–'+Math.min((i+1)*pageSize,items.length)),'Valutazione gratuita'];
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
    if(selectionInvalid)throw Error('Selezione immobili non valida. Richiedi un nuovo link all’agenzia.');
    listings=Rules.filterListings(data.items,{
      ids:wantedIds?[...wantedIds]:null,
      onlyVerified
    });
    // Public feed eligibility is editorial, not proof of the APE or legal availability.
    // The professional checks the original URL before accepting an appointment.
    const message=listings.length?
      listings.length+' proposte residenziali nei comuni ammessi · quattro immobili per pagina.':
      onlyVerified?'Nessun annuncio con APE documentato e verificato in questo momento.':
      wantedIds?'La selezione non contiene annunci residenziali idonei e localizzati nei comuni ammessi.':
      'Nessun annuncio residenziale idoneo disponibile nel territorio selezionato.';
    $('catalogStatus').textContent=message;
    if(wantedIds||onlyVerified){
      // Never expose the whole archive PDF for a filtered client selection.
      const fullPdf=document.querySelector('.pdf-download');
      if(fullPdf)fullPdf.hidden=true;
      const printButton=document.querySelector('[data-share="print"]');
      if(printButton)printButton.textContent='Stampa / Salva PDF di questa selezione';
    }
    addSheets(listings);
  }catch(error){
    const frame=document.querySelector('.reader-frame');
    frame.setAttribute('data-catalog-error',error.message);
    $('catalogStatus').textContent='Caricamento non riuscito: '+error.message;
    toast('Impossibile caricare le proposte. Consulta il sito ufficiale.');
    console.error(error);
  }
}

const requestToggle=$('requestMoreToggle');
const requestSection=$('richiesta-materiale');
requestToggle.addEventListener('change',()=>{
  requestSection.hidden=!requestToggle.checked;
  if(requestToggle.checked){
    requestSection.scrollIntoView({behavior:'smooth',block:'start'});
  }else{
    $('requestFeedback').textContent='';
  }
});
const requestFields={
  name:$('reqName'),material:$('reqMaterial'),type:$('reqType'),city:$('reqCity'),
  budget:$('reqBudget'),email:$('reqEmail'),phone:$('reqPhone'),message:$('reqMessage'),
  privacy:$('reqPrivacySeen'),offersConsent:$('reqMoreOffersConsent'),feedback:$('requestFeedback')
};
function requestMessage(channel){
  const f=requestFields;
  const name=f.name.value.trim(), email=f.email.value.trim(),phone=f.phone.value.trim();
  f.feedback.textContent='';
  if(!requestToggle.checked){f.feedback.textContent='Seleziona prima la casella per richiedere altre proposte immobiliari.';return null}
  if(name.length<2){f.feedback.textContent='Inserisci nome e cognome.';f.name.focus();return null}
  if(channel==='email'&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){
    f.feedback.textContent='Inserisci un indirizzo email valido per la risposta.';f.email.focus();return null
  }
  if(channel==='whatsapp'&&phone&&!/^\\+?[0-9 ()-]{8,25}$/.test(phone)){
    f.feedback.textContent='Controlla il numero di cellulare oppure lascia il campo vuoto.';f.phone.focus();return null
  }
  if(!f.privacy.checked){f.feedback.textContent='Leggi l’informativa privacy e conferma di averne preso visione.';f.privacy.focus();return null}
  const future=f.offersConsent.checked?
    'SÌ, chiedo di essere ricontattato in futuro per altre proposte immobiliari pertinenti (consenso facoltativo da verificare e registrare a cura dell’agenzia).':
    'NO, non autorizzo comunicazioni periodiche o ulteriori proposte non richieste.';
  return 'RICHIESTA DI ALTRE PROPOSTE IMMOBILIARI - IMMOBILIARE LA SACRA'+
    '\nReferente: Malafronte Joseph, 371 370 8294'+
    '\nNome: '+name+'\nTipo di richiesta: '+f.material.value+
    '\nTipologia di immobile: '+f.type.value+
    '\nZona di interesse: '+(f.city.value.trim()||'Da definire')+
    '\nBudget massimo: '+f.budget.value+
    (email?'\nEmail per risposta: '+email:'')+(phone?'\nCellulare per risposta: '+phone:'')+
    (f.message.value.trim()?'\nUlteriori preferenze: '+f.message.value.trim():'')+
    '\n\\nConsenso per comunicazioni future: '+future+
    '\nHo letto l’informativa privacy relativa alla richiesta immobiliare (catalogo-premium/privacy-richiesta.html).'+
    '\nIl presente messaggio non costituisce registrazione automatica a un servizio di invio.';
}
$('requestByWhatsApp').addEventListener('click',()=>{
  const msg=requestMessage('whatsapp');if(!msg)return;
  const url='https://wa.me/393713708294?text='+encodeURIComponent(msg);
  $('requestFeedback').textContent='WhatsApp aperto con la richiesta: per trasmetterla premi Invia. Nessun invio automatico.';
  window.open(url,'_blank','noopener,noreferrer');
});
$('requestByEmail').addEventListener('click',()=>{
  const msg=requestMessage('email');if(!msg)return;
  const href='mailto:immobiliarelasacra@gmail.com?subject='+encodeURIComponent('Richiesta altre proposte immobiliari — La Sacra')+'&body='+encodeURIComponent(msg);
  $('requestFeedback').textContent='Email predisposta: per trasmetterla premi Invia nel programma di posta.';
  window.location.href=href;
});
load();
})();