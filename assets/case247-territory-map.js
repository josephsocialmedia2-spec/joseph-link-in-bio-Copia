/* CASE247 - Geographic municipality portal powered by OpenStreetMap + verified partner catalogue.
   Counts indicate listings with source-confirmed municipality and AVAILABLE status.
   Zero means zero linked to this catalogue, not zero in the local market.
*/
(()=>{
"use strict";
const ROOT="/joseph-link-in-bio-Copia/";
const $=id=>document.getElementById(id);
const grid=$("cp-town-grid"),mapTarget=$("cp-territory-map");
if(!grid)return;
const search=$("cp-town-search"), filter=$("cp-town-filter"),status=$("cp-town-count"),mapStatus=$("cp-map-status");
const townLink=id=>ROOT+"paesi/"+encodeURIComponent(id)+"/";
const isAvailable=it=>it&&it.availability_status==="AVAILABLE"&&it.location_status==="VERIFICATO_FONTE"&&
  !!it.town_id&&!/vendut[oa]|trattativa|sospes[oa]|ritirat[oa]/i.test(String(it.title||""))&&
  /^https:\/\/lasacraimmobiliare\.it\/products\//.test(String(it.url||""));
const elt=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
let towns=[], counts=new Map(), map=null, markers=new Map();
function card(t){
 const n=counts.get(t.id)||0, a=elt("a","cp-town-card cp-town-card-count");
 a.href=townLink(t.id); a.setAttribute("aria-label",t.name+": "+n+" immobili nel catalogo. Apri la pagina comunale");
 const top=elt("div","cp-town-card-top"),name=elt("b","",t.name),counter=elt("span","cp-town-count-bubble",String(n));
 top.append(name,counter);
 a.append(top,elt("span","cp-town-count-label",n===1?"1 immobile nel catalogo":n+" immobili nel catalogo"),elt("span","cp-town-open","Apri pagina "+t.name+" →"));
 return a;
}
function getFiltered(){
 const needle=String(search?.value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const selection=filter?.value||"all";
 return towns.filter(t=>{
 const name=t.name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const n=counts.get(t.id)||0;
 return (!needle||name.includes(needle)||t.id.includes(needle)) &&
 (selection==="all"||(selection==="with"&&n>0)||(selection==="empty"&&n===0));
 });
}
function redraw(){
 const list=getFiltered();
 grid.replaceChildren();
 for(const t of list)grid.append(card(t));
 if(!list.length)grid.append(elt("p","cp-empty","Nessun comune trovato: cambia il filtro o la ricerca."));
 if(status)status.textContent=list.length+" comuni · "+list.reduce((sum,t)=>sum+(counts.get(t.id)||0),0)+" immobili geolocalizzati nel catalogo";
 if(!map)return;
 const show=new Set(list.map(t=>t.id));
 for(const [id,marker] of markers){if(show.has(id)&&!map.hasLayer(marker))marker.addTo(map);if(!show.has(id)&&map.hasLayer(marker))map.removeLayer(marker);}
 if(list.length && list.length<towns.length){
 const pts=list.map(t=>markers.get(t.id)).filter(Boolean).map(m=>m.getLatLng());
 if(pts.length){const bounds=window.L.latLngBounds(pts);map.fitBounds(bounds.pad(.18),{maxZoom:12,padding:[28,28],animate:false});}
 }
}
async function init(){
 let result;
 try {
 const responses=await Promise.all([
  fetch(ROOT+"config/case247-territorio.json",{cache:"no-store"}),
  fetch(ROOT+"config/case247-geo-verified.json",{cache:"no-store"}),
  fetch(ROOT+"immobili/catalogo.json",{cache:"no-store"})
 ]);
 if(responses.some(r=>!r.ok))throw Error("Una fonte dati non è disponibile");
 result=await Promise.all(responses.map(r=>r.json()));
 }catch(e){
 grid.replaceChildren(elt("p","cp-empty","I conteggi aggiornati non sono disponibili in questo momento. Riprova più tardi o consulta la directory dei territori."));
 if(mapStatus)mapStatus.textContent="Catalogo non raggiungibile: nessun conteggio viene stimato.";
 if(status)status.textContent="Conteggi non disponibili";
 return;
 }
 const [townData,geodata,catalogue]=result;
 towns=(townData.towns||[]).filter(t=>t&&t.id&&t.name);
 for(const t of towns)counts.set(t.id,0);
 for(const it of catalogue.items||[])if(isAvailable(it)&&counts.has(it.town_id))counts.set(it.town_id,counts.get(it.town_id)+1);
 if(search)search.addEventListener("input",redraw);
 if(filter)filter.addEventListener("change",redraw);
 if(mapTarget){
  if(!window.L){mapTarget.classList.add("cp-map-unavailable");mapTarget.textContent="La mappa non è caricabile con questa connessione. Puoi comunque selezionare un comune nelle schede sottostanti."; if(mapStatus)mapStatus.textContent="Mappa temporaneamente non disponibile. La ricerca e i collegamenti ai comuni restano attivi.";}
  else{
   try{
    const L=window.L;
    map=L.map(mapTarget,{scrollWheelZoom:false,zoomControl:false,tap:true,keyboard:true,preferCanvas:true});
    L.control.zoom({position:"bottomright"}).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom:17,minZoom:7
    }).addTo(map);
    const locs=[];
    for(const t of towns){
      const place=geodata.towns?.[t.id];
      if(!place||!Number.isFinite(Number(place.lat))||!Number.isFinite(Number(place.lon)))continue;
      const n=counts.get(t.id)||0;
      const p=L.latLng(Number(place.lat),Number(place.lon));locs.push(p);
      const icon=L.divIcon({
       html:'<span class="cp-map-marker'+(n===0?' cp-map-marker-empty':'')+'">'+String(n)+'</span>',
       className:"cp-map-icon",iconSize:[44,44],iconAnchor:[22,22]
      });
      const m=L.marker(p,{icon,keyboard:true,title:t.name+" · "+n+" immobili nel catalogo",alt:t.name+" "+n+" immobili"});
      const tip=elt("span");tip.textContent=t.name+" · "+n+(n===1?" immobile":" immobili");
      m.bindTooltip(tip.textContent,{direction:"top",offset:[0,-20],opacity:.98});
      m.on("click",()=>{window.location.href=townLink(t.id)});
      markers.set(t.id,m);m.addTo(map);
    }
    if(locs.length)map.fitBounds(L.latLngBounds(locs).pad(.1),{maxZoom:11,padding:[28,28],animate:false});
    if(mapStatus)mapStatus.textContent=towns.length+" comuni sulla mappa · Tocca un numero per aprire la pagina locale. Conteggio riferito esclusivamente al catalogo La Sacra.";
   }catch(err){
     if(map)map.remove();map=null;mapTarget.textContent="Mappa non disponibile in questo momento. Usa la ricerca e l'elenco dei comuni qui sotto.";
   }
  }
 }
 redraw();
 const stamp=$("cp-territory-updated");if(stamp&&catalogue.last_success_at){
 const date=new Date(catalogue.last_success_at);
 if(!Number.isNaN(date.getTime()))stamp.textContent="Ultimo aggiornamento catalogo: "+date.toLocaleDateString("it-IT",{dateStyle:"long",timeZone:"Europe/Rome"})+". I dati possono cambiare; verifica disponibilità e prezzo sul sito del partner.";
 }
}
init();
})();