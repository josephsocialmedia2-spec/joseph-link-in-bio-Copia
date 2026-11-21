/* Utility pure per CRM Farming + PESA. Nessuna rete e nessuna persistenza. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  if(root) root.CASE247CRMLogic=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const START='2026-11-21';
  const END='2027-11-21';
  function isoDate(day){
    const d=new Date(day+'T12:00:00Z');
    return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }
  function dates(start=START,end=END){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))throw Error('Date non valide');
    const from=new Date(start+'T12:00:00Z'),to=new Date(end+'T12:00:00Z');
    if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||from>to)throw Error('Intervallo non valido');
    const out=[];
    for(let d=new Date(from);d<=to;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));
    return out;
  }
  function classify(raw){
    if(!Number.isFinite(raw)||raw<=0)return '—';
    if(raw<18.5)return 'Sottopeso';
    if(raw<25)return 'Normopeso';
    if(raw<30)return 'Sovrappeso';
    if(raw<35)return 'Obesità I grado';
    if(raw<40)return 'Obesità II grado';
    return 'Obesità III grado';
  }
  function bmi(weight,heightCm){
    const w=Number(weight),h=Number(heightCm);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return null;
    return w/((h/100)**2);
  }
  function isValidResult(x){
    if(!x||!/^\d{4}-\d{2}-\d{2}$/.test(x.date||''))return false;
    if(!String(x.comune||'').trim()||!String(x.address||'').trim()||!String(x.immobile||'').trim())return false;
    if(!['Volantino consegnato','Lettera consegnata','Notizia verificata','Risposta ricevuta','Incontro svolto'].includes(x.type))return false;
    return Number.isInteger(Number(x.quantity))&&Number(x.quantity)>=1&&Number(x.quantity)<=100000;
  }
  function displayDate(s){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
    return s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
  }
  return {START,END,dates,isoDate,bmi,classify,isValidResult,displayDate};
});
