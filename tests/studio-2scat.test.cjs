const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../gestione/studio-2scat.js');
const text=p=>fs.readFileSync(p,'utf8');
const js=text('gestione/control-center.js'),ui=text('gestione/studio-2scat-ui.js'),html=text('gestione/index.html'),css=text('gestione/control-center.css');
test('reference week 16–20 November includes all 13 accurate 2S CAT lessons, no automatic carry forward',()=>{
 const rows=S.reference('2026-11-16');
 assert.equal(rows.length,13);
 assert.deepEqual(rows.filter(r=>r.date==='2026-11-16').map(r=>[r.start,r.end,r.subject]),[['17:00','19:30','Topografia'],['19:40','21:25','Progettazione']]);
 assert.deepEqual(rows.filter(r=>r.date==='2026-11-17').map(r=>r.subject),['Inglese','Matematica','Estimo']);
 assert.deepEqual(rows.filter(r=>r.date==='2026-11-18').map(r=>r.subject),['Storia','Topografia','Cantieri']);
 assert.deepEqual(rows.filter(r=>r.date==='2026-11-19').map(r=>r.subject),['Lettere','Progettazione']);
 assert.deepEqual(rows.filter(r=>r.date==='2026-11-20').map(r=>r.subject),['Matematica','Inglese','Estimo']);
 assert.deepEqual(S.reference('2026-11-23'),[]);
 assert.ok(rows.every(r=>r.confidence==='da verificare'));
});
test('parse just ORARIO 2S CAT and isolate other class tables',()=>{
 const input=[
  'ORARIO 1S CAT','LUNEDÌ 16 NOVEMBRE','17:00–19:30 Scienze',
  'ORARIO 2S CAT','LUNEDÌ 16 NOVEMBRE','17:00–19:30 Topografia','19:40–21:25 Progettazione',
  'MARTEDÌ 17 NOVEMBRE','17:00–17:50 Inglese','17:50–19:30 Matematica','19:40–21:25 Estimo',
  'ORARIO 2S AFM','LUNEDÌ 16 NOVEMBRE','17:00–19:30 Economia'
 ].join('\n');
 const parsed=S.parseScheduleText(input,'2026-11-16');
 assert.equal(parsed.found,true);
 assert.equal(parsed.rows.length,5);
 assert.ok(parsed.rows.every(r=>r.subject!=='Scienze'&&r.subject!=='Economia'));
 assert.equal(parsed.rows[0].date,'2026-11-16');
 assert.equal(parsed.rows[0].start,'17:00');
 assert.equal(parsed.rows[0].end,'19:30');
});
test('missing 2S CAT header must never import another class',()=>{
 const parsed=S.parseScheduleText('ORARIO 1S AFM\nLUNEDÌ\n17:00–19:30 Matematica','2026-11-16');
 assert.equal(parsed.rows.length,0);assert.equal(parsed.found,false);
});
test('weekly replacement diff deduplicates identical lessons and flags changes',()=>{
 const rows=S.reference('2026-11-16');
 const same=S.compareLessons(rows,rows);
 assert.equal(same.added.length,0);assert.equal(same.removed.length,0);assert.equal(same.unchanged,13);
 const newer=[...rows.slice(1),{date:'2026-11-16',start:'17:00',end:'19:30',subject:'Estimo',confidence:'confermato',notes:''}];
 const diff=S.compareLessons(rows,newer);assert.equal(diff.added.length,1);assert.equal(diff.removed.length,1);
});
test('reject invalid lesson and invalid cross-week edits',()=>{
 assert.equal(S.makeLesson({date:'2026-11-17',start:'20:30',end:'19:30',subject:'Estimo'},'2026-11-16'),null);
 assert.equal(S.makeLesson({date:'2026-11-24',start:'19:40',end:'21:25',subject:'Estimo'},'2026-11-16'),null);
 assert.equal(S.makeLesson({date:'2026-11-17',start:'19:40',end:'21:25',subject:''},'2026-11-16'),null);
});
test('conflicts use real date and time overlap',()=>{
 const lessons=S.reference('2026-11-16');
 const task=[{date:'2026-11-16',time:'18:00',duration:60,project:'Catalogo immobili',title:'Riunione'}];
 assert.equal(S.conflicts(lessons,task).length,1);
 assert.equal(S.conflicts(lessons,[{date:'2026-11-16',time:'14:00',duration:60,title:'Test'}]).length,0);
});
test('Sunday 09:00 Rome resolves to following Monday even around CET',()=>{
 const now=S.localParts('Europe/Rome',new Date('2026-11-15T08:00:00Z'));
 assert.equal(now.date,'2026-11-15');assert.equal(now.time,'09:00');
 assert.equal(S.nextMonday(now.date),'2026-11-16');
 assert.equal(S.nextMonday('2026-11-22'),'2026-11-23');
});
test('school controls coexist with existing calendar, CRM and accessible themes',()=>{
 assert.match(html,/studio-2scat\.js/);assert.match(html,/studio-2scat-ui\.js/);
 assert.match(js,/slot\(\['09:30','12:30'/);
 assert.match(js,/CASE247StudioUI\.mount/);
 assert.match(js,/TASKKEY='case247-cc-tasks-v1'/);
 assert.match(ui,/STUDIO — CLASSE 2S CAT/);
 assert.match(ui,/CARICA ORARIO PDF/);
 assert.match(ui,/SCUOLA VERIFICA/);
 assert.match(ui,/INTERROGAZIONE/);
 assert.match(ui,/STUDIO \/ RIPASSO/);
 assert.match(ui,/CONFERMA E INSERISCI NELL'AGENDA/);
 assert.match(css,/\.cc-slot\.cc-school-lesson/);
 assert.match(css,/\.cc-school-fields/);
 [js,ui,text('gestione/studio-2scat.js')].forEach(x=>assert.doesNotThrow(()=>new vm.Script(x)));
});
test('privacy: no raw uploaded school file, personal info or OneDrive link in new code',()=>{
 for(const x of [ui,text('gestione/studio-2scat.js')]){
  assert.doesNotMatch(x,/56a10d0f448c4577/);
  assert.doesNotMatch(x,/joseph\.malafronte@hotmail\.it/);
  assert.doesNotMatch(x,/send\(file\)|FormData\(file\)/);
 }
});
