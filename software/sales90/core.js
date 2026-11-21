// Pure functions shared by app and tests. No personal data, no external services.
export const PHASES = Object.freeze([
 {start:1,end:5,name:"Preparazione tecnica e documentale",code:"SETUP",items:[
 ["Verificare dati immobile e fonte","Agente abilitato"],["Autorizzazione alla pubblicazione","Agente abilitato"],["Controllare APE e caratteristiche dichiarate","Agente abilitato"],["Raccogliere foto, video e planimetrie autorizzate","Joseph"],["Verificare informativa privacy e moduli","Privacy"],["Creare landing e controllare CTA","Joseph"],["Verificare tracciamenti con consenso","Joseph"]]},
 {start:6,end:12,name:"Lancio e distribuzione",code:"LANCIO",items:[
 ["Collaudare landing su desktop e mobile","Joseph"],["Preparare creatività Meta e Google Ads","Joseph"],["Approvare budget e testi inserzioni","Responsabile"],["Verificare stato pubblicazione portali","Agente abilitato"],["Generare QR e materiale cartaceo","Joseph"],["Controllare le prime metriche","Joseph"]]},
 {start:13,end:20,name:"Lead e presa in carico",code:"LEAD",items:[
 ["Controllare contatti ricevuti e duplicati","Joseph"],["Verificare presa in carico lead entro SLA","Agente abilitato"],["Monitorare webhook e consensi","Joseph"],["Analizzare CPL e qualità delle richieste","Joseph"]]},
 {start:21,end:30,name:"Open House e conversione",code:"EVENTO",items:[
 ["Definire data e capacità Open House","Agente abilitato"],["Organizzare team e materiale Open House","Joseph"],["Controllare inviti e promemoria autorizzati","Joseph"],["Verificare presenze ed esiti visita","Agente abilitato"],["Controllare follow-up entro 24-48 ore","Agente abilitato"]]},
 {start:31,end:45,name:"Ottimizzazione",code:"OPT",items:[
 ["Analizzare fonti, CTR e conversioni","Joseph"],["Aggiornare varianti creative con approvazione","Joseph"],["Rivedere obiezioni aggregate","Agente abilitato"],["Presentare report settimanale","Joseph"]]},
 {start:46,end:60,name:"Rilancio",code:"RILANCIO",items:[
 ["Rivedere piano contenuti e canali","Joseph"],["Aggiornare la landing con dati verificati","Joseph"],["Verificare efficacia delle campagne","Joseph"],["Sottoporre nuova strategia ad approvazione","Responsabile"]]},
 {start:61,end:75,name:"Riesame",code:"RIESAME",items:[
 ["Confrontare annunci concorrenti verificabili","Joseph"],["Esaminare risultati con l'agente incaricato","Agente abilitato"],["Verificare opportunità di nuovi eventi","Responsabile"]]},
 {start:76,end:90,name:"Audit e prosecuzione",code:"AUDIT",items:[
 ["Produrre audit finale investimenti e KPI","Joseph"],["Verificare stato pratica con agente","Agente abilitato"],["Definire prosecuzione se non venduto","Responsabile"],["Archiviare report e attività completate","Joseph"]]}
]);
export const RECURRING = Object.freeze([
 {code:"market",label:"Controllo annunci e microzona",days:[1,2,3,4,5,6],time:"04:00",audience:"interno"},
 {code:"weekly",label:"Report marketing del lunedì",days:[1],time:"08:00",audience:"interno"},
 {code:"morning",label:"Agenda operativa giornaliera",days:[1,2,3,4,5,6],time:"08:30",audience:"interno"},
 {code:"midday",label:"Controllo attività mattina",days:[1,2,3,4,5,6],time:"12:45",audience:"interno"},
 {code:"evening",label:"Riepilogo di fine giornata",days:[1,2,3,4,5,6],time:"17:45",audience:"interno"},
 {code:"friday",label:"Verifica eventi del fine settimana",days:[5],time:"16:00",audience:"interno"}
]);
export function isoDay(date){const d=new Date(date);if(Number.isNaN(d.valueOf()))throw Error("Data non valida");return d.toISOString().slice(0,10);}
export function addDays(ymd,n){
 const [y,m,d]=ymd.split("-").map(Number);
 const t=new Date(Date.UTC(y,m-1,d+Number(n),12));return t.toISOString().slice(0,10);
}
export function todayRome(date=new Date()){
 const f=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome",year:"numeric",month:"2-digit",day:"2-digit"});
 return f.format(date);
}
export function dayBetween(a,b){return Math.round((Date.parse(b+"T12:00:00Z")-Date.parse(a+"T12:00:00Z"))/86400000);}
export function plan(start,propertyId){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start))throw Error("Data richiesta");
 const tasks=[];let n=0;
 for(const phase of PHASES){
   phase.items.forEach(([title,owner],i)=>{
     const offset=Math.round((phase.end-phase.start)*(phase.items.length===1?0:i/Math.max(1,phase.items.length-1)));
     tasks.push({id:propertyId+"-t"+String(++n).padStart(3,"0"),property_id:propertyId,
       title,assigned_role:owner,phase:phase.code,day_number:phase.start+offset,
       due_on:addDays(start,phase.start+offset-1),status:"TODO",priority:(phase.start<=20?"ALTA":"NORMALE")});
   });
 }
 return tasks;
}
export function currentDay(start,now){return Math.max(1,1+dayBetween(start,now));}
export function summarize(tasks,now){
 const active=tasks.filter(t=>t.status!=="DONE"&&t.status!=="CANCELLED");
 return {all:tasks.length,done:tasks.filter(t=>t.status==="DONE").length,
  overdue:active.filter(t=>t.due_on<now).length,due:active.filter(t=>t.due_on<=now).length};
}
export function validProperty(x){
 const name=String(x.title||"").trim(),commune=String(x.commune||"").trim();
 if(name.length<4||name.length>160)throw Error("Descrizione immobile: 4-160 caratteri");
 if(commune.length<2||commune.length>80)throw Error("Comune non valido");
 const price=Number(x.asking_price);
 if(!Number.isFinite(price)||price<=0||price>100000000)throw Error("Prezzo non valido");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(x.start_date))throw Error("Data inizio non valida");
 return {title:name,commune,asking_price:price,start_date:x.start_date};
}
export function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
export function csv(tasks){return ["Fase;Attività;Responsabile;Scadenza;Stato",...tasks.map(t=>[t.phase,t.title,t.assigned_role,t.due_on,t.status].map(x=>'"'+String(x).replaceAll('"','""')+'"').join(";"))].join("\r\n");}
