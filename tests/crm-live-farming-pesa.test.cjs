'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const get=p=>fs.readFileSync(path.join(base,p),'utf8');
const logic=require('../gestione/acquisizione-farming/crm/logic.js');
const engine=require('../gestione/acquisizione-farming/farming-results.js');
const html=get('gestione/acquisizione-farming/crm/index.html');
const script=get('gestione/acquisizione-farming/crm/app.js');
const landing=get('gestione/acquisizione-farming/index.html');
test('due sole schede CRM e script valido',()=>{
 assert.equal((html.match(/role="tab"/g)||[]).length,2);
 assert.equal((html.match(/role="tabpanel"/g)||[]).length,2);
 assert.match(html,/id="acquisizione"/);
 assert.match(html,/id="pesa"/);
 assert.match(html,/src="\.\/logic\.js"/);
 assert.match(landing,/href="\.\/crm\/"/);
 new vm.Script(script,{filename:'crm-app.js'});
 new vm.Script(get('gestione/acquisizione-farming/crm/logic.js'),{filename:'crm-logic.js'});
});
test('366 date annuali e IMC con categorie adulti',()=>{
 const arr=logic.dates();
 assert.equal(arr.length,366);
 assert.equal(arr[0],'2026-11-21');
 assert.equal(arr[365],'2027-11-21');
 assert.equal(Math.round(logic.bmi(95.7,169)*10)/10,33.5);
 assert.equal(logic.classify(logic.bmi(95.7,169)),'Obesità I grado');
 assert.equal(logic.classify(18.49),'Sottopeso');
 assert.equal(logic.classify(18.5),'Normopeso');
 assert.equal(logic.classify(25),'Sovrappeso');
 assert.equal(logic.classify(30),'Obesità I grado');
 assert.equal(logic.classify(35),'Obesità II grado');
 assert.equal(logic.classify(40),'Obesità III grado');
});
test('soltanto risultati effettivamente conclusi, raggruppati per immobile',()=>{
 for(const type of ['Volantino consegnato','Lettera consegnata','Notizia verificata','Risposta ricevuta','Incontro svolto'])
  assert.ok(logic.isValidResult({date:'2026-11-21',comune:'Avigliana',address:'Via 1',immobile:'A',type,quantity:'1'}));
 assert.equal(logic.isValidResult({date:'2026-11-21',comune:'Avigliana',address:'Via 1',immobile:'A',type:'Volantino preparato',quantity:3}),false);
 const data=engine.consolidate([
  {date:'2026-11-21',comune:'Avigliana',address:'Via 1',immobile:'A',type:'Volantino consegnato',quantity:3,outcome:'Completato'},
  {date:'2026-11-21',comune:'Avigliana',address:'Via 1',immobile:'A',type:'Notizia verificata',quantity:1,outcome:'Completato'},
  {date:'2026-11-21',comune:'Avigliana',address:'Via 1',immobile:'A',type:'Risposta ricevuta',quantity:1,outcome:'Completato'},
  {date:'2026-11-21',comune:'Avigliana',address:'Via 1',immobile:'A',type:'Incontro svolto',quantity:1,outcome:'Completato'},
  {date:'2026-11-21',comune:'Avigliana',address:'Via 1',immobile:'A',type:'Lettera consegnata',quantity:2,outcome:'Da verificare'}
 ],[]);
 assert.equal(data.length,1);
 assert.deepEqual(data[0].slice(5,10),[3,0,1,1,1]);
});
test('PESA cifrata e workbook due fogli, senza dati personali pubblici',()=>{
 assert.match(script,/PBKDF2/);
 assert.match(script,/AES-GCM/);
 assert.match(script,/crypto\.subtle\.encrypt/);
 assert.match(script,/case247-pesa-aes-gcm-v1/);
 assert.match(script,/localStorage\.setItem\(PESA_KEY,sealed\)/);
 assert.match(script,/X\.utils\.book_append_sheet\(wb,wsA,'Acquisizione'\)/);
 assert.match(script,/X\.utils\.book_append_sheet\(wb,wsP,'PESA'\)/);
 assert.match(html,/\.xlsx\W+non contiene macro/);
 assert.doesNotMatch(html,/input[^>]*type="tel"/);
 assert.doesNotMatch(html,/371 370 8294|95,70|169 cm/);
});
