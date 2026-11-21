/* Acquisizione · normalizzazione locale foto/appunti in schede cliente.
 * Non invia dati al server; i dati estratti sono bozze finché confermati.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.CASE247ContactNormalizer=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const ACTIONS=['Nessuna','Lettera informativa preparata','Lettera consegnata','Biglietto consegnato','Risposta spontanea','Incontro'];
 const STATUSES=['Nuovo','Contattato','Qualificato','Appuntamento','Pausa','Scartato'];
 const SOURCES=['Annuncio pubblico','Contatto spontaneo','Incontro professionale','Osservazione territoriale','Altro','Foto appunti'];
 const HEADERS=['Data','Comune','Zona / microzona','Indirizzo / civico','Cliente / immobile','Fonte','Stato','Azione','Data richiamo','Ora richiamo','Note verificate'];
 function stripRecapiti(v){
  return String(v??'')
   .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu,'[email omessa]')
   .replace(/(?:\+?\d[\s().-]*){7,}/g,'[recapito omesso]');
 }
 function clean(v,max=500){return stripRecapiti(v).replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').trim().slice(0,max);}
 function matchDate(v){
  const s=String(v??'').trim(),short=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  const iso=short?short[3]+'-'+short[2].padStart(2,'0')+'-'+short[1].padStart(2,'0'):s;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return '';
  const dt=new Date(iso+'T12:00:00Z');
  return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===iso?iso:'';
 }
 function key(v){return String(v??'').trim().toLocaleLowerCase('it').replace(/\s+/g,' ');}
 function normalizeContact(raw,defaults={}){
  const s=(name,max=120)=>clean(raw?.[name]??defaults[name]??'',max);
  const date=matchDate(raw?.date??defaults.date);
  return {
   date,comune:s('comune',80)||'Avigliana',zone:s('zone',110)||'Da verificare',
   address:s('address',140),name:s('name',120),source:s('source',110)||'Foto appunti',
   status:STATUSES.includes(raw?.status)?raw.status:'Nuovo',
   action:ACTIONS.includes(raw?.action)?raw.action:'Nessuna',
   followDate:matchDate(raw?.followDate),followTime:/^\d{2}:\d{2}$/.test(raw?.followTime||'')?raw.followTime:'',
   notes:s('notes',650)
  };
 }
 function fingerprint(x){
  return [key(x.date),key(x.comune||'Avigliana'),key(x.address),key(x.name),key(x.source)].join('|');
 }
 const STREET=/\b(?:via|viale|corso|piazza|piazzale|vicolo|strada|borgata|borgo|frazione|località|localita|largo|lungo|lungomare)\b[^\n;|]{2,105}/iu;
 const CITY=/\b(Avigliana|Almese|Condove|Sant['’]Ambrogio(?: di Torino)?|Rivoli|Susa|Villar Dora|Villadora|Rubiana|Caprie|Chiusa di San Michele|Vaie|Bussoleno|Rosta|Buttigliera Alta|Collegno|Torino|Bardonecchia|Oulx)\b/iu;
 function extractAddress(line){
  const found=line.match(STREET);
  if(!found)return '';
  let str=found[0];
  str=str.split(/\s+(?:cliente|proprietario|immobile|notizia|nota|note|lettera|incontro|consegnato|consegnata|esito|contatto)\s*[:=-]/iu)[0];
  str=str.split(/\s*[,;|]\s*/u)[0].split(/\s+[-–—]\s+/u)[0];
  str=str.replace(/\s+(?:Avigliana|Almese|Condove|Susa|Torino|Rivoli)\s*$/iu,'').trim();
  return clean(str.replace(/[,.:]+$/u,''),130);
 }
 function extractLabel(block,label){
  const pattern=new RegExp('(?:^|\\n)\\s*(?:'+label+')\\s*[:=]\\s*([^\\n;|]+)','iu');
  return (block.match(pattern)||[])[1]?.trim()||'';
 }
 function fromText(text,defaultDay){
  const raw=String(text||'').slice(0,20000);
  const lines=raw.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
  const groups=[];
  const globalDay=(raw.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]20\d{2}\b|\b20\d{2}-\d{2}-\d{2}\b/u)||[])[0];
  const date=matchDate(globalDay)||matchDate(defaultDay);
  let current=null;
  for(const line of lines){
   const address=extractAddress(line);
   if(address){
    current={address,lines:[line]};
    groups.push(current);
   }else if(current){
    current.lines.push(line);
   }
  }
  if(!groups.length)groups.push({address:'',lines});
  return groups.slice(0,80).map(g=>{
   const segment=g.lines.join('\n');
   const city=(segment.match(CITY)||raw.match(CITY)||[])[0]||'Avigliana';
   const labeled=extractLabel(segment,'cliente|proprietario|riferimento|immobile');
   const zone=extractLabel(segment,'zona|microzona');
   const source=extractLabel(segment,'fonte');
   const notes=clean(segment,650);
   // Esito e qualità non vengono dedotti automaticamente dal testo OCR.
   // L'utente deve confermarli esplicitamente nella tabella prima di salvare.
   return normalizeContact({
    date,comune:city,zone:zone||'Da verificare',address:g.address,
    name:labeled,source:source||'Foto appunti',status:'Nuovo',action:'Nessuna',notes
   });
  });
 }
 function csvCell(value){
  let s=clean(value,650);
  if(/^[=+\-@\t\r]/u.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 }
 function csv(contacts){
  const all=[HEADERS,...contacts.map(x=>[
    x.date,x.comune||'Avigliana',x.zone,x.address,x.name,x.source,x.status,x.action,
    x.followDate,x.followTime,x.notes
  ])];
  return '\ufeff'+all.map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
 }
 return {ACTIONS,STATUSES,SOURCES,HEADERS,stripRecapiti,clean,matchDate,normalizeContact,
  fingerprint,extractAddress,fromText,csv};
});
