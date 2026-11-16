'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','catalogo-premium');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),js=read('catalogo.js'),css=read('style.css'),feed=JSON.parse(read('immobili-verificati.json'));
test('reader and share script parses',()=>assert.doesNotThrow(()=>new vm.Script(js)));
test('mobile-first reader has all five page surfaces and accessible navigation',()=>{
 for(let i=0;i<5;i++)assert.match(html,new RegExp('data-page="'+i+'"'));
 for(const id of ['prevPage','nextPage','pageCounter','pageDots','propertyResults','cityFilter','queryFilter'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/touchstart/);assert.match(js,/touchend/);assert.match(js,/ArrowRight/);assert.match(css,/@media\(max-width:800px\)/);
});
test('sharing supports WhatsApp, email, SMS, copy and printable PDF',()=>{
 for(const value of ['whatsapp','email','sms','copy','print'])assert.match(html,new RegExp('data-share="'+value+'"'));
 assert.match(js,/https:\/\/wa\.me\/\?text=/);assert.match(js,/mailto:\?subject=/);assert.match(js,/sms:\?body=/);assert.match(js,/navigator\.clipboard/);assert.match(js,/print\(\)/);
 assert.match(css,/@media print/);
});
test('verified listing publication is fail-closed and no invented APE',()=>{
 assert.equal(feed.items.length,0);
 for(const gate of ['availabilityConfirmed','locationVerified','imageVerified','priceVerified','apeVerified','exemptionVerified','epglNren','envelopeIndex'])assert.ok(js.includes(gate));
 assert.match(js,/hostOK\(p\.url\)/);assert.match(js,/p\.status!=='ACTIVE'/);assert.match(js,/return false;/);
 assert.doesNotMatch(js,/eval\(/);
});
test('official La Sacra identity and service links',()=>{
 assert.match(html,/IMMOBILIARE LA SACRA/);assert.match(html,/346 256 8685/);assert.match(html,/immobiliarelasacra@gmail\.com/);
 assert.match(html,/https:\/\/lasacraimmobiliare\.it/);assert.match(html,/VALLE DI SUSA/);
});
