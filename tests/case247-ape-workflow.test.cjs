'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('gestione/volantini-premium/core.js');
const app=read('gestione/volantini-premium/app.js');
const html=read('gestione/volantini-premium/index.html');
const context={window:undefined,module:{exports:{}},URL,Intl};
vm.runInNewContext(js,context);
const Core=context.module.exports;
const base={title:'Casa',city:'Avigliana',price:135000,contract:'Vendita',url:'https://lasacraimmobiliare.it/products/casa',img:'https://example.org/image.jpg',checked:true};
const check=entry=>Core.checkEntry(Core.makeEntry({...base,...entry}),0).join(' | ');
test('APE in progress is saved as status and never passes publication validation',()=>{
 const entry=Core.makeEntry({...base,apeStatus:'IN_CORSO'});
 assert.equal(entry.apeStatus,'IN_CORSO');
 assert.match(Core.apeLabel(entry),/APE in corso/);
 assert.match(check({apeStatus:'IN_CORSO'}),/solo BOZZA privata/);
});
test('Missing and unknown APE are distinct, do not invent an energy class',()=>{
 assert.match(check({apeStatus:'MANCANTE'}),/APE mancante/);
 const old=Core.makeEntry({...base,energy:'A4'});
 assert.equal(old.apeStatus,'DA_VERIFICARE');
 assert.match(Core.checkEntry(old,0).join(' | '),/stato APE non verificato/);
});
test('APE present requires energy class and both published indices',()=>{
 assert.match(check({apeStatus:'PRESENTE',energy:'G',ep:'320'}),/indice prestazione energetica involucro/);
 assert.match(check({apeStatus:'PRESENTE',energy:'G',envelope:'140'}),/EPgl,nren/);
 assert.equal(check({apeStatus:'PRESENTE',energy:'G',ep:'320',envelope:'140'}),'');
});
test('Only verified and documented exemption can bypass energy indices',()=>{
 assert.match(check({apeStatus:'ESENTE'}),/motivazione esenzione/);
 assert.match(check({apeStatus:'ESENTE',apeExemptionReason:'Documentazione tecnica'}),/non validata/);
 assert.equal(check({apeStatus:'ESENTE',apeExemptionReason:'Documentazione tecnica',apeExemptionVerified:true}),'');
});
test('Editor shows all statuses and stores references separately',()=>{
 for(const id of ['fieldApeStatus','fieldApeExemptionReason','fieldApeExemptionVerified','fieldEnergy','fieldEp','fieldEnvelope']) assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/apeStatus:\$('fieldApeStatus'\)\.value/);
 assert.match(app,/Core\.apeLabel\(p\)/);
 assert.match(app,/if\(proof&&definitive===true\)throw Error/);
 assert.match(app,/Drive\.uploadPrivateDraft/);
 assert.doesNotThrow(()=>new vm.Script(app));
});
