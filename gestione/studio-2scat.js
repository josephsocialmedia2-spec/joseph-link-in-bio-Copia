/* CASE247 · STUDIO — 2S CAT. Pure schedule helpers + client-side PDF/OCR.
   Uploaded PDFs and images are never sent to the public repository or to a server. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.CASE247Studio=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const DAYS=['LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI','SABATO'];
const LABELS=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const SUBJECTS=['Topografia','Progettazione','Inglese','Matematica','Estimo','Storia','Cantieri','Lettere'];
function isoDate(d){return d.toISOString().slice(0,10)}
function fromISO(v){return new Date(v+'T12:00:00Z')}
function plusDays(iso,n){const d=fromISO(iso);d.setUTCDate(d.getUTCDate()+n);return isoDate(d)}
function monday(iso){const d=fromISO(iso),n=d.getUTCDay();return plusDays(iso,-((n+6)%7))}
function nextMonday(iso){return plusDays(monday(iso),7)}
function mondayAfterSunday(iso){return plusDays(iso,1)}
function minutes(s){const m=/^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(s||''));return m?Number(m[1])*60+Number(m[2]):NaN}
function overlaps(a,b){return a.date===b.date&&minutes(a.start)<minutes(b.end)&&minutes(b.start)<minutes(a.end)}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim()}
function dateForDay(week,day){return plusDays(monday(week),day)}
function goodDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(fromISO(v).getTime())&&isoDate(fromISO(v))===v}
function makeLesson(data,week){
 const date=String(data.date||''),start=String(data.start||''),end=String(data.end||''),subject=String(data.subject||'').trim().slice(0,85);
 if(!goodDate(date)||monday(date)!==monday(week)||!Number.isFinite(minutes(start))||!Number.isFinite(minutes(end))||minutes(start)>=minutes(end)||!subject)return null;
 return {date,start,end,subject,notes:String(data.notes||'').slice(0,260),confidence:data.confidence==='confermato'?'confermato':'da verificare'};
}
function reference(week){
 if(monday(week)!=='2026-11-16')return [];
 const src=[
  ['2026-11-16','17:00','19:30','Topografia'],['2026-11-16','19:40','21:25','Progettazione'],
  ['2026-11-17','17:00','17:50','Inglese'],['2026-11-17','17:50','19:30','Matematica'],['2026-11-17','19:40','21:25','Estimo'],
  ['2026-11-18','17:00','17:50','Storia'],['2026-11-18','17:50','19:30','Topografia'],['2026-11-18','19:40','21:25','Cantieri'],
  ['2026-11-19','17:00','18:40','Lettere'],['2026-11-19','18:40','21:25','Progettazione'],
  ['2026-11-20','17:00','17:50','Matematica'],['2026-11-20','17:50','19:30','Inglese'],['2026-11-20','19:40','21:25','Estimo']
 ];
 return src.map(([date,start,end,subject])=>({date,start,end,subject,notes:'Riferimento fornito dall’utente · verificare con PDF',confidence:'da verificare'}));
}
function parseScheduleText(input,week){
 const lines=String(input||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
 const heads=lines.map(x=>normalize(x));
 const first=heads.findIndex((x,i)=>/\bORARIO\s*2\s*S\s*CAT\b/.test(x)||(x==='ORARIO'&&/^2\s*S\s*CAT\b/.test(heads[i+1]||'')));
 if(first<0)return {rows:[],warnings:['Sezione ORARIO 2S CAT non trovata: non importare le altre classi.'],found:false};
 let end=lines.length;
 for(let i=first+1;i<lines.length;i++){
  if(/\bORARIO\s*(?:1|2|3|4|5)\s*S\s*(?:AFM|CAT)\b/.test(heads[i])){end=i;break}
 }
 let day=-1,rows=[],warnings=[],countTime=0,dayMismatch=false;
 const dayRE=/^(?:[•*–-]\s*)?(LUNED[IÌ]|MARTED[IÌ]|MERCOLED[IÌ]|GIOVED[IÌ]|VENERD[IÌ]|SABATO)\b/i;
 const clock=/\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*[-–—]\s*([01]?\d|2[0-3])[:.]([0-5]\d)\b/;
 const cleanSubject=s=>s.replace(/^[\s:;–—-]+/,'').replace(/[\s:;–—-]+$/,'').trim();
 for(let i=first+1;i<end;i++){
  const raw=lines[i]; const n=normalize(raw);
  const dayMatch=n.match(/^(?:[•*\-]\s*)?(LUNEDI|MARTEDI|MERCOLEDI|GIOVEDI|VENERDI|SABATO)\b/);
  if(dayMatch){day=DAYS.indexOf(dayMatch[1]);const m=n.match(/\b(?:LUNEDI|MARTEDI|MERCOLEDI|GIOVEDI|VENERDI|SABATO)\s+(\d{1,2})\b/);dayMismatch=!!(m&&Number(m[1])!==Number(dateForDay(week,day).slice(-2)));if(dayMismatch)warnings.push('Data nel PDF non coerente con la settimana selezionata: '+raw.slice(0,95));}
  const match=raw.match(clock);
  if(!match)continue;countTime++;
  if(day<0){warnings.push('Orario senza giorno riconoscibile: '+raw.slice(0,85));continue}
  const time=x=>x.padStart(2,'0');
  const start=time(match[1])+':'+match[2],stop=time(match[3])+':'+match[4];
  const after=cleanSubject(raw.slice(match.index+match[0].length));
  let subj=after;
  if(!subj&&i+1<end&&!lines[i+1].match(clock))subj=cleanSubject(lines[i+1]);
  if(!subj){warnings.push('Materia mancante per '+LABELS[day]+' '+start);continue}
  const subject=SUBJECTS.find(s=>normalize(subj).startsWith(normalize(s)))||subj.slice(0,80);
  const numbered=raw.match(/\b(0?[1-9]|[12]\d|3[01])\s+(?:NOVEMBRE|DICEMBRE|GENNAIO|FEBBRAIO|MARZO|APRILE|MAGGIO|GIUGNO|LUGLIO|AGOSTO|SETTEMBRE|OTTOBRE)\b/i);
  const exact=SUBJECTS.some(s=>normalize(subj)===normalize(s));
  const lesson=makeLesson({date:dateForDay(week,day),start,end:stop,subject,notes:'Da '+(numbered?'riga datata':'estrazione PDF')+(after&&normalize(subject)!==normalize(after)?' · '+after.slice(0,65):''),confidence:exact&&!dayMismatch?'confermato':'da verificare'},week);
  if(lesson)rows.push(lesson);else warnings.push('Intervallo non valido: '+raw.slice(0,100));
 }
 if(!rows.length)warnings.push(countTime?'Orari individuati ma nessuna riga validabile: correggere l’anteprima.':'Tabella 2S CAT non leggibile automaticamente: inserire o correggere le righe.');
 const seen=new Set();rows=rows.filter(r=>{const key=[r.date,r.start,r.end,r.subject].join('|');if(seen.has(key))return false;seen.add(key);return true;});
 rows.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
 return {rows,warnings,found:true};
}
function lessonKey(r){return [r.date,r.start,r.end,normalize(r.subject)].join('|')}
function compareLessons(oldRows,newRows){
 const old=new Map(oldRows.map(x=>[lessonKey(x),x])),fresh=new Map(newRows.map(x=>[lessonKey(x),x]));
 const added=[...fresh.values()].filter(x=>!old.has(lessonKey(x)));
 const removed=[...old.values()].filter(x=>!fresh.has(lessonKey(x)));
 return {added,removed,unchanged:newRows.length-added.length};
}
function conflicts(lessons,tasks,additional){
 const all=[...lessons.map(x=>({type:'LEZIONE',date:x.date,start:x.start,end:x.end,title:x.subject})),
 ...(tasks||[]).filter(x=>x&&x.date&&x.time&&Number(x.duration)>0).map(x=>({type:x.project==='STUDIO'?'STUDIO':'LAVORO',date:x.date,start:x.time,end:clockAfter(x.time,Number(x.duration)),title:x.title||x.project||'Attività'})),
 ...(additional||[])];
 const collisions=[];
 for(let i=0;i<all.length;i++){
  for(let j=i+1;j<all.length;j++){
   if(overlaps(all[i],all[j]))collisions.push([all[i],all[j]]);
  }
 }
 return collisions;
}
function clockAfter(start,duration){const n=minutes(start)+duration;return String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function occupiedForDay(date,lessonRows,tasks){
 const out=[];
 if(fromISO(date).getUTCDay()>0&&fromISO(date).getUTCDay()<6)out.push({date,start:'09:30',end:'12:30',title:'Acquisizione'});
 lessonRows.filter(r=>r.date===date).forEach(r=>out.push(r));
 (tasks||[]).filter(t=>t.date===date).forEach(t=>out.push({date,start:t.time,end:clockAfter(t.time,Number(t.duration)),title:t.title}));
 return out;
}
function suggestStudySlots(date,weekLessons,tasks,limit=3){
 const result=[];
 for(let offset=1;offset<=7;offset++){
  const day=plusDays(date,-offset),num=fromISO(day).getUTCDay();
  if(num===0||day<localParts('Europe/Rome').date)continue;
  for(const hour of ['14:00','15:30','16:00','19:30']){
   const span={date:day,start:hour,end:clockAfter(hour,45)};
   if(span.end<'22:00'&&occupiedForDay(day,weekLessons,tasks).every(other=>!overlaps(span,other))){
    result.push(span);if(result.length>=limit)return result;
   }
  }
 }
 return result;
}
function localParts(timeZone='Europe/Rome',date=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const p={};parts.forEach(x=>p[x.type]=x.value);return {date:p.year+'-'+p.month+'-'+p.day,weekday:p.weekday,time:p.hour+':'+p.minute};
}
const CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/';
const OCRURL='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
async function loadOCR(){
 if(window.Tesseract)return window.Tesseract;
 await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=OCRURL;s.onload=resolve;s.onerror=()=>reject(Error('Motore OCR non disponibile: controlla la connessione'));document.head.append(s)});
 return window.Tesseract;
}
async function ocrCanvas(input){
 const t=await loadOCR();
 const worker=await t.createWorker('ita+eng');
 try{return (await worker.recognize(input)).data.text||''}finally{await worker.terminate()}
}
function textLines(content){
 const bins=new Map();
 content.items.forEach(it=>{
  if(!it.str||!it.str.trim()||!Array.isArray(it.transform))return;
  const y=Math.round(it.transform[5]/3)*3;
  if(!bins.has(y))bins.set(y,[]);
  bins.get(y).push({x:it.transform[4],str:it.str});
 });
 return [...bins.entries()].sort((a,b)=>b[0]-a[0]).map(([,items])=>items.sort((a,b)=>a.x-b.x).map(x=>x.str).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
}
async function readFile(file,onStatus,forceOCR=false){
 if(!file||file.size>15*1024*1024)throw Error('File mancante o oltre 15 MB');
 const status=typeof onStatus==='function'?onStatus:()=>{};
 const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name||'');
 const isImage=/^image\/(?:png|jpeg)$/.test(file.type)||/\.(?:png|jpe?g)$/i.test(file.name||'');
 if(!isPdf&&!isImage)throw Error('Formato non supportato: scegli PDF, PNG o JPG');
 if(isImage){status('Riconoscimento immagine in locale…');return {text:await ocrCanvas(file),method:'OCR immagine'}}
 status('Lettura PDF nel browser…');
 const pdfjs=await import(CDN+'pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=CDN+'pdf.worker.min.mjs';
 const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 const limit=Math.min(doc.numPages,12);
 const pages=[];
 for(let i=1;i<=limit;i++){status('Lettura PDF: pagina '+i+' di '+limit);const page=await doc.getPage(i),text=await page.getTextContent();pages.push(textLines(text));}
 let all=pages.join('\n');
 if(forceOCR||!/\bORARIO\s*2\s*S\s*CAT\b/i.test(normalize(all))){
  status('Tabella non selezionabile: avvio OCR locale sulle prime pagine…');
  const t=await loadOCR();
  const worker=await t.createWorker('ita+eng');
  try{
   let recognized=[];
   for(let i=1;i<=Math.min(doc.numPages,6);i++){
    status('OCR PDF: pagina '+i);
    const page=await doc.getPage(i),v=page.getViewport({scale:1.8}),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
    canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);
    await page.render({canvasContext:ctx,viewport:v}).promise;
    recognized.push((await worker.recognize(canvas)).data.text||'');
   }
   all=recognized.join('\n');return {text:all,method:'OCR PDF scansionato'};
  }finally{await worker.terminate()}
 }
 return {text:all,method:'Testo selezionabile PDF'};
}
return {DAYS,LABELS,SUBJECTS,isoDate,fromISO,plusDays,monday,nextMonday,mondayAfterSunday,minutes,overlaps,normalize,makeLesson,reference,parseScheduleText,compareLessons,lessonKey,conflicts,suggestStudySlots,localParts,readFile};
});