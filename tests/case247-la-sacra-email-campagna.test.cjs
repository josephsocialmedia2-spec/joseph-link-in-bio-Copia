'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../campagne/immobiliare/la-sacra-attivita-vendita-email.html'),'utf8');
test('email brand La Sacra and Joseph contact',()=>{
  for(const text of ['IMMOBILIARE','LA SACRA','Malafronte Joseph','371 370 8294','immobiliarelasacra@gmail.com','Piazza del Comune XXV Aprile, 1'])assert.ok(html.includes(text),text);
  assert.ok(!html.includes('CASE IN PUBBLICITÀ'));
});
test('short official catalogue URL instead of GitHub long link',()=>{
  assert.match(html,/https:\/\/lasacraimmobiliare\.it\/catalogo/);
  assert.ok(!html.includes('josephsocialmedia2-spec.github.io'));
});
test('campaign requires working unsubscribe link and opt-in',()=>{
  assert.ok(html.includes('{{unsubscribe_url}}'));
  assert.ok(html.includes('OBBLIGATORIO PER L\'INVIO'));
  assert.ok(html.includes('base giuridica verificata'));
  assert.ok(html.includes('art. 130'));
});
