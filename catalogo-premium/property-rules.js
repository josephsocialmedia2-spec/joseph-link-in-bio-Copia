/* La Sacra · Shared source-based catalogue, Studio and PDF rules.
 * NO implicit exclusions by category, town, incomplete metadata or file names.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.LaSacraRules=api;
})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
 'use strict';
 const trim=x=>typeof x==='string'?x.trim():'';
 const fold=x=>trim(x).toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,"'");
 const originalUrl=url=>/^https:\/\/(?:www\.)?lasacraimmobiliare\.it\/products\/[a-z0-9-]+\/?(?:\?[^#]*)?$/i.test(trim(url));
 const BAD_TITLE=/^(?:da verificare|immobile|proposta|senza titolo|titolo da inserire)$/i;
 const NO_PHOTO=/(?:planimetr|floor.?plan|piantina|agent[ei]|staff|team|ritratt|portrait|logo|qr[_-]?code|brochure)/i;
 const TOWNS={
   avigliana:'Avigliana',almese:'Almese',condove:'Condove',caprie:'Caprie',
   'sant-ambrogio-di-torino':'Sant’Ambrogio di Torino',
   'sant-antonino-di-susa':'Sant’Antonino di Susa',
   'villar-dora':'Villar Dora',rivoli:'Rivoli',torino:'Torino',
   collegno:'Collegno',grugliasco:'Grugliasco',
   'borgaro-torinese':'Borgaro Torinese',moncalieri:'Moncalieri',
   alpignano:'Alpignano',rosta:'Rosta','chiusa-di-san-michele':'Chiusa di San Michele',
   vaie:'Vaie','borgone-susa':'Borgone Susa',susa:'Susa',bussoleno:'Bussoleno',
   'san-didero':'San Didero','villar-focchiardo':'Villar Focchiardo',
   rubiana:'Rubiana',giaveno:'Giaveno',valgioie:'Valgioie',
   'buttigliera-alta':'Buttigliera Alta',bardonecchia:'Bardonecchia',
   oulx:'Oulx',exilles:'Exilles',gravere:'Gravere',
   'sauze-d-oulx':"Sauze d'Oulx",'cesana-torinese':'Cesana Torinese',
   chiomonte:'Chiomonte',pragelato:'Pragelato',venaus:'Venaus',
   giaglione:'Giaglione',mompantero:'Mompantero',salbertrand:'Salbertrand'
 };
 function municipalityOf(p){
   if(trim(p?.municipality))return trim(p.municipality);
   if(TOWNS[p?.town_id])return TOWNS[p.town_id];
   const mentions=(p?.town_mentions||[]).filter(x=>TOWNS[x]);
   if(new Set(mentions).size===1)return TOWNS[mentions[0]];
   const t=fold(p?.title);
   const matching=Object.entries(TOWNS).filter(([id,name])=>{
     return [fold(name),id.replace(/-/g,' ')].some(x=>x.length>4&&t.includes(x));
   });
   return matching.length===1?matching[0][1]:'';
 }
 function categoryOf(p){
   const raw=fold(p?.category),t=fold(p?.title)+' '+fold(p?.description).slice(0,150);
   if(/\bterren[oi]\b|\blotto edificabile\b/.test(t))return 'Terreno';
   if(raw==='impresa'||raw==='commerciale'||raw==='attivita')return 'Commerciale';
   if(/\b(?:attivita commerciale|bar|ristorante|negozio|tabacchi|magazzino|capannone|ufficio|locale commerciale)\b/.test(t))return 'Commerciale';
   if(raw==='residenziale')return 'Residenziale';
   if(/\b(?:appartamento|alloggio|trilocale|bilocale|quadrilocale|villa|casa|rustico|chalet)\b/.test(t))return 'Residenziale';
   return trim(p?.category)||'Altra categoria';
 }
 function statusOf(p){
   // Only agency-maintained explicit data; never infer from image name or description.
   const v=fold(p?.agency_status||p?.listing_status||p?.availability_status||p?.status);
   if(['sold','venduto','venduta'].includes(v))return 'Venduto';
   if(['in trattativa','in_trattativa','under_offer','pending','trattativa'].includes(v))return 'In trattativa';
   if(['available','disponibile','active','attivo'].includes(v))return 'Disponibile';
   return 'Stato da confermare';
 }
 function preferredImage(p){
   const sources=[...(Array.isArray(p?.images)?p.images:[]),...(Array.isArray(p?.gallery)?p.gallery:[]),p?.image];
   const urls=[...new Set(sources.map(x=>typeof x==='string'?x:trim(x?.src||x?.url)).filter(x=>/^https:\/\//i.test(x)))];
   return urls.find(x=>!NO_PHOTO.test(x.split('?')[0]))||urls[0]||'';
 }
 function hasVerifiedApe(p){
   if(p?.apeStatus==='PRESENTE')return p.apeVerified===true&&/^(A[1-4]|[B-G])$/.test(trim(p.energyClass))&&Number(p.epglNren)>=0;
   return p?.apeStatus==='ESENTE'&&p.exemptionVerified===true&&trim(p.exemptionReason).length>5;
 }
 function roomCount(p){
   const n=Number(p?.rooms);
   if(p?.rooms!==null&&p?.rooms!==undefined&&p?.rooms!==''&&Number.isInteger(n)&&n>=1&&n<=15)return n;
   for(const t of [fold(p?.title),fold(p?.description).slice(0,450)]){
     if(/\bmonolocal[ei]\b/.test(t))return 1;
     if(/\bbilocal[ei]\b|\bdue locali\b/.test(t))return 2;
     if(/\btrilocal[ei]\b|\btre locali\b/.test(t))return 3;
     if(/\bquadrilocal[ei]\b|\bquattro locali\b/.test(t))return 4;
     const m=t.match(/\b([1-9])\s+locali\b/);if(m)return Number(m[1]);
   }
   return null;
 }
 function typeName(p){
   const t=fold(p?.title)||fold(p?.description).slice(0,300);
   if(categoryOf(p)==='Terreno')return 'Terreno';
   if(/\bristorante\b/.test(t))return 'Ristorante';
   if(/\bbar\b/.test(t))return 'Bar';
   if(/\bnegozio\b/.test(t))return 'Negozio';
   if(/\bmagazzino\b/.test(t))return 'Magazzino';
   if(categoryOf(p)==='Commerciale')return 'Attività commerciale';
   if(/\bchalet\b/.test(t))return 'Chalet';
   if(/\bporzione di villa\b/.test(t))return 'Porzione di villa';
   if(/\bvilla\b/.test(t))return 'Villa';
   if(/\bsemindipendent[ei]\b/.test(t))return 'Casa semindipendente';
   if(/\bcasa indipendente\b|\bindipendente\b/.test(t))return 'Casa indipendente';
   if(/\bbifamiliar[ei]\b/.test(t))return 'Abitazione in bifamiliare';
   if(/\brustic[oi]\b/.test(t))return 'Rustico';
   if(/\battic[oi]\b/.test(t))return 'Attico';
   const n=roomCount(p);
   if(n===1)return 'Monolocale';if(n===2)return 'Bilocale';
   if(n===3)return 'Trilocale';if(n===4)return 'Quadrilocale';
   if(/\bappartament[oi]\b|\ballogg[io]\b|\bmansard[ae]\b/.test(t))return 'Appartamento';
   return 'Immobile';
 }
 const FEATURES=[['terrazzo',/\bterrazz[oi]\b/i],['giardino',/\bgiardin[oi]\b/i],['box auto',/\bbox(?: auto)?\b/i],['balcone',/\bbalcon[ei]\b/i],['cortile',/\bcortil[ei]\b/i],['mansarda',/\bmansard[ae]\b/i],['ascensore',/\bascensor[ei]\b/i],['posto auto',/\bposto auto\b/i],['piscina',/\bpiscin[ae]\b/i],['cantina',/\bcantin[ae]\b/i]];
 function findFeatures(p){
   const snippets=[trim(p?.title),trim(p?.description).slice(0,1300)],found=[];
   for(const [name,re] of FEATURES){
     if(found.length===2)break;
     for(const text of snippets){
       const m=re.exec(text);
       if(!m)continue;
       const prefix=fold(text.slice(Math.max(0,m.index-22),m.index));
       if(/(?:senza|privo di|non ha|non dispone di)\s*$/.test(prefix))continue;
       found.push(name);break;
     }
   }
   return found;
 }
 function displayTitle(p){
   const type=typeName(p),feature=findFeatures(p)[0];
   if(feature)return type+' con '+feature;
   if(/\bristrutturat[oaie]\b/i.test(trim(p?.title)+' '+trim(p?.description))){
     return type+' ristrutturat'+(/^(?:Casa|Villa|Porzione|Attività)/.test(type)?'a':'o');
   }
   if(type!=='Immobile')return type;
   const source=trim(p?.title);return source&&!BAD_TITLE.test(source)?source:'Immobile da descrivere';
 }
 function displayData(p){
   const area=Number(p?.surface),rooms=roomCount(p),town=municipalityOf(p);
   return {
     title:displayTitle(p),type:typeName(p),category:categoryOf(p),
     locality:town||'Comune da verificare',localityVerified:!!town&&p?.location_status==='VERIFICATO_FONTE',
     status:statusOf(p),image:preferredImage(p),
     surface:p?.surface!==null&&p?.surface!==undefined&&p?.surface!==''&&Number.isFinite(area)&&area>0?Math.round(area)+' m²':'Superficie n.d.',
     rooms:rooms?rooms+' locali':'Locali n.d.',features:findFeatures(p),
     ape:hasVerifiedApe(p)?(p.apeStatus==='ESENTE'?'APE esente':'Classe '+trim(p.energyClass)):'APE da verificare',
     apeVerified:hasVerifiedApe(p),needsReview:!town||!p?.surface||!rooms||!hasVerifiedApe(p)
   };
 }
 // All official product URLs remain visible unless explicitly filtered by a user.
 function filterListings(items,opts={}){
   const ids=opts.ids?.length?new Set(opts.ids.map(String)):null;
   const a=(Array.isArray(items)?items:[]).filter(p=>originalUrl(p?.url)&&
     (!ids||ids.has(String(p.id)))&&(!opts.category||categoryOf(p)===opts.category)&&
     (!opts.municipality||municipalityOf(p)===opts.municipality)&&
     (!opts.status||statusOf(p)===opts.status));
   if(ids){const order=[...ids];a.sort((x,y)=>order.indexOf(String(x.id))-order.indexOf(String(y.id)));}
   else a.sort((x,y)=>municipalityOf(x).localeCompare(municipalityOf(y),'it')||trim(x.title).localeCompare(trim(y.title),'it'));
   return a;
 }
 const isEligible=(p,opts)=>filterListings(p?[p]:[],opts).length===1;
 function facets(items){
   const valid=(Array.isArray(items)?items:[]).filter(p=>originalUrl(p?.url));
   return {
     categories:[...new Set(valid.map(categoryOf))].sort((a,b)=>a.localeCompare(b,'it')),
     municipalities:[...new Set(valid.map(p=>municipalityOf(p)||'Comune da verificare'))].sort((a,b)=>a.localeCompare(b,'it')),
     statuses:[...new Set(valid.map(statusOf))].sort((a,b)=>a.localeCompare(b,'it'))
   };
 }
 return {originalUrl,isEligible,filterListings,displayData,displayTitle,categoryOf,municipalityOf,statusOf,hasVerifiedApe,preferredImage,typeName,findFeatures,roomCount,facets};
});
