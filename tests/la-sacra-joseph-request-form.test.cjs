'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..','catalogo-premium');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const html=read('index.html'),js=read('catalogo.js'),css=read('style.css'),privacy=read('privacy.html');
test('Official logo and Joseph identity are displayed without changing main business',()=>{
  assert.match(html,/Logo ufficiale Immobiliare La Sacra/);
  assert.match(html,/Malafronte Joseph/);
  assert.match(html,/Funzionario immobiliare/);
  assert.match(html,/371 370 8294/);
  assert.match(html,/href="tel:\+393713708294"/);
  assert.match(html,/https:\/\/wa.me\/393713708294/);
  assert.match(html,/href="\.\/La_Sacra_Catalogo_Tutti_Immobili\.pdf"/);
});
test('Download, call, WhatsApp and request form are accessible on mobile',()=>{
  assert.match(html,/id="richiedi-materiale"/);
  assert.match(html,/id="materialRequest"/);
  assert.match(html,/id="requestStatus" role="status"/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/\.hub-btn\.call/);
  assert.match(html,/privacy\.html/);
});
test('Request acknowledgment is mandatory but future marketing is independent and unchecked',()=>{
  assert.match(html,/<input type="checkbox" name="notice" required>/);
  assert.match(html,/<input type="checkbox" name="marketing">/);
  assert.doesNotMatch(html,/name="marketing"[^>]*checked/);
  assert.match(html,/non attiva l’iscrizione/);
  assert.match(js,/requestForm\.checkValidity\(\)/);
  assert.match(js,/requestForm\.reportValidity\(\)/);
  assert.match(js,/mailto:immobiliarelasacra@gmail.com/);
  assert.match(js,/NON iscrizione e NON consenso operativo verificato/);
  assert.doesNotMatch(js,/fetch\([^)]*materialRequest/);
  assert.doesNotThrow(()=>new vm.Script(js));
});
test('Privacy notice states real request mechanics and marketing restrictions',()=>{
  assert.match(privacy,/non invia dati a un server/);
  assert.match(privacy,/non determina l.iscrizione a una mailing list/);
  assert.match(privacy,/Regolamento UE 2016\/679/);
  assert.match(privacy,/Garante per la protezione dei dati personali/);
});
