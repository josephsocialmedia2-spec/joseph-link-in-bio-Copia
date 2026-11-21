/* CASE247 - Solo risultati conseguiti nel farming, CSV locale privo di telefoni.
 * Origine dati: storico locale + scheda Notizie & Contatti nello stesso browser.
 * Non trasferisce alcun dato a GitHub o server remoti.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.CASE247FarmingResults=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const HEADERS=['Data risultato','Comune','Zona / microzona','Via e civico',
    'Cliente / immobile (riferimento)','Volantini consegnati','Lettere consegnate',
    'Notizie verificate','Risposte ricevute','Incontri svolti',
    'Risultato concreto raggiunto','Fonte / note verificabili'];
  function plain(v,max=150){
    let s=String(v??'').replace(/[\r\n\t;]/g,' ').trim();
    // Rimuove sequenze riconoscibili come recapiti telefonici, anche con spazi.
    s=s.replace(/(?:\+?\d[\s().-]*){8,}/g,'[recapito omesso]');
    if(/^[=+\-@]/.test(s))s="'"+s;
    return s.slice(0,max);
  }
  function date(v){
    const s=String(v??'');
    return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';
  }
  function norm(v){return String(v??'').trim().toLocaleLowerCase('it').replace(/\s+/g,' ');}
  function positive(v){
    const n=Number(v);
    return Number.isFinite(n)&&n>0?Math.min(Math.floor(n),100000):0;
  }
  function consolidate(history,contacts){
    const acc=new Map();
    function register(src,delta,kind){
      const address=plain(src.address,110);
      if(!address||!date(src.date))return;
      const city=plain(src.comune||src.city||'Avigliana',60);
      const zone=plain(src.zone,90);
      const ref=plain(src.ref||src.crmId||src.immobile||src.name||'Immobile',110);
      const key=[norm(city),norm(address),norm(ref)].join('|');
      let o=acc.get(key);
      if(!o){o={day:'',city,zone,address,ref,flyers:0,letters:0,news:0,replies:0,meetings:0,sources:new Set()};acc.set(key,o);}
      if(src.date>o.day)o.day=src.date;
      for(const f of ['flyers','letters','news','replies','meetings'])o[f]+=positive(delta[f]);
      if(kind)o.sources.add(kind);
      if(!o.zone&&zone)o.zone=zone;
    }
    for(const x of Array.isArray(history)?history:[]){
      if(!x||!date(x.date)||!String(x.address||'').trim())continue;
      const type=String(x.type||'').trim(), outcome=String(x.outcome||'').trim();
      const delta={flyers:0,letters:0,news:0,replies:0,meetings:0};
      if(outcome==='Completato'&&type==='Volantino consegnato') delta.flyers=positive(x.quantity);
      if(outcome==='Completato'&&type==='Lettera consegnata') delta.letters=positive(x.quantity);
      if(outcome==='Completato'&&/^(Osservazione \/ notizia|Immobile in vendita osservato|Immobile in costruzione osservato)$/.test(type))delta.news=1;
      if(type==='Contatto spontaneo'&&(outcome==='Interessato'||outcome==='Completato'))delta.replies=1;
      if(Object.values(delta).some(Boolean))register(x,delta,'Diario farming');
    }
    for(const x of Array.isArray(contacts)?contacts:[]){
      if(!x||!date(x.date)||!String(x.address||'').trim())continue;
      const action=String(x.action||'').trim(), status=String(x.status||'').trim();
      const delta={flyers:0,letters:0,news:0,replies:0,meetings:0};
      // Azioni concluse, non intenzioni, follow-up o appuntamenti da svolgere.
      if(action==='Lettera consegnata')delta.letters=1;
      if(action==='Biglietto consegnato')delta.flyers=1;
      if(action==='Risposta spontanea')delta.replies=1;
      if(action==='Incontro')delta.meetings=1;
      if(status==='Qualificato')delta.news=1;
      if(Object.values(delta).some(Boolean))
        register({...x,comune:'Avigliana',ref:x.name||'Immobile'},delta,'Scheda notizie');
    }
    const rows=[...acc.values()].map(o=>{
      const names=[];
      if(o.flyers)names.push('Volantini '+o.flyers);
      if(o.letters)names.push('Lettere '+o.letters);
      if(o.news)names.push('Notizie verificate '+o.news);
      if(o.replies)names.push('Risposte '+o.replies);
      if(o.meetings)names.push('Incontri '+o.meetings);
      return [o.day,o.city,o.zone,o.address,o.ref,
        o.flyers,o.letters,o.news,o.replies,o.meetings,
        names.join(' · '),[...o.sources].sort().join(' + ')];
    });
    rows.sort((a,b)=>a[1].localeCompare(b[1],'it')||a[3].localeCompare(b[3],'it')||a[4].localeCompare(b[4],'it'));
    return rows;
  }
  function escapeCell(v){
    let s=typeof v==='number'?String(v):plain(v,500);
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function csv(rows){
    return '\ufeff'+[HEADERS,...rows].map(r=>r.map(escapeCell).join(';')).join('\r\n')+'\r\n';
  }
  return {headers:HEADERS,consolidate,csv};
});
