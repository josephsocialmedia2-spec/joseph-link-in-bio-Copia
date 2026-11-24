'use strict';
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('gestione/acquisizione-farming/piano-strade-omi.js');
const page=read('gestione/acquisizione-farming/index.html');
const dataset=JSON.parse(read('gestione/acquisizione-farming/omi-avigliana-2026-1.json'));
test('presidio quotidiano: tutte le 6 vie contenute nelle tre descrizioni OMI originali',()=>{
 const roadnames={
  C1:['Via Suppo','Via Reano',"Via Sant'Agostino"],
  C2:['Corso Europa'],
  D1:['Via Drubiaglio','Via Villardora']
 };
 for(const [code,streets] of Object.entries(roadnames)){
  const zone=dataset.zones.find(z=>z.code===code);assert.ok(zone);
  for(const street of streets){
   assert.ok(js.includes(street),street);
   const check=street==='Via Sant\'Agostino'?'S.AGOSTINO':street==='Corso Europa'?'C.SO EUROPA':street.toUpperCase();
   assert.ok(zone.description.includes(check),code+' '+check);
  }
 }
 for(const marker of ['S.S. 25','FERROVIA TORINO MODANE','S.S. 24'])assert.ok(Object.values(roadnames).flat().every(x=>x!==marker));
});
test('script valid, loaded after original Farming, keeps same dataset and other panes',()=>{
 new vm.Script(js,{filename:'piano-strade-omi.js'});
 assert.match(page,/id="zones"/);
 assert.match(read('gestione/acquisizione-farming/omi-avigliana.js'),/piano-strade-omi\.js\?v=20261124-strade2/);
 assert.match(page,/src="\.\/omi-avigliana\.js/);
 assert.match(page,/case247-lab-avigliana-v1/);
 assert.match(js,/case247-farming-strade-omi-2026-1-v1/);
});
test('registrazione manuale e GDPR: nessun conteggio senza prova, nessun invio',()=>{
 assert.match(js,/delivered>prepared/);
 assert.match(js,/delivered>0&&\(!verified\|\|!noAdv\|\|!civici\)/);
 assert.match(js,/No pubblicità/);
 assert.match(js,/no nominativi/i);
 assert.match(js,/window\.alert/);
 assert.match(js,/text\/csv/);
 assert.match(js,/timeZone:'Europe\/Rome'/);
});

test('daily working schedule C1 / C2 / D1 and real operational buttons are available',()=>{
 for(const [day,zone] of [["1","C1"],["2","C2"],["4","D1"]])
   assert.match(js,new RegExp(day+":'"+zone+"'"));
 for(const x of ['Via Suppo Giovanni','Via dei Suppo','Via Villar Dora','Prepara lettera della zona','Apri dati OMI','Diario operativo','weeklyReview','omi-work-week','noAdvertisingChecked','case247-farming-strade-omi-2026-1-v1'])
   assert.ok(js.includes(x),'Missing '+x);
 assert.match(js,/verified&&\(!noAdv\|\|!civici\)/);
 assert.match(page,/OMI C1 · Nord del Lago Grande/);
 assert.match(page,/OMI C2 · S\.S\. 25 \/ Stazione/);
 assert.match(page,/OMI D1 · Nord della Dora/);
 assert.doesNotMatch(page,/Lunedì','A · Borgo Vecchio/);
});
