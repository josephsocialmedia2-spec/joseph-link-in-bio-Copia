'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const folder=path.join(__dirname,'../gestione/acquisizione-farming');
const load=name=>fs.readFileSync(path.join(folder,name),'utf8');
const N=require('../gestione/acquisizione-farming/contatti-normalizza.js');
const html=load('index.html');
test('notizie e contatti mantiene layout e 9 sezioni; foglio visibile per primo',()=>{
 assert.equal((html.match(/<section class="panel"/g)||[]).length,9);
 assert.match(html,/<header class="top">/);
 assert.match(html,/#102c48/);
 const start=html.indexOf('<section class="panel" id="contatti">');
 const sheet=html.indexOf('id="contactsWorkbook"',start);
 const form=html.indexOf('id="contactForm"',start);
 assert.ok(start>=0&&sheet>start&&form>sheet);
 for(const id of ['contactsRows','contactsSheetTable','clientDetail','clientDetailForm','photoFiles','photoText','photoDrafts','photoConfirm','contactsExcelExport'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/src="\.\/contatti-normalizza\.js"/);
 assert.match(html,/src="\.\/contatti-foglio\.js"/);
 assert.match(html,/contatti-foglio\.css/);
 assert.match(html,/getContacts:\(\)=>db\.contacts/);
});
test('normalizza due indirizzi da appunti fotografiche senza inventare risultati',()=>{
 const drafts=N.fromText(
  '21/11/2026\nAvigliana\nVia Torino 41 - cliente: Trilocale A\nnota: osservato\nVia Roma 8 - Cliente: Appartamento B\nnota: da verificare',
  '2026-11-21'
 );
 assert.equal(drafts.length,2);
 assert.match(drafts[0].address,/Via Torino 41/);
 assert.match(drafts[1].address,/Via Roma 8/);
 assert.equal(drafts[0].name,'Trilocale A');
 assert.equal(drafts[1].name,'Appartamento B');
 assert.equal(drafts[0].address,'Via Torino 41');
 assert.equal(drafts[1].address,'Via Roma 8');
 assert.equal(drafts[0].date,'2026-11-21');
 assert.equal(drafts[0].status,'Nuovo');
 assert.equal(drafts[0].action,'Nessuna');
});
test('normalizzazione protegge telefoni e formule nel CSV per Excel',()=>{
 const record=N.normalizeContact({
  date:'21/11/2026',comune:'Avigliana',address:'Via Roma 4',
  name:'Cliente 371 370 8294',notes:'Email: contatto@example.com telefono 123 4567',
  status:'Qualificato',action:'Incontro',source:'Foto appunti'
 });
 assert.equal(record.date,'2026-11-21');
 assert.doesNotMatch(JSON.stringify(record),/371 370 8294|123 4567|contatto@example\.com/);
 assert.equal(record.status,'Qualificato');
 assert.equal(record.action,'Incontro');
 const lines=N.csv([record]);
 assert.match(lines,/"Data";"Comune"/);
 assert.match(lines,/"Via Roma 4"/);
 assert.doesNotMatch(lines,/371 370 8294|123 4567|contatto@example\.com/);
 const formula=N.csv([{...record,name:'=HYPERLINK("https://example.com")'}]);
 assert.match(formula,/"'=HYPERLINK/);
});
test('fingerprint blocca duplicati senza eliminare storico preesistente',()=>{
 const a=N.normalizeContact({date:'2026-11-21',address:'VIA ROMA 4',name:'Cliente A',source:'Foto appunti'});
 const b=N.normalizeContact({date:'2026-11-21',address:'Via   Roma 4',name:'Cliente A',source:'Foto appunti'});
 const c=N.normalizeContact({date:'2026-11-22',address:'Via Roma 4',name:'Cliente A',source:'Foto appunti'});
 assert.equal(N.fingerprint(a),N.fingerprint(b));
 assert.notEqual(N.fingerprint(a),N.fingerprint(c));
});
test('foto con indirizzo non leggibile produce bozza non salvabile senza indirizzo',()=>{
 const rows=N.fromText('cliente non leggibile\nosservazioni varie', '2026-11-21');
 assert.equal(rows.length,1);
 assert.equal(rows[0].address,'');
 assert.equal(rows[0].date,'2026-11-21');
});
test('fogli JavaScript validi, nessun telefono come colonna',()=>{
 new vm.Script(load('contatti-foglio.js'),{filename:'contatti-foglio.js'});
 new vm.Script(load('contatti-normalizza.js'),{filename:'contatti-normalizza.js'});
 assert.doesNotMatch(html,/name="phone"|name="telefono"|name="cellulare"/);
 assert.match(load('contatti-foglio.js'),/CASE247ContactSheet/);
 assert.match(load('contatti-foglio.js'),/getHistory/);
});
