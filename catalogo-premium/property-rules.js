/* Immobiliare La Sacra · public catalogue eligibility and display metadata.
 * Shared by the website, PDF builder, Studio Premium and CI.
 * No guessed addresses, surface areas, rooms or APE values.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.LaSacraRules=api;
})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
  'use strict';
  // Explicit editorial whitelist: Valle di Susa, Turin city and approved western belt.
  // Towns outside this list are never inferred or admitted automatically.
  const ALLOWED_TOWN_IDS=new Set([
    'avigliana','sant-ambrogio-di-torino','almese','condove','villar-dora',
    'caprie','chiusa-di-san-michele','vaie','sant-antonino-di-susa',
    'borgone-susa','villarfocchiardo','villar-focchiardo','san-didero',
    'bussoleno','chianocco','susa','mompantero','san-giorio-di-susa',
    'venaus','giaglione','gravere','exilles','salbertrand','oulx',
    'sauze-d-oulx','cesana-torinese','claviere','novalesa','moncenisio',
    'pragelato','bardonecchia','chiomonte','rubiana','valgioie',
    'torino','rivoli','rosta','alpignano','collegno','grugliasco',
    'buttigliera-alta','giaveno'
  ]);
  const OFFICIAL_HOSTS=new Set(['lasacraimmobiliare.it','www.lasacraimmobiliare.it']);
  const BAD_TITLE=/^(?:da verificare|immobile|proposta|senza titolo|non disponibile|titolo da inserire)$/i;
  const EXCLUDED_TITLE=/\b(?:terren[oi]|magazzin[oi]|capannon[ei]|negozi[oi]|attivit[aà]|cessione\s+d['’]attivit[aà]|bar|ristorant[ei]|tabacch[ei]|uffic[io]|commercial[ei]|artigianal[ei]|laboratori[oi]|deposit[oi]|chalet|casett[ae]\s+in\s+legno|struttur[ae]\s+(?:temporane[ae]|precarie?|in\s+legno)|prefabbricat[oi]|camping|campegg[io]|garage\s+singol[oi])\b/i;
  // A marketing image labelled "in trattativa" contradicts AVAILABLE in the feed.
  // Fail closed instead of promoting a potentially unavailable listing.
  const UNAVAILABLE_MARKER=/in[-_ ]trattativa|vendut[oa]|gi[aà][-_ ]vendut[oa]|non[-_ ]disponibile/i;
  const POSITIVE_TYPE=/\b(?:appartament[oi]|allogg[io]|bilocal[ei]|trilocal[ei]|quadrilocal[ei]|monolocal[ei]|[23456]\s+locali|due\s+locali|tre\s+locali|quattro\s+locali|cas[ae]|ville?|villa|bifamiliar[ei]|semindipendent[ei]|indipendent[ei]|attic[oi]|rustic[oi]|porzione\s+di\s+villa|mansard[ae]|piano\s+terra)\b/i;
  const trim=value=>typeof value==='string'?value.trim():'';
  function originalUrl(value){
    return /^https:\/\/(?:www\.)?lasacraimmobiliare\.it\/products\/[a-z0-9-]+\/?$/.test(trim(value));
  }
  function hasVerifiedApe(p){
    if(!p)return false;
    if(p.apeStatus==='PRESENTE')
      return p.apeVerified===true&&/^(A[1-4]|[B-G])$/.test(trim(p.energyClass)) &&
        Number.isFinite(Number(p.epglNren))&&Number(p.epglNren)>=0;
    return p.apeStatus==='ESENTE'&&p.exemptionVerified===true&&trim(p.exemptionReason).length>5;
  }
  function isEligible(p,options){
    if(!p||p.category!=='Residenziale'||p.availability_status!=='AVAILABLE')return false;
    if(!originalUrl(p.url)||!trim(p.image).startsWith('https://'))return false;
    if(UNAVAILABLE_MARKER.test(trim(p.image))||UNAVAILABLE_MARKER.test(trim(p.title)))return false;
    if(p.location_status!=='VERIFICATO_FONTE'||!trim(p.municipality)||!ALLOWED_TOWN_IDS.has(trim(p.town_id)))return false;
    const title=trim(p.title),fallback=trim(p.description).slice(0,500);
    const generic=!title||BAD_TITLE.test(title);
    if(EXCLUDED_TITLE.test(title)||generic&&EXCLUDED_TITLE.test(fallback))return false;
    if(!POSITIVE_TYPE.test(generic?fallback:title))return false;
    // Rustico is allowed only if the source expressly describes it as habitable.
    if(/\brustic[oi]\b/i.test(title)&&!/\b(?:abitabil[ei]|ristrutturat[oi]|uso\s+abitativo|residenzial[ei])\b/i.test(title+' '+trim(p.description)))return false;
    if(options&&options.onlyVerified&&!hasVerifiedApe(p))return false;
    return true;
  }
  const normalize=s=>trim(s).toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,"'");
  function roomCount(p){
    if(Number.isInteger(Number(p.rooms))&&Number(p.rooms)>=1&&Number(p.rooms)<=15)return Number(p.rooms);
    const title=normalize(p.title);
    const candidates=[title,normalize(p.description).slice(0,160)];
    for(const value of candidates){
      if(/\bmonolocal[ei]\b/.test(value))return 1;
      if(/\bbilocal[ei]\b|\bdue\s+locali\b/.test(value))return 2;
      if(/\btrilocal[ei]\b|\btre\s+locali\b/.test(value))return 3;
      if(/\bquadrilocal[ei]\b|\bquattro\s+locali\b/.test(value))return 4;
      const m=value.match(/\b([1-9])\s+locali\b/);
      if(m)return Number(m[1]);
    }
    return null;
  }
  function typeName(p){
    const t=normalize(p.title)||normalize(p.description).slice(0,320);
    if(/\bporzione\s+di\s+villa\b/.test(t))return 'Porzione di villa';
    if(/\bvilla\b/.test(t))return 'Villa';
    if(/\bsemindipendente\b/.test(t))return 'Casa semindipendente';
    if(/\bcasa\s+indipendente\b|\bindipendente\b/.test(t))return 'Casa indipendente';
    if(/\bbifamiliare\b|\bbifamigliare\b/.test(t))return 'Abitazione in bifamiliare';
    if(/\brustico\b/.test(t))return 'Rustico abitabile';
    if(/\battico\b/.test(t))return 'Attico';
    const n=roomCount(p);
    if(n===1)return 'Monolocale';
    if(n===2)return 'Bilocale';
    if(n===3)return 'Trilocale';
    if(n===4)return 'Quadrilocale';
    if(/\bmansarda\b/.test(t))return 'Appartamento';
    if(/\bappartamento\b|\balloggio\b|\bpiano terra\b/.test(t))return 'Appartamento';
    return 'Abitazione';
  }
  const FEATURES=[
    ['giardino privato',/\bgiardino\s+(?:privato|esclusivo)\b/i],
    ['terrazzo',/\bterrazz[oi]\b/i],
    ['giardino',/\bgiardin[oi]\b/i],
    ['box doppio',/\bbox\s+doppio\b/i],
    ['box auto',/\bbox(?:\s+auto)?\b/i],
    ['balcone',/\bbalcon[ei]\b/i],
    ['cortile privato',/\bcortile\s+privato\b/i],
    ['mansarda',/\bmansard[ae]\b/i],
    ['ascensore',/\bascensor[ei]\b/i],
    ['posto auto',/\bposto\s+auto\b/i],
    ['ristrutturato',/\bristrutturat[oaie]\b/i],
    ['piscina',/\bpiscin[ae]\b/i],
    ['cantina',/\bcantin[ae]\b/i]
  ];
  function findFeatures(p){
    const snippets=[trim(p.title),trim(p.description).slice(0,1600)];
    const results=[];
    for(const [label,re] of FEATURES){
      if(results.some(x=>x===label||label==='giardino'&&x==='giardino privato'||label==='box auto'&&x==='box doppio'))continue;
      for(const snippet of snippets){
        const m=re.exec(snippet);
        if(!m)continue;
        const preceding=normalize(snippet.slice(Math.max(0,m.index-19),m.index));
        // Avoid tagging amenities expressly excluded by the listing.
        if(/(?:senza|privo\s+di|non\s+ha|non\s+dispone\s+di)\s*$/.test(preceding))continue;
        results.push(label);
        break;
      }
    }
    return results.slice(0,2);
  }
  function displayTitle(p){
    const type=typeName(p);
    const features=findFeatures(p);
    if(features.length)return type+' con '+features[0];
    // No invented feature or room count when source lacks them.
    return type;
  }
  function displayData(p){
    const n=roomCount(p),area=Number(p.surface);
    return {
      title:displayTitle(p),
      type:typeName(p),
      locality:trim(p.municipality),
      surface:Number.isFinite(area)&&area>=15&&area<=2000?Math.round(area)+' m²':'Superficie n.d.',
      rooms:n?n+' locali':'Locali n.d.',
      features:findFeatures(p),
      ape:hasVerifiedApe(p)?(p.apeStatus==='ESENTE'?'APE esente':'Classe '+trim(p.energyClass)):'APE da verificare',
      apeVerified:hasVerifiedApe(p)
    };
  }
  function filterListings(items,options){
    const ids=options&&options.ids?new Set(options.ids.map(String)):null;
    const arr=(Array.isArray(items)?items:[]).filter(p=>isEligible(p,options)&&(!ids||ids.has(String(p.id))));
    if(ids){
      const order=[...ids];arr.sort((a,b)=>order.indexOf(String(a.id))-order.indexOf(String(b.id)));
    }else arr.sort((a,b)=>a.municipality.localeCompare(b.municipality,'it')||a.title.localeCompare(b.title,'it'));
    return arr;
  }
  return {ALLOWED_TOWN_IDS,originalUrl,hasVerifiedApe,isEligible,filterListings,displayData,displayTitle,roomCount,typeName,findFeatures};
});
