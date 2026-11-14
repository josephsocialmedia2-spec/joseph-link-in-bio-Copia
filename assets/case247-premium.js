/* CASE247 Premium Network — public pages, no consent storage or background dispatch. */
(() => {
"use strict";
const ROOT="/joseph-link-in-bio-Copia/";
const HOST="https://josephsocialmedia2-spec.github.io";
const WA="https://wa.me/393462568685?text=";
const body=document.body, page=body.dataset.cpPage||"home", townId=body.dataset.cpTown||"";
const $=id=>document.getElementById(id);
const euro=new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0});
const local=(item)=>item && item.location_status==="VERIFICATO_FONTE" && !!item.town_id;
const available=(item)=>item.availability_status==="AVAILABLE"&&!/vendut[oa]|trattativa|sospes[oa]|ritirat[oa]/i.test(String(item.title||""));
const goodImg=(u)=>{try{const p=new URL(u);return p.protocol==="https:" && ["cdn.shopify.com","lasacraimmobiliare.it"].some(h=>p.hostname===h||p.hostname.endsWith("."+h))}catch{return false}};
const goodLink=(u)=>{try{const p=new URL(u);return p.protocol==="https:"&&p.hostname==="lasacraimmobiliare.it"&&p.pathname.startsWith("/products/")}catch{return false}};
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const label=(name)=>name||"Territorio";
const money=(v)=>typeof v==="number"&&v>0?euro.format(v):"Prezzo su richiesta";
const urlTown=(id)=>ROOT+"paesi/"+encodeURIComponent(id)+"/";
function setupWa(townName){
  document.querySelectorAll("[data-cp-wa-sell]").forEach(a=>{
    const suffix=townName?" nel comune di "+townName:"";
    a.href=WA+encodeURIComponent("Buongiorno, sono interessato a promuovere un immobile"+suffix+". Vorrei informazioni sui servizi di vendita e promozione immobiliare.");
    a.target="_blank";a.rel="noopener noreferrer";
  });
}
function townCard(t){
  const a=make("a","cp-town-card");a.href=urlTown(t.id);
  a.append(make("small","","PAGINA TERRITORIALE"));
  a.append(make("b","",label(t.name)));
  a.append(make("span","","Scopri il servizio →"));
  return a;
}
function renderTowns(towns){
 const grid=$("cp-town-grid");if(!grid)return;
 const search=$("cp-town-search");
 const count=$("cp-town-count");
 function draw(){
  const needle=String(search?.value||"").toLocaleLowerCase("it-IT").trim();
  const filtered=towns.filter(t=>t.name.toLocaleLowerCase("it-IT").includes(needle)||t.id.includes(needle));
  grid.replaceChildren();
  filtered.forEach(t=>grid.append(townCard(t)));
  if(!filtered.length)grid.append(make("div","cp-empty","Nessun comune corrisponde alla ricerca."));
  if(count)count.textContent=filtered.length+" territori";
 }
 if(search)search.addEventListener("input",draw);
 draw();
}
function propertyCard(it){
 const card=make("article","cp-property");
 const photo=make("a","cp-property-photo");photo.href=it.url;photo.target="_blank";photo.rel="noopener noreferrer";photo.setAttribute("aria-label","Apri la scheda immobile sul sito di La Sacra Immobiliare");
 if(goodImg(it.image)){
  const img=make("img");img.src=it.image;img.loading="lazy";img.decoding="async";img.alt="Fotografia dell'immobile "+it.title;img.onerror=()=>{img.remove();photo.append(make("span","cp-empty","Fotografia disponibile nella scheda del partner."));};
  photo.append(img);
 }else{photo.append(make("span","cp-empty","Immagine consultabile sulla scheda ufficiale."));}
 const info=make("div","cp-property-body");
 const meta=make("div","cp-property-meta");
 meta.append(make("span","",it.municipality||"Località da confermare"),make("span","","La Sacra Immobiliare"));
 const title=make("h3","",it.title);
 const price=make("div","cp-property-price",money(it.price));
 const link=make("a","cp-property-cta","Esplora la scheda originale →");
 link.href=it.url;link.target="_blank";link.rel="noopener noreferrer";
 info.append(meta,title,price,link);card.append(photo,info);return card;
}
function renderProperties(items,stamp){
 const grid=$("cp-feature-grid");if(!grid)return;
 const localItems=items.filter(it=>local(it)&&available(it)&&goodLink(it.url));
 const shown=page==="town"?localItems.filter(it=>it.town_id===townId):localItems;
 shown.sort((a,b)=>String(b.published_at||"").localeCompare(String(a.published_at||"")));
 const take=page==="town"?6:6;
 grid.replaceChildren();
 for(const item of shown.slice(0,take))grid.append(propertyCard(item));
 if(!shown.length){
   grid.append(make("div","cp-empty",page==="town"?
     "Al momento non risultano immobili con località verificata associati a questo comune nel catalogo disponibile. Puoi comunque richiedere informazioni o proporre il tuo immobile per la promozione.":
     "Nessun annuncio con località verificata è disponibile nel catalogo consultato. Apri il catalogo completo del partner."));
 }
 const cnt=$("cp-feature-count");if(cnt)cnt.textContent=shown.length===1?"1 immobile associato al territorio":shown.length+" immobili associati al territorio";
 const upd=$("cp-catalog-updated");
 if(upd){const date=new Date(stamp);upd.textContent=Number.isNaN(date.getTime())?"Fonte: catalogo La Sacra Immobiliare":"Ultimo aggiornamento catalogo: "+date.toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric",timeZone:"Europe/Rome"});}
}
async function init(){
 const name=body.dataset.cpTownName||"";
 setupWa(page==="town"?name:"");
 const requests=[];
 if(false && $("cp-town-grid"))requests.push(fetch(ROOT+"config/case247-territorio.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Errore territori");return r.json()}).then(data=>renderTowns(Array.isArray(data.towns)?data.towns:[])).catch(()=>{const grid=$("cp-town-grid");grid?.replaceChildren(make("div","cp-empty","Elenco territoriale momentaneamente non disponibile. Consulta la pagina Paesi dal menu."))}));
 if($("cp-feature-grid"))requests.push(fetch(ROOT+"immobili/catalogo.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("Errore catalogo");return r.json()}).then(data=>renderProperties(Array.isArray(data.items)?data.items:[],data.last_success_at)).catch(()=>{const grid=$("cp-feature-grid");grid?.replaceChildren(make("div","cp-empty","Catalogo momentaneamente non disponibile. Consulta gli annunci sul sito La Sacra Immobiliare."));}));
 await Promise.all(requests);
}

if(page==="town"){
 const target=document.getElementById("promozione");
 if(target&&!document.getElementById("partner"))target.insertAdjacentHTML("beforebegin", "<section class=\"cp-partner-band\" id=\"partner\" aria-labelledby=\"partner-title\"><div class=\"cp-wrap\"><div class=\"cp-partner-grid\"><div class=\"cp-partner-copy\"><div class=\"cp-partner-tag\">Immobiliare La Sacra · riferimento immobiliare</div><div class=\"cp-partner-logo\"><img src=\"https://lasacraimmobiliare.it/cdn/shop/files/Untitled_design_14.png?height=108&amp;v=1766316153\" alt=\"Logo ufficiale La Sacra Immobiliare\" loading=\"lazy\"></div><h2 id=\"partner-title\">La Sacra Immobiliare.</h2><p>Immobiliare La Sacra gestisce attraverso i propri professionisti abilitati annunci, visite, compravendite, locazioni e trattative. Immobiliare La Sacra è il servizio di marketing e pubblicità immobiliare dedicato alla promozione degli immobili.</p><a class=\"cp-btn cp-btn-dark\" href=\"https://lasacraimmobiliare.it/\" target=\"_blank\" rel=\"noopener noreferrer\">Vai al sito immobiliare →</a></div><a class=\"cp-partner-photo\" href=\"https://lasacraimmobiliare.it/\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"Apri il sito ufficiale La Sacra Immobiliare\"><img src=\"https://cdn.shopify.com/s/files/1/0940/8662/7655/files/IMG_5606.jpg?v=1791272576\" alt=\"Immobile dal catalogo La Sacra Immobiliare\" loading=\"lazy\"><strong>Scopri il catalogo La Sacra →</strong></a></div></div></section>");
 document.querySelectorAll(".cp-hero-mini b").forEach(node=>{if(node.textContent==="41")node.textContent="42"});
 document.querySelectorAll(".cp-footer-links a").forEach(node=>{if(node.textContent.includes("41 territori"))node.textContent=node.textContent.replace("41 territori","42 territori")});
 document.body.insertAdjacentHTML("beforeend", "<a class=\"cp-mobile-action\" data-cp-wa-sell href=\"https://wa.me/393462568685\" target=\"_blank\" rel=\"noopener noreferrer\">PROMUOVI IL TUO IMMOBILE →</a>");
}
init();
})();