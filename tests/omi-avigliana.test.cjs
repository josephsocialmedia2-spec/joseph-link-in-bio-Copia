/* User-supplied 2026/1 OMI Avigliana CSV+KML reconciliation tests. */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(get('gestione/acquisizione-farming/omi-avigliana-2026-1.json'));
test('Avigliana OMI source metadata, seven areas and 35 rows match one-to-one',()=>{
 assert.equal(data.metadata.municipality,'AVIGLIANA');
 assert.equal(data.metadata.municipalityCode,'A518');
 assert.equal(data.metadata.semester,'2026/1');
 assert.equal(data.metadata.valuesElaborationDate,'20-NOV-26');
 assert.equal(data.zones.length,7);
 assert.equal(data.quotations.length,35);
 const expected=['B1','C1','C2','D1','D3','D4','E1'];
 assert.deepEqual(data.zones.map(z=>z.code).sort(),expected);
 assert.equal(new Set(data.quotations.map(q=>q.zone+'|'+q.type+'|'+q.condition)).size,35);
 for(const q of data.quotations){
  const zone=data.zones.find(z=>z.code===q.zone);
  assert.ok(zone,'Quotation references a known zone');
  assert.equal(q.linkZone,zone.linkZone,'Source LinkZona is consistent');
  assert.ok(q.marketMin>0&&q.marketMax>=q.marketMin);
  assert.ok(q.rentMin>0&&q.rentMax>=q.rentMin);
  assert.equal(q.marketSurface,'L');
  assert.equal(q.rentSurface,'L');
 }
});
test('KML geometry has seven mapped polygons with valid WGS84 positions',()=>{
 assert.equal(data.zones.length,7);
 for(const z of data.zones){
  assert.ok(z.coordinates.length>100,'polygon contains original boundary points: '+z.code);
  for(const [lon,lat] of z.coordinates){
   assert.ok(lon>7.3&&lon<7.5,'longitude Avigliana');
   assert.ok(lat>45&&lat<45.2,'latitude Avigliana');
  }
  assert.deepEqual(z.coordinates[0],z.coordinates.at(-1),'closed KML polygon '+z.code);
  assert.ok(z.description.length>20);
 }
});
test('same zone/type has distinct NORMALE and OTTIMO price ranges',()=>{
 const q=(zone,type,state)=>data.quotations.find(x=>x.zone===zone&&x.type===type&&x.condition===state);
 assert.deepEqual([q('C2','Abitazioni civili','NORMALE').marketMin,q('C2','Abitazioni civili','NORMALE').marketMax],[900,1350]);
 assert.deepEqual([q('C2','Abitazioni civili','OTTIMO').marketMin,q('C2','Abitazioni civili','OTTIMO').marketMax],[1450,2150]);
 assert.deepEqual([q('D1','Abitazioni civili','OTTIMO').marketMin,q('D1','Abitazioni civili','OTTIMO').marketMax],[1500,2200]);
 assert.deepEqual([q('D4','Ville e Villini','NORMALE').marketMin,q('D4','Ville e Villini','NORMALE').marketMax],[1150,1700]);
 const c2=q('C2','Abitazioni civili','OTTIMO');
 assert.deepEqual([c2.rentMin,c2.rentMax],[5.9,8.7]);
});
test("web module preserves user-saved manual OMI rows, sources, and prints",()=>{
 const html=get('gestione/acquisizione-farming/index.html');
 const script=get('gestione/acquisizione-farming/omi-avigliana.js');
 new vm.Script(script,{filename:'omi-avigliana.js'});
 assert.match(html,/src="\.\/omi-avigliana\.js\?v=20261120-omi1"/);
 assert.match(script,/fetch\(DATA_PATH/);
 assert.match(script,/cache:'no-store'/);
 assert.match(script,/db\.omi/);
 assert.match(script,/sourceType:'CSV_OMI'/);
 assert.match(script,/sourceType:'USER'/);
 assert.match(script,/document\.getElementById\('dOmi'\)/);
 assert.match(script,/mq\*x\.min/);
 assert.match(script,/mq\*x\.max/);
 assert.match(script,/window\.printDossier=printDossier/);
 assert.match(script,/nessuna geocodifica automatica/i);
 assert.match(html,/case247-lab-avigliana-v1/);
});
